/**
 * app.js — Main application entry point for the Expense Tracker.
 *
 * Unidirectional data flow:
 *   User Action → State Mutation → Persist to Storage → Re-render UI
 *
 * This file depends on storage.js being loaded first (via <script> order in
 * index.html). All functions from storage.js are available as globals.
 */

/* ── In-memory state ──────────────────────────────────────────────────── */

var state = {
  transactions: [],      // Transaction[]
  categories: [],        // string[] — built-ins + custom
  spendingLimits: {},    // Record<string, number>
  theme: 'light',        // 'light' | 'dark'
  sortOrder: 'default',  // 'default' | 'amount-asc' | 'amount-desc' | 'category-asc' | 'category-desc'
  view: 'main',          // 'main' | 'monthly-summary'
};

var BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun'];

/* ── UUID helper ──────────────────────────────────────────────────────── */

/**
 * Generate a UUID v4 string.
 * Uses crypto.randomUUID() when available (all modern browsers); falls back
 * to a manual RFC 4122 v4 implementation using crypto.getRandomValues().
 * @returns {string}
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Manual RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? (crypto.getRandomValues(new Uint8Array(1))[0] & 15)
      : Math.floor(Math.random() * 16);
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* ── State mutation functions ─────────────────────────────────────────── */

/**
 * Delete a transaction from state by id, persist the change to storage,
 * and re-render.
 *
 * Data flow: Mutate State → Persist to Storage → Re-render UI
 *
 * @param {string} id  UUID of the transaction to remove.
 *
 * Requirements: 3.2, 6.2
 */
function deleteTransaction(id) {
  var previousTransactions = state.transactions.slice();
  state.transactions = state.transactions.filter(function (tx) {
    return tx.id !== id;
  });
  saveTransactions(previousTransactions);
  render();
}

/**
 * Add a new transaction to state, persist it to storage, and re-render.
 *
 * Data flow: Validate → Mutate State → Persist to Storage → Re-render UI
 *
 * @param {string} name      Transaction name (non-empty after trim).
 * @param {number|string} amount  Positive monetary amount.
 * @param {string} category  Category label matching one in state.categories.
 *
 * Requirements: 1.2, 1.3, 6.1
 */
function addTransaction(name, amount, category) {
  var transaction = {
    id: generateUUID(),
    name: name,
    amount: parseFloat(amount),
    category: category,
    date: new Date().toISOString(),
  };

  var previousTransactions = state.transactions.slice();
  state.transactions.push(transaction);
  saveTransactions(previousTransactions);
  render();
}

/**
 * Add a new custom category to state, persist it, and re-render.
 *
 * Validates the name with validateCustomCategory against the current
 * state.categories list. On validation failure, displays inline errors in
 * the category manager's error container and returns without saving.
 *
 * Data flow: Validate → Mutate State → Persist to Storage → Re-render UI
 *
 * @param {string} name  The new category name (trimmed before use).
 *
 * Requirements: 8.1, 8.2, 8.3
 */
function addCustomCategory(name) {
  var errorsContainer = document.querySelector('#category-manager .category-errors');

  // Clear previous errors
  if (errorsContainer) {
    errorsContainer.innerHTML = '';
  }

  var errors = validateCustomCategory(name, state.categories);

  if (errors.length > 0) {
    if (errorsContainer) {
      errors.forEach(function (err) {
        var p = document.createElement('p');
        p.className = 'form-error';
        p.textContent = err.message;
        errorsContainer.appendChild(p);
      });
    }
    return;
  }

  var trimmedName = name.trim();
  var previousCategories = state.categories.slice();
  state.categories.push(trimmedName);
  saveCategories(previousCategories);
  render();
}

/**
 * Delete a custom category from state, persist the change, and re-render.
 *
 * Built-in categories (Food, Transport, Fun) are protected and cannot be
 * removed. Existing transactions that used the deleted category retain their
 * original category string — they are not modified.
 *
 * Data flow: Guard → Mutate State → Persist to Storage → Re-render UI
 *
 * @param {string} name  The category name to remove.
 *
 * Requirements: 8.4, 8.5
 */
