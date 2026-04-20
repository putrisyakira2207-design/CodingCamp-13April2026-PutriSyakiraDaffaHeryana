/**
 * sort.js — Sorting comparators for the expense tracker transaction list.
 *
 * All comparators follow the standard Array.prototype.sort contract:
 *   - Return a negative number if `a` should come before `b`
 *   - Return a positive number if `a` should come after `b`
 *   - Return 0 if the order is unchanged
 *
 * None of these functions mutate the original array; callers should sort a
 * shallow copy (e.g. state.transactions.slice()) before passing it to sort().
 *
 * Requirements: 10.1, 10.3, 10.4
 */

/**
 * Sort transactions by amount in ascending order (lowest first).
 *
 * @param {{ amount: number }} a
 * @param {{ amount: number }} b
 * @returns {number}
 */
function sortByAmountAsc(a, b) {
  return a.amount - b.amount;
}

/**
 * Sort transactions by amount in descending order (highest first).
 *
 * @param {{ amount: number }} a
 * @param {{ amount: number }} b
 * @returns {number}
 */
function sortByAmountDesc(a, b) {
  return b.amount - a.amount;
}

/**
 * Sort transactions by category alphabetically A–Z (locale-aware).
 *
 * @param {{ category: string }} a
 * @param {{ category: string }} b
 * @returns {number}
 */
function sortByCategoryAsc(a, b) {
  return a.category.localeCompare(b.category);
}

/**
 * Sort transactions by category alphabetically Z–A (locale-aware).
 *
 * @param {{ category: string }} a
 * @param {{ category: string }} b
 * @returns {number}
 */
function sortByCategoryDesc(a, b) {
  return b.category.localeCompare(a.category);
}

/**
 * Return a sorted shallow copy of `transactions` according to `sortOrder`.
 *
 * Sort options:
 *   'amount-asc'    — amount ascending
 *   'amount-desc'   — amount descending
 *   'category-asc'  — category A–Z
 *   'category-desc' — category Z–A
 *   'default'       — insertion order (original array order preserved)
 *
 * The 'default' option returns a shallow copy without sorting so that the
 * original insertion order is preserved exactly (Requirement 10.4).
 *
 * @param {Array<{ id: string, amount: number, category: string }>} transactions
 * @param {string} sortOrder  One of the five sort option values above.
 * @returns {Array}  A new array containing the same transactions in sorted order.
 */
function getSortedTransactions(transactions, sortOrder) {
  var copy = transactions.slice();

  switch (sortOrder) {
    case 'amount-asc':
      copy.sort(sortByAmountAsc);
      break;
    case 'amount-desc':
      copy.sort(sortByAmountDesc);
      break;
    case 'category-asc':
      copy.sort(sortByCategoryAsc);
      break;
    case 'category-desc':
      copy.sort(sortByCategoryDesc);
      break;
    default:
      // 'default' — return insertion-order copy unchanged (Requirement 10.4)
      break;
  }

  return copy;
}
