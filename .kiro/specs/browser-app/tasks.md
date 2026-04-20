# Implementation Plan: browser-app

## Overview

Build the expense tracker as a single `index.html` with co-located `style.css` and `app.js` files. Implementation follows the unidirectional data flow defined in the design: every state mutation writes to Local Storage before updating the DOM. Tasks are ordered so each step produces a runnable, integrated increment.

## Tasks

- [~] 1. Scaffold the project files and base HTML structure
  - Create `index.html` with semantic layout: header (balance + theme toggle), main (form, transaction list, sort control), aside (category manager, spending limits), section (monthly summary), and a `<canvas>` for the chart
  - Create `style.css` with CSS custom properties for both light and dark themes (`data-theme` attribute on `<html>`)
  - Create `app.js` with the in-memory `state` object (`transactions`, `categories`, `spendingLimits`, `theme`, `sortOrder`, `view`) and stub functions for each logical module (storage, validator, renderer, sort, theme)
  - Load Chart.js via CDN `<script>` tag in `index.html`
  - _Requirements: 1.1, 2.1, 4.1, 7.1, 7.2_

- [ ] 2. Implement Local Storage helpers and state bootstrap
  - [x] 2.1 Write `storage.js` read/write helpers
    - Implement `saveTransactions()`, `loadTransactions()`, `saveCategories()`, `loadCategories()`, `saveSpendingLimits()`, `loadSpendingLimits()`, `saveTheme()`, `loadTheme()` — each wrapping `JSON.stringify` / `JSON.parse` with try/catch
    - On `QuotaExceededError` during write, roll back the in-memory state change and show a non-blocking toast
    - On parse error or unavailable storage at load, initialize with empty state and show a non-blocking banner
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Write property test for transaction persistence round-trip
    - **Property 1: Transaction persistence round-trip**
    - **Validates: Requirements 1.2, 2.4, 6.1, 6.2, 6.3**

  - [ ]* 2.3 Write property test for spending limit persistence round-trip
    - **Property 10: Spending limit persistence round-trip**
    - **Validates: Requirements 11.5**

  - [ ]* 2.4 Write property test for theme persistence round-trip
    - **Property 8: Theme persistence round-trip**
    - **Validates: Requirements 12.3, 12.4**

  - [x] 2.5 Bootstrap state on page load
    - Call all `load*` helpers on `DOMContentLoaded`, populate `state`, then call the full render pipeline
    - _Requirements: 2.4, 6.3_

- [ ] 3. Implement input validation
  - [x] 3.1 Write `validator.js` with all validation rules
    - `validateTransaction({ name, amount, category })` — rejects empty/whitespace name, non-positive or non-numeric amount, missing category; returns an array of error objects `{ field, message }`
    - `validateCustomCategory(name, existingCategories)` — rejects empty/whitespace name and case-insensitive duplicates
    - `validateSpendingLimit(value)` — rejects zero, negative, NaN, and non-numeric strings
    - _Requirements: 1.4, 1.5, 8.3, 11.6_

  - [ ]* 3.2 Write property test for whitespace and empty input rejection
    - **Property 3: Whitespace and empty inputs are rejected**
    - **Validates: Requirements 1.4, 8.3**

  - [ ]* 3.3 Write property test for invalid spending limit rejection
    - **Property 11: Invalid spending limit rejected**
    - **Validates: Requirements 1.5, 11.6**

- [ ] 4. Implement core transaction features (add, list, delete, balance)
  - [x] 4.1 Implement `addTransaction(name, amount, category)`
    - Generate a UUID v4 id and ISO 8601 date, push to `state.transactions`, call `saveTransactions()`, then re-render
    - _Requirements: 1.2, 1.3, 6.1_

  - [x] 4.2 Implement `deleteTransaction(id)`
    - Filter `state.transactions` by id, call `saveTransactions()`, then re-render
    - _Requirements: 3.2, 6.2_

  - [x] 4.3 Implement `renderTransactionList()`
    - Build `<li>` elements from the sorted transaction list; each entry shows name, `Intl.NumberFormat` currency amount, category badge, and a delete button with `data-id`; apply `over-limit` class when the transaction's category has met or exceeded its spending limit
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 11.2_

  - [x] 4.4 Implement `renderBalance()`
    - Sum all `state.transactions[].amount` values and update `#total-balance` with `Intl.NumberFormat` formatting
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.5 Write property test for balance equals sum of transactions
    - **Property 2: Balance equals sum of transactions**
    - **Validates: Requirements 4.2, 4.3, 4.4, 3.3**

  - [x] 4.6 Wire the `#transaction-form` submit event
    - On submit: clear previous errors, run `validateTransaction`, display inline errors on failure (focus first invalid field), call `addTransaction` on success and reset the form
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.7 Wire delete button clicks on `#transaction-list` via event delegation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Checkpoint — core transaction flow
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement the spending distribution pie chart
  - [x] 6.1 Implement `renderChart()`
    - Aggregate `state.transactions` by category to produce labels and data arrays; create a Chart.js `Pie` instance on first call, then update `chart.data` and call `chart.update()` on subsequent calls; show empty state when no transactions exist; catch missing `Chart` global and show static fallback text
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.2 Write property test for chart data consistency
    - **Property 9: Chart data consistency**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Implement custom categories
  - [x] 7.1 Implement `addCustomCategory(name)` and `deleteCustomCategory(name)`
    - `addCustomCategory`: validate with `validateCustomCategory`, push to `state.categories`, call `saveCategories()`, re-render category dropdown and category manager list
    - `deleteCustomCategory`: remove from `state.categories` (built-ins protected), call `saveCategories()`, re-render; existing transactions retain their original category string
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.2 Implement `renderCategoryManager()`
    - Render the custom category list with delete buttons; built-in categories shown without a delete button
    - _Requirements: 8.1, 8.4, 8.5_

  - [x] 7.3 Wire `#category-manager` add and delete events
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.4 Write property test for custom category round-trip
    - **Property 4: Custom category round-trip**
    - **Validates: Requirements 8.2**