function deleteCustomCategory(name) {
  // Protect built-in categories
  if (BUILT_IN_CATEGORIES.indexOf(name) !== -1) {
    return;
  }

  var previousCategories = state.categories.slice();
  state.categories = state.categories.filter(function (cat) {
    return cat !== name;
  });
  saveCategories(previousCategories);
  render();
}

/* ── Data processing functions ────────────────────────────────────────── */

/**
 * Build a monthly summary from a list of transactions.
 *
 * Groups transactions by calendar month, computes per-month totals and
 * per-category totals within each month, and returns the results sorted
 * by date descending (most recent month first).
 *
 * @param {Array<{id: string, name: string, amount: number, category: string, date: string}>} transactions
 * @returns {Array<{month: string, total: number, categories: Object<string, number>}>}
 *
 * Requirements: 9.1, 9.2
 */
function buildMonthlySummary(transactions) {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Month names for formatting "Month YYYY" labels
  var MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Map from "Month YYYY" key → { total, categories, year, monthIndex }
  // year and monthIndex are stored to enable correct date-based sorting
  var monthMap = {};

  transactions.forEach(function (tx) {
    var d = new Date(tx.date);
    var year = d.getFullYear();
    var monthIndex = d.getMonth(); // 0-based
    var monthLabel = MONTH_NAMES[monthIndex] + ' ' + year;

    if (!monthMap[monthLabel]) {
      monthMap[monthLabel] = {
        month: monthLabel,
        total: 0,
        categories: {},
        // Store numeric values for sorting
        _year: year,
        _monthIndex: monthIndex,
      };
    }

    monthMap[monthLabel].total += tx.amount;
    monthMap[monthLabel].categories[tx.category] =
      (monthMap[monthLabel].categories[tx.category] || 0) + tx.amount;
  });

  // Convert map to array and sort by date descending (most recent first)
  var result = Object.keys(monthMap).map(function (key) {
    var entry = monthMap[key];
    return {
      month: entry.month,
      total: entry.total,
      categories: entry.categories,
    };
  });

  result.sort(function (a, b) {
    var aEntry = monthMap[a.month];
    var bEntry = monthMap[b.month];
    // Compare year first, then month index — descending
    if (bEntry._year !== aEntry._year) {
      return bEntry._year - aEntry._year;
    }
    return bEntry._monthIndex - aEntry._monthIndex;
  });

  return result;
}

/* ── Render stubs ─────────────────────────────────────────────────────── */
// These will be implemented in later tasks (4, 6, 7, 9, 11, 12).

/**
 * Render the transaction list from state.transactions.
 *
 * Reads state.sortOrder to determine display order, computes per-category
 * cumulative totals to detect spending limit breaches, then rebuilds the
 * #transaction-list <ul> with one <li> per transaction.
 *
 * Each <li> contains:
 *  - .tx-name   — transaction name
 *  - .tx-amount — Intl.NumberFormat USD-formatted amount
 *  - .tx-category — category badge
 *  - .btn-danger delete button with data-id attribute
 *
 * The <li> receives the class "over-limit" when the transaction's category
 * cumulative total meets or exceeds the configured spending limit.
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 11.2
 */
