/**
 * validator.js — Client-side input validation rules for the expense tracker.
 *
 * All functions return an array of error objects { field, message }.
 * An empty array means the input is valid.
 *
 * Functions are attached to a global `Validator` object so they are
 * accessible from any script loaded after this file.
 *
 * Requirements: 1.4, 1.5, 8.3, 11.6
 */

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Returns true when `value` is a string that is empty or contains only
 * whitespace characters.
 * @param {*} value
 * @returns {boolean}
 */
function _isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * Returns true when `value` represents a valid positive number.
 * Accepts both numeric types and numeric strings.
 * @param {*} value
 * @returns {boolean}
 */
function _isPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  var num = Number(value);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/* ─── Exported validation functions ─────────────────────────────────────── */

/**
 * Validate a transaction form submission.
 *
 * Rejects:
 *  - empty or whitespace-only name (Requirement 1.4)
 *  - non-positive amount — zero or negative (Requirement 1.5)
 *  - non-numeric amount — NaN or non-numeric strings (Requirement 1.5)
 *  - missing or empty category (Requirement 1.4)
 *
 * @param {{ name: string, amount: *, category: string }} fields
 * @returns {{ field: string, message: string }[]}
 */
function validateTransaction(fields) {
  var errors = [];
  var name = fields.name;
  var amount = fields.amount;
  var category = fields.category;

  // Validate name
  if (_isBlank(name)) {
    errors.push({ field: 'name', message: 'Transaction name is required.' });
  }

  // Validate amount — check for non-numeric first, then non-positive
  if (amount === null || amount === undefined || amount === '') {
    errors.push({ field: 'amount', message: 'Amount is required.' });
  } else {
    var num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.push({ field: 'amount', message: 'Amount must be a valid number.' });
    } else if (num <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number.' });
    }
  }

  // Validate category
  if (_isBlank(category)) {
    errors.push({ field: 'category', message: 'Category is required.' });
  }

  return errors;
}

/**
 * Validate a custom category name before adding it.
 *
 * Rejects:
 *  - empty or whitespace-only name (Requirement 8.3)
 *  - case-insensitive duplicates against existingCategories (Requirement 8.3)
 *
 * @param {string} name
 * @param {string[]} existingCategories
 * @returns {{ field: string, message: string }[]}
 */
function validateCustomCategory(name, existingCategories) {
  var errors = [];

  if (_isBlank(name)) {
    errors.push({ field: 'name', message: 'Category name is required.' });
    return errors; // No point checking duplicates if name is blank
  }

  var trimmed = name.trim().toLowerCase();
  var categories = Array.isArray(existingCategories) ? existingCategories : [];
  var isDuplicate = categories.some(function (cat) {
    return typeof cat === 'string' && cat.trim().toLowerCase() === trimmed;
  });

  if (isDuplicate) {
    errors.push({ field: 'name', message: 'A category with that name already exists.' });
  }

  return errors;
}

/**
 * Validate a spending limit value before saving it.
 *
 * Rejects:
 *  - zero (Requirement 11.6)
 *  - negative numbers (Requirement 11.6)
 *  - NaN (Requirement 11.6)
 *  - non-numeric strings (Requirement 11.6)
 *
 * @param {*} value
 * @returns {{ field: string, message: string }[]}
 */
function validateSpendingLimit(value) {
  var errors = [];

  if (!_isPositiveNumber(value)) {
    errors.push({ field: 'limit', message: 'Spending limit must be a positive number.' });
  }

  return errors;
}

/* ─── Global Validator object ───────────────────────────────────────────── */

var Validator = {
  validateTransaction: validateTransaction,
  validateCustomCategory: validateCustomCategory,
  validateSpendingLimit: validateSpendingLimit,
};
