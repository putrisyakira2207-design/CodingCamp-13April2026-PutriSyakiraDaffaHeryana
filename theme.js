/**
 * theme.js — Dark/light mode toggle logic for the Expense Tracker.
 *
 * Depends on storage.js being loaded first (loadTheme, saveTheme).
 * Depends on app.js being loaded first (state object).
 *
 * Public API:
 *   applyTheme(value)  — sets data-theme on <html> and updates state.theme
 *   initTheme()        — reads stored theme or falls back to OS preference
 *   toggleTheme()      — flips the current theme, persists, and applies it
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

/**
 * Apply a theme value to the document and update state.theme.
 *
 * Sets the `data-theme` attribute on `<html>` to either `"dark"` or
 * `"light"`. Any value other than `"dark"` is treated as `"light"`.
 *
 * @param {'dark'|'light'} value
 *
 * Requirements: 12.2
 */
function applyTheme(value) {
  var theme = value === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof state !== 'undefined') {
    state.theme = theme;
  }
}

/**
 * Initialise the theme on page load.
 *
 * Resolution order:
 *  1. Stored theme from Local Storage (via loadTheme()).
 *  2. OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
 *  3. Falls back to `"light"` when neither source is available.
 *
 * Requirements: 12.3, 12.4
 */
function initTheme() {
  var stored = loadTheme();

  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
    return;
  }

  // No stored preference — use OS preference
  var prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  applyTheme(prefersDark ? 'dark' : 'light');
}

/**
 * Toggle between dark and light themes.
 *
 * Reads the current theme from state.theme, flips it, persists the new
 * value via saveTheme(), and applies it via applyTheme().
 *
 * Requirements: 12.1, 12.3
 */
function toggleTheme() {
  var current = (typeof state !== 'undefined') ? state.theme : 'light';
  var next = current === 'dark' ? 'light' : 'dark';

  // Persist before applying (state mutation → persist → render)
  var previous = current;
  applyTheme(next);          // updates state.theme to `next`
  saveTheme(previous);       // persists state.theme; rolls back state.theme on quota error
  // If saveTheme rolled back state.theme to `previous`, also revert the DOM.
  if ((typeof state !== 'undefined') && state.theme !== next) {
    applyTheme(previous);
  }
}