function renderTransactionList() {
  var list = document.getElementById('transaction-list');
  if (!list) return;

  // ── 1. Sort a shallow copy of the transactions (via sort.js) ───────────
  var sorted = getSortedTransactions(state.transactions, state.sortOrder);

  // ── 2. Compute per-category cumulative totals ───────────────────────────
  var categoryTotals = {};
  state.transactions.forEach(function (tx) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  // ── 3. Currency formatter ───────────────────────────────────────────────
  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // ── 4. Build the list ───────────────────────────────────────────────────
  var fragment = document.createDocumentFragment();

  sorted.forEach(function (tx) {
    var li = document.createElement('li');

    // Determine over-limit status for this transaction's category
    var limit = state.spendingLimits[tx.category];
    var total = categoryTotals[tx.category] || 0;
    if (typeof limit === 'number' && total >= limit) {
      li.classList.add('over-limit');
    }

    // Name
    var nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = tx.name;

    // Amount
    var amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = formatter.format(tx.amount);

    // Category badge
    var categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = tx.category;

    // Delete button
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.setAttribute('data-id', tx.id);
    deleteBtn.setAttribute('aria-label', 'Delete transaction ' + tx.name);
    deleteBtn.textContent = 'Delete';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    fragment.appendChild(li);
  });

  // Replace list contents in one DOM operation
  list.innerHTML = '';
  list.appendChild(fragment);
}

/**
 * Render the total balance from state.transactions.
 *
 * Sums all transaction amounts and updates the #total-balance element with
 * the result formatted as USD currency using Intl.NumberFormat.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
function renderBalance() {
  var balanceEl = document.getElementById('total-balance');
  if (!balanceEl) return;

  var total = state.transactions.reduce(function (sum, tx) {
    return sum + tx.amount;
  }, 0);

  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  balanceEl.textContent = formatter.format(total);
}

/**
 * Render the spending distribution pie chart.
 *
 * Aggregates state.transactions by category to produce labels and data arrays,
 * then either creates a new Chart.js Pie instance (first call) or updates the
 * existing one (subsequent calls) via chart.data mutation + chart.update().
 *
 * Empty state: when no transactions exist, the chart is cleared (no segments).
 * CDN failure: when the Chart global is absent, the canvas is hidden and a
 * static "Chart unavailable." fallback text is shown instead.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
function renderChart() {
  var canvas = document.getElementById('spending-chart');
  if (!canvas) return;

  // ── CDN failure guard ────────────────────────────────────────────────────
  if (typeof Chart === 'undefined') {
    canvas.style.display = 'none';
    // Show fallback text only once
    var section = canvas.parentElement;
    if (section && !section.querySelector('.chart-unavailable')) {
      var fallback = document.createElement('p');
      fallback.className = 'chart-unavailable';
      fallback.textContent = 'Chart unavailable.';
      section.appendChild(fallback);
    }
    return;
  }

  // ── Aggregate transactions by category ──────────────────────────────────
  var totals = {};
  state.transactions.forEach(function (tx) {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  var labels = Object.keys(totals);
  var data   = labels.map(function (cat) { return totals[cat]; });

  // ── Colour palette — one colour per segment, cycling if needed ───────────
  var PALETTE = [
    '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#6366f1',
  ];
  var backgroundColors = labels.map(function (_, i) {
    return PALETTE[i % PALETTE.length];
  });

  // ── Create or update the Chart.js instance ───────────────────────────────
  if (!renderChart._instance) {
    // First call — create the Pie chart
    renderChart._instance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  } else {
    // Subsequent calls — update in place without destroying the instance
    renderChart._instance.data.labels                    = labels;
    renderChart._instance.data.datasets[0].data          = data;
    renderChart._instance.data.datasets[0].backgroundColor = backgroundColors;
    renderChart._instance.update();
  }
}

/**
 * Render the monthly summary section from state.transactions.
 *
 * Calls buildMonthlySummary() to group transactions by calendar month, then
 * builds DOM inside #monthly-summary-content showing each month with its
 * total and a per-category breakdown. When no transactions exist, an empty
 * state message is shown instead.
 *
 * Currency values are formatted with Intl.NumberFormat (USD).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
function renderMonthlySummary() {
  var content = document.getElementById('monthly-summary-content');
  if (!content) return;

  var summary = buildMonthlySummary(state.transactions);

  // ── Empty state (Requirement 9.4) ────────────────────────────────────────
  if (summary.length === 0) {
    content.innerHTML = '';
    var emptyMsg = document.createElement('p');
    emptyMsg.className = 'monthly-summary-empty';
    emptyMsg.textContent = 'No transactions yet.';
    content.appendChild(emptyMsg);
    return;
  }

  // ── Currency formatter ───────────────────────────────────────────────────
  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // ── Build month blocks (Requirements 9.1, 9.2) ──────────────────────────
  var fragment = document.createDocumentFragment();

  summary.forEach(function (monthData) {
    var block = document.createElement('div');
    block.className = 'month-block';

    // Month header row: name + total
    var header = document.createElement('div');
    header.className = 'month-header';

    var titleEl = document.createElement('span');
    titleEl.className = 'month-title';
    titleEl.textContent = monthData.month;

    var totalEl = document.createElement('span');
    totalEl.className = 'month-total';
    totalEl.textContent = formatter.format(monthData.total);

    header.appendChild(titleEl);
    header.appendChild(totalEl);
    block.appendChild(header);

    // Per-category breakdown
    var catList = document.createElement('ul');
    catList.className = 'month-categories';

    Object.keys(monthData.categories).forEach(function (cat) {
      var catItem = document.createElement('li');
      catItem.className = 'month-category-row';

      var catName = document.createElement('span');
      catName.className = 'month-category-name';
      catName.textContent = cat;

      var catAmount = document.createElement('span');
      catAmount.className = 'month-category-amount';
      catAmount.textContent = formatter.format(monthData.categories[cat]);

      catItem.appendChild(catName);
      catItem.appendChild(catAmount);
      catList.appendChild(catItem);
    });

    block.appendChild(catList);
    fragment.appendChild(block);
  });

  content.innerHTML = '';
  content.appendChild(fragment);
}

/**
 * Render spending limit warning indicators.
 *
 * Computes per-category cumulative totals from state.transactions, then for
 * each category that has a limit configured in state.spendingLimits:
 *  - Shows the warning badge in the corresponding .limit-row inside
 *    #spending-limits-list when the category total >= the limit.
 *  - Hides the warning badge when the category total < the limit.
 *
 * Also updates the over-limit CSS class on every <li> in #transaction-list
 * so highlights stay in sync with the current spending totals.
 *
 * This function operates on the existing DOM produced by
 * renderSpendingLimitPanel() and renderTransactionList(), updating only the
 * warning-related nodes rather than rebuilding those sections from scratch.
 *
 * Requirements: 11.2, 11.3, 11.4
 */
function renderSpendingLimitWarnings() {
  // ── 1. Compute per-category cumulative totals ───────────────────────────
  var categoryTotals = {};
  state.transactions.forEach(function (tx) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  // ── 2. Update warning badges in the spending limit panel ────────────────
  var limitRows = document.querySelectorAll('#spending-limits-list .limit-row');
  limitRows.forEach(function (row) {
    var category = row.getAttribute('data-category');
    if (!category) return;

    var limit = state.spendingLimits[category];
    var badge = row.querySelector('.warning-badge');
    if (!badge) return;

    if (typeof limit === 'number') {
      var total = categoryTotals[category] || 0;
      if (total >= limit) {
        badge.textContent = '⚠ Over limit';
      } else {
        badge.textContent = '';
      }
    } else {
      // No limit configured — ensure badge is hidden
      badge.textContent = '';
    }
  });

  // ── 3. Update over-limit class on transaction list items ────────────────
  var listItems = document.querySelectorAll('#transaction-list li');
  listItems.forEach(function (li) {
    // Identify the category from the .tx-category badge inside the <li>
    var categoryBadge = li.querySelector('.tx-category');
    if (!categoryBadge) return;

    var category = categoryBadge.textContent;
    var limit = state.spendingLimits[category];
    var total = categoryTotals[category] || 0;

    if (typeof limit === 'number' && total >= limit) {
      li.classList.add('over-limit');
    } else {
      li.classList.remove('over-limit');
    }
  });
}

/**
 * Populate the category <select> in #transaction-form from state.categories.
 * Preserves the currently selected value when re-rendering.
 *
 * Requirements: 1.1, 8.2, 8.5
 */
function renderCategoryDropdown() {
  var select = document.getElementById('tx-category');
  if (!select) return;

  var currentValue = select.value;

  // Rebuild options: placeholder + one per category
  select.innerHTML = '';
  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select category --';
  select.appendChild(placeholder);

  state.categories.forEach(function (cat) {
    var option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });

  // Restore previous selection if it still exists
  if (currentValue && state.categories.indexOf(currentValue) !== -1) {
    select.value = currentValue;
  }
}

/**
 * Render the category manager list and the category dropdown in the form.
 *
 * Rebuilds the #category-list <ul> from state.categories:
 *  - Built-in categories (Food, Transport, Fun) are shown as plain <li> items
 *    with no delete button (they cannot be removed).
 *  - Custom categories are shown with a "Delete" button that carries a
 *    data-category attribute so the event handler can identify the target.
 *
 * Also delegates to renderCategoryDropdown() to keep the form <select>
 * in sync with the same category list.
 *
 * Requirements: 8.1, 8.4, 8.5
 */
function renderCategoryManager() {
  renderCategoryDropdown();

  var list = document.getElementById('category-list');
  if (!list) return;

  var fragment = document.createDocumentFragment();

  state.categories.forEach(function (cat) {
    var li = document.createElement('li');
    li.className = 'category-item';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = cat;
    li.appendChild(nameSpan);

    var isBuiltIn = BUILT_IN_CATEGORIES.indexOf(cat) !== -1;
    if (!isBuiltIn) {
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.setAttribute('data-category', cat);
      deleteBtn.setAttribute('aria-label', 'Delete category ' + cat);
      deleteBtn.textContent = 'Delete';
      li.appendChild(deleteBtn);
    }

    fragment.appendChild(li);
  });

  list.innerHTML = '';
  list.appendChild(fragment);
}

/**
 * Set a spending limit for a category.
 *
 * Validates `value` with validateSpendingLimit. On failure, displays an
 * inline error in the corresponding row inside #spending-limits-list and
 * returns without saving. On success, updates state.spendingLimits[category],
 * persists via saveSpendingLimits(), and re-renders the transaction list and
 * spending limit panel so highlights and warning badges update immediately.
 *
 * Data flow: Validate → Mutate State → Persist to Storage → Re-render UI
 *
 * @param {string} category  The category name whose limit is being set.
 * @param {*}      value     The raw input value (string or number).
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5, 11.6
 */
function setSpendingLimit(category, value) {
  // Find the error container for this category row (if the panel is rendered)
  var errorEl = document.querySelector(
    '#spending-limits-list .limit-row[data-category="' + CSS.escape(category) + '"] .limit-error'
  );

  // Clear previous inline error
  if (errorEl) {
    errorEl.textContent = '';
  }

  var errors = validateSpendingLimit(value);

  if (errors.length > 0) {
    // Display inline error in the row
    if (errorEl) {
      errorEl.textContent = errors[0].message;
    }
    return;
  }

  var previousLimits = Object.assign({}, state.spendingLimits);
  state.spendingLimits[category] = parseFloat(value);
  saveSpendingLimits(previousLimits);

  // Re-render the full UI so highlights, warning badges, and all other
  // sections stay in sync with the updated spending limit.
  render();
}

/**
 * Render the spending limit input panel inside #spending-limits-list.
 *
 * For each category in state.categories, renders a row containing:
 *  - A label with the category name
 *  - A numeric input pre-filled with the current limit (empty when no limit set)
 *  - A "Save" button that calls setSpendingLimit when clicked
 *  - A warning badge (⚠ Over limit) shown when the category's cumulative
 *    transaction total meets or exceeds the configured spending limit
 *  - An inline error span for validation feedback
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
function renderSpendingLimitPanel() {
  var container = document.getElementById('spending-limits-list');
  if (!container) return;

  // Compute per-category cumulative totals from current transactions
  var categoryTotals = {};
  state.transactions.forEach(function (tx) {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  var fragment = document.createDocumentFragment();

  state.categories.forEach(function (cat) {
    var row = document.createElement('div');
    row.className = 'limit-row';
    row.setAttribute('data-category', cat);

    // Category name label
    var label = document.createElement('span');
    label.className = 'limit-label';
    label.textContent = cat;

    // Numeric input pre-filled with current limit (empty when none set)
    var input = document.createElement('input');
    input.type = 'number';
    input.min = '0.01';
    input.step = '0.01';
    input.placeholder = 'No limit';
    input.setAttribute('aria-label', 'Spending limit for ' + cat);
    var currentLimit = state.spendingLimits[cat];
    if (typeof currentLimit === 'number') {
      input.value = currentLimit;
    }

    // Save button
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-save-limit';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Save spending limit for ' + cat);

    // Capture category and input in closure for the click handler
    (function (category, limitInput) {
      saveBtn.addEventListener('click', function () {
        setSpendingLimit(category, limitInput.value);
      });
    }(cat, input));

    // Warning badge — shown when total >= limit
    var warningBadge = document.createElement('span');
    warningBadge.className = 'warning-badge';
    warningBadge.setAttribute('aria-label', 'Spending limit exceeded for ' + cat);
    var total = categoryTotals[cat] || 0;
    if (typeof currentLimit === 'number' && total >= currentLimit) {
      warningBadge.textContent = '⚠ Over limit';
    } else {
      warningBadge.textContent = '';
    }

    // Inline error span for validation feedback
    var errorSpan = document.createElement('span');
    errorSpan.className = 'limit-error';
    errorSpan.setAttribute('aria-live', 'polite');
    errorSpan.style.color = 'var(--color-danger)';
    errorSpan.style.fontSize = '0.8125rem';

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(saveBtn);
    row.appendChild(warningBadge);
    row.appendChild(errorSpan);

    fragment.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(fragment);
}

/**
 * Show or hide the main-view sections and the monthly-summary section based
 * on state.view, and update the toggle button label accordingly.
 *
 * Main-view sections (visible when state.view === 'main'):
 *   <main>, <aside>, #chart-section
 *
 * Monthly-summary section (visible when state.view === 'monthly-summary'):
 *   #monthly-summary
 *
 * Requirements: 9.5
 */
function renderView() {
  var isMain = state.view === 'main';

  // Main content areas
  var mainEl = document.querySelector('body > main');
  var asideEl = document.querySelector('body > aside');
  var chartSection = document.getElementById('chart-section');
  var monthlySummarySection = document.getElementById('monthly-summary');
  var toggleBtn = document.getElementById('monthly-summary-toggle');

  if (mainEl) {
    if (isMain) {
      mainEl.removeAttribute('hidden');
    } else {
      mainEl.setAttribute('hidden', '');
    }
  }

  if (asideEl) {
    if (isMain) {
      asideEl.removeAttribute('hidden');
    } else {
      asideEl.setAttribute('hidden', '');
    }
  }

  if (chartSection) {
    if (isMain) {
      chartSection.removeAttribute('hidden');
    } else {
      chartSection.setAttribute('hidden', '');
    }
  }

  if (monthlySummarySection) {
    if (isMain) {
      monthlySummarySection.setAttribute('hidden', '');
    } else {
      monthlySummarySection.removeAttribute('hidden');
    }
  }

  if (toggleBtn) {
    toggleBtn.textContent = isMain ? 'View Monthly Summary' : 'Back to Transactions';
  }
}

/**
 * Full render pipeline — calls every render helper in order.
 * Implemented fully in task 13.1; stubs are called here so bootstrap works.
 */
function render() {
  renderView();
  renderBalance();
  renderTransactionList();
  renderChart();
  renderMonthlySummary();
  renderCategoryManager();
  renderSpendingLimitPanel();
  // renderSpendingLimitWarnings() runs after renderSpendingLimitPanel() so it
  // operates on freshly-built DOM (the panel rebuilds .limit-row elements).
  renderSpendingLimitWarnings();
}

/* ── Bootstrap ────────────────────────────────────────────────────────── */

/**
 * On DOMContentLoaded:
 *  1. Load all persisted data into state.
 *  2. Apply the stored (or OS-preferred) theme.
 *  3. Run the full render pipeline.
 *
 * Requirements: 2.4, 6.3
 */
document.addEventListener('DOMContentLoaded', function () {
  // Load persisted categories; fall back to built-ins when none are stored.
  var storedCategories = loadCategories();
  state.categories = storedCategories.length > 0
    ? storedCategories
    : BUILT_IN_CATEGORIES.slice();

  // Load persisted transactions.
  state.transactions = loadTransactions();

  // Load persisted spending limits.
  state.spendingLimits = loadSpendingLimits();

  // Load persisted theme; fall back to OS preference when absent.
  // Delegated to theme.js — initTheme() handles storage read, OS fallback,
  // and applies the data-theme attribute on <html>.
  // Requirements: 12.3, 12.4
  initTheme();

  // Run the full render pipeline to restore UI to previous session state.
  render();

  // ── Theme toggle ─────────────────────────────────────────────────────────
  // Wires the #theme-toggle button to toggleTheme() from theme.js.
  // Requirements: 12.1, 12.2, 12.3
  var themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function () {
      toggleTheme();
    });
  }

  // ── Delete transaction (event delegation on #transaction-list) ──────────
  // A single listener on the <ul> handles clicks on any delete button inside
  // it, including buttons added after the initial render.
  // Requirements: 3.1, 3.2, 3.3, 3.4
  var transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', function (event) {
      var target = event.target;
      // Walk up to the nearest button with a data-id in case the click lands
      // on a child element of the button (e.g. an icon).
      while (target && target !== transactionList) {
        if (target.tagName === 'BUTTON' && target.hasAttribute('data-id')) {
          var id = target.getAttribute('data-id');
          deleteTransaction(id);
          return;
        }
        target = target.parentElement;
      }
    });
  }

  // ── Category manager: add category ─────────────────────────────────────
  // Handles clicks on the "Add" button in #category-manager.
  // Requirements: 8.1, 8.2, 8.3
  var addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', function () {
      var input = document.getElementById('new-category-input');
      var name = input ? input.value : '';
      addCustomCategory(name);
      // Clear the input on success (no errors means the category was added)
      var errorsContainer = document.querySelector('#category-manager .category-errors');
      var hasErrors = errorsContainer && errorsContainer.children.length > 0;
      if (!hasErrors && input) {
        input.value = '';
      }
    });
  }

  // ── Category manager: delete category (event delegation on #category-list)
  // A single listener on the <ul> handles clicks on any delete button inside
  // it, including buttons added after the initial render.
  // Requirements: 8.4, 8.5
  var categoryList = document.getElementById('category-list');
  if (categoryList) {
    categoryList.addEventListener('click', function (event) {
      var target = event.target;
      // Walk up to the nearest button with a data-category attribute.
      while (target && target !== categoryList) {
        if (target.tagName === 'BUTTON' && target.hasAttribute('data-category')) {
          var categoryName = target.getAttribute('data-category');
          deleteCustomCategory(categoryName);
          return;
        }
        target = target.parentElement;
      }
    });
  }

  // ── Monthly summary toggle ───────────────────────────────────────────────
  // Toggles state.view between 'main' and 'monthly-summary', then re-renders
  // so the correct sections are shown/hidden.
  // Requirements: 9.5
  var monthlySummaryToggle = document.getElementById('monthly-summary-toggle');
  if (monthlySummaryToggle) {
    monthlySummaryToggle.addEventListener('click', function () {
      state.view = state.view === 'main' ? 'monthly-summary' : 'main';
      render();
    });
  }

  // ── Sort control change ──────────────────────────────────────────────────
  // Updates state.sortOrder (session-only, not persisted) and re-renders the
  // transaction list with the newly selected sort order.
  // Requirements: 10.1, 10.2, 10.5
  var sortControl = document.getElementById('sort-control');
  if (sortControl) {
    sortControl.addEventListener('change', function () {
      state.sortOrder = sortControl.value;
      render();
    });
  }

  // ── Transaction form submit ──────────────────────────────────────────────
  var form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      // Clear previous inline errors
      var errorsContainer = form.querySelector('.form-errors');
      if (errorsContainer) {
        errorsContainer.innerHTML = '';
      }

      // Read field values
      var nameInput     = document.getElementById('tx-name');
      var amountInput   = document.getElementById('tx-amount');
      var categoryInput = document.getElementById('tx-category');

      var name     = nameInput     ? nameInput.value     : '';
      var amount   = amountInput   ? amountInput.value   : '';
      var category = categoryInput ? categoryInput.value : '';

      // Validate
      var errors = validateTransaction({ name: name, amount: amount, category: category });

      if (errors.length > 0) {
        // Display inline error messages
        if (errorsContainer) {
          errors.forEach(function (err) {
            var p = document.createElement('p');
            p.className = 'form-error';
            p.textContent = err.message;
            errorsContainer.appendChild(p);
          });
        }

        // Focus the first invalid field
        var fieldIdMap = { name: 'tx-name', amount: 'tx-amount', category: 'tx-category' };
        var firstFieldId = fieldIdMap[errors[0].field];
        if (firstFieldId) {
          var firstField = document.getElementById(firstFieldId);
          if (firstField) {
            firstField.focus();
          }
        }
        return;
      }

      // Validation passed — add transaction and reset form
      addTransaction(name, amount, category);
      form.reset();
    });
  }
});
