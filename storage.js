/**
 * storage.js — Local Storage read/write helpers for the expense tracker.
 *
 * All helpers operate on the global `state` object defined in app.js.
 * Save functions write to localStorage before the caller mutates state;
 * on QuotaExceededError they roll back the in-memory change and show a toast.
 * Load functions return a safe default and show a banner when storage is
 * unavailable or the stored value cannot be parsed.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

/* ─── Notification helpers ─────────────────────────────────────────────── */

/**
 * Show a non-blocking toast notification (auto-dismisses after 4 s).
 * @param {string} message
 */
function showToast(message) {
  const container = _getOrCreateNotificationContainer('toast-container', 'bottom');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger CSS fade-in on next frame
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

/**
 * Show a non-blocking banner notification (persists until dismissed).
 * @param {string} message
 */
function showBanner(message) {
  // Avoid duplicate banners with the same message
  const existing = document.querySelector('.banner');
  if (existing && existing.textContent.includes(message)) return;

  const container = _getOrCreateNotificationContainer('banner-container', 'top');
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');

  const text = document.createElement('span');
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'banner__close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(text);
  banner.appendChild(closeBtn);
  container.appendChild(banner);
}

/**
 * @param {string} id   Element id for the container
 * @param {'top'|'bottom'} position
 * @returns {HTMLElement}
 */
function _getOrCreateNotificationContainer(id, position) {
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.className = 'notification-container notification-container--' + position;
    document.body.appendChild(container);
  }
  return container;
}

/* ─── Storage key constants ─────────────────────────────────────────────── */

var STORAGE_KEYS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  SPENDING_LIMITS: 'spendingLimits',
  THEME: 'theme',
};

/* ─── Generic low-level helpers ─────────────────────────────────────────── */

/**
 * Write a value to localStorage under `key`.
 * Returns true on success, false on QuotaExceededError (caller must roll back).
 * @param {string} key
 * @param {*} value
 * @returns {boolean}
 */
function _storageWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('[storage] write error for key "' + key + '":', err);
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22)
    ) {
      showToast('Could not save — storage full.');
    }
    return false;
  }
}

/**
 * Read and parse a value from localStorage under `key`.
 * Returns `defaultValue` when the key is absent, storage is unavailable,
 * or the stored string cannot be parsed.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function _storageRead(key, defaultValue) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[storage] read error for key "' + key + '":', err);
    showBanner('Storage unavailable — data will not be saved.');
    return defaultValue;
  }
}

/* ─── Transactions ──────────────────────────────────────────────────────── */

/**
 * Persist `state.transactions` to localStorage.
 * On QuotaExceededError, rolls back `state.transactions` to `previousValue`
 * and shows a toast.
 * @param {Array} previousValue  The value of state.transactions before the mutation.
 */
function saveTransactions(previousValue) {
  var ok = _storageWrite(STORAGE_KEYS.TRANSACTIONS, state.transactions);
  if (!ok) {
    state.transactions = previousValue;
  }
}

/**
 * Load transactions from localStorage.
 * Returns an empty array when storage is unavailable or the value is invalid.
 * @returns {Array}
 */
function loadTransactions() {
  var value = _storageRead(STORAGE_KEYS.TRANSACTIONS, []);
  if (!Array.isArray(value)) {
    console.error('[storage] transactions value is not an array; resetting to []');
    return [];
  }
  return value;
}

/* ─── Categories ────────────────────────────────────────────────────────── */

/**
 * Persist `state.categories` to localStorage.
 * On QuotaExceededError, rolls back `state.categories` to `previousValue`.
 * @param {Array} previousValue
 */
function saveCategories(previousValue) {
  var ok = _storageWrite(STORAGE_KEYS.CATEGORIES, state.categories);
  if (!ok) {
    state.categories = previousValue;
  }
}

/**
 * Load categories from localStorage.
 * Returns an empty array on error.
 * @returns {Array}
 */
function loadCategories() {
  var value = _storageRead(STORAGE_KEYS.CATEGORIES, []);
  if (!Array.isArray(value)) {
    console.error('[storage] categories value is not an array; resetting to []');
    return [];
  }
  return value;
}

/* ─── Spending limits ───────────────────────────────────────────────────── */

/**
 * Persist `state.spendingLimits` to localStorage.
 * On QuotaExceededError, rolls back `state.spendingLimits` to `previousValue`.
 * @param {Object} previousValue
 */
function saveSpendingLimits(previousValue) {
  var ok = _storageWrite(STORAGE_KEYS.SPENDING_LIMITS, state.spendingLimits);
  if (!ok) {
    state.spendingLimits = previousValue;
  }
}

/**
 * Load spending limits from localStorage.
 * Returns an empty object on error.
 * @returns {Object}
 */
function loadSpendingLimits() {
  var value = _storageRead(STORAGE_KEYS.SPENDING_LIMITS, {});
  if (typeof value !== 'object' || Array.isArray(value) || value === null) {
    console.error('[storage] spendingLimits value is not a plain object; resetting to {}');
    return {};
  }
  return value;
}

/* ─── Theme ─────────────────────────────────────────────────────────────── */

/**
 * Persist `state.theme` to localStorage.
 * On QuotaExceededError, rolls back `state.theme` to `previousValue`.
 * @param {string} previousValue
 */
function saveTheme(previousValue) {
  var ok = _storageWrite(STORAGE_KEYS.THEME, state.theme);
  if (!ok) {
    state.theme = previousValue;
  }
}

/**
 * Load theme from localStorage.
 * Returns null when no theme is stored (caller should fall back to
 * prefers-color-scheme), or the stored string if it is 'dark' or 'light'.
 * Returns null on error.
 * @returns {'dark'|'light'|null}
 */
function loadTheme() {
  var value = _storageRead(STORAGE_KEYS.THEME, null);
  if (value !== 'dark' && value !== 'light') {
    if (value !== null) {
      console.error('[storage] theme value "' + value + '" is invalid; ignoring');
    }
    return null;
  }
  return value;
}