- [ ] 8. Implement transaction sorting
  - [x] 8.1 Implement sort comparators in `sort.js`
    - `sortByAmountAsc`, `sortByAmountDesc`, `sortByCategoryAsc`, `sortByCategoryDesc`; default returns the original insertion-order array unchanged
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 8.2 Wire `#sort-control` change event
    - Update `state.sortOrder` (not persisted) and call `renderTransactionList()`
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ]* 8.3 Write property test for sort order completeness
    - **Property 6: Sort order completeness**
    - **Validates: Requirements 10.2, 10.3**

- [ ] 9. Implement spending limits
  - [x] 9.1 Implement `setSpendingLimit(category, value)` and `renderSpendingLimitPanel()`
    - `setSpendingLimit`: validate with `validateSpendingLimit`, update `state.spendingLimits[category]`, call `saveSpendingLimits()`, then re-render transaction list and spending limit panel
    - `renderSpendingLimitPanel`: for each category render a row with name, numeric input pre-filled with current limit, save button, and a warning badge when the category total meets or exceeds the limit
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 9.2 Implement `renderSpendingLimitWarnings()`
    - Compute per-category totals from `state.transactions`; for each category with a limit set, show a warning indicator in the spending limit panel when total >= limit
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 9.3 Wire spending limit save buttons in `#spending-limits`
    - _Requirements: 11.1, 11.5, 11.6_

  - [ ]* 9.4 Write property test for spending limit highlight and warning consistency
    - **Property 5: Spending limit highlight and warning consistency**
    - **Validates: Requirements 11.2, 11.3, 11.4**

- [x] 10. Checkpoint — categories, sorting, and spending limits
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement monthly summary view
  - [x] 11.1 Implement `buildMonthlySummary(transactions)`
    - Group transactions by calendar month (format: "Month YYYY"), compute per-month totals and per-category-within-month totals; return a sorted array of month objects
    - _Requirements: 9.1, 9.2_

  - [x] 11.2 Implement `renderMonthlySummary()`
    - Build the summary DOM from `buildMonthlySummary(state.transactions)`; show empty state message when no transactions exist
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 11.3 Wire the monthly summary navigation toggle
    - Toggle `state.view` between `'main'` and `'monthly-summary'`; show/hide the relevant sections accordingly
    - _Requirements: 9.5_

  - [ ]* 11.4 Write property test for monthly summary totals match transaction data
    - **Property 7: Monthly summary totals match transaction data**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 12. Implement dark/light mode toggle
  - [x] 12.1 Implement `theme.js` toggle logic
    - `applyTheme(value)` — sets `data-theme` attribute on `<html>` to `"dark"` or `"light"`
    - `initTheme()` — reads from `loadTheme()`; falls back to `window.matchMedia('(prefers-color-scheme: dark)')` when no stored value exists
    - `toggleTheme()` — flips the current theme, calls `saveTheme()`, calls `applyTheme()`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.2 Add dark theme CSS variables to `style.css`
    - Define `[data-theme="dark"]` overrides for all custom properties; ensure all text and interactive elements meet WCAG AA contrast ratios
    - _Requirements: 12.2, 12.5_

  - [x] 12.3 Wire `#theme-toggle` click event and call `initTheme()` on load
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 13. Integrate all render helpers into a unified render pipeline
  - [x] 13.1 Create a top-level `render()` function that calls all render helpers in order
    - `renderBalance()`, `renderTransactionList()`, `renderChart()`, `renderMonthlySummary()`, `renderSpendingLimitWarnings()`, `renderCategoryManager()`, `renderSpendingLimitPanel()`
    - Replace any ad-hoc render calls in event handlers with a single `render()` call
    - _Requirements: 2.2, 3.3, 3.4, 4.3, 5.3, 5.4, 9.3, 11.3_

  - [x] 13.2 Populate the category `<select>` in `#transaction-form` from `state.categories` as part of `render()`
    - _Requirements: 1.1, 8.2, 8.5_

- [x] 14. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at meaningful milestones
- Property tests validate universal correctness properties (Properties 1–11 from the design)
- Unit tests validate specific edge cases and error conditions
- The entire app ships without a build step — all JS runs directly in the browser
