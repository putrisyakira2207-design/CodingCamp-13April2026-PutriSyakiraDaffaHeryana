# Requirements Document

## Introduction

A client-side expense tracker web app built with HTML, CSS, and Vanilla JavaScript. Users can log spending transactions with a name, amount, and category, view a scrollable transaction list, see a running total balance, and visualize spending distribution via a Chart.js pie chart. All data is persisted in the browser's Local Storage so it survives page reloads and session restarts. No backend or build tooling is required.

## Glossary

- **App**: The browser-based expense tracker application.
- **Transaction**: A single expense record consisting of a name, a positive monetary amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Input_Form**: The HTML form used to enter a new transaction's name, amount, and category.
- **Category**: A spending label used to classify transactions. Includes built-in labels (Food, Transport, Fun) and any user-defined custom categories.
- **Custom_Category**: A user-defined category name added via the Category Manager.
- **Category_Manager**: The UI component that allows users to create and delete custom categories.
- **Total_Balance**: The sum of all transaction amounts, displayed prominently at the top of the App.
- **Pie_Chart**: A Chart.js-rendered chart showing the proportional spending breakdown by Category.
- **Monthly_Summary**: A view that aggregates transaction totals grouped by month and category.
- **Sort_Control**: The UI control that allows users to reorder the Transaction_List by amount or category.
- **Spending_Limit**: A user-configured monetary threshold per category; transactions exceeding it are visually highlighted.
- **Theme**: The visual color scheme of the App — either light or dark mode.
- **Storage**: The browser's Local Storage API used to persist transaction data.
- **Validator**: The client-side logic that checks Input_Form fields before a transaction is saved.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill out a form and submit a new expense, so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for the transaction name, a numeric field for the amount, and a dropdown selector for the Category that includes all built-in categories (Food, Transport, Fun) and any user-defined Custom_Categories.
2. WHEN the user submits the Input_Form with all fields filled and a positive amount, THE App SHALL add the transaction to the Transaction_List and persist it to Storage.
3. WHEN the user submits the Input_Form with all fields filled and a positive amount, THE Input_Form SHALL reset all fields to their default empty/unselected state after submission.
4. IF the user submits the Input_Form with one or more empty fields, THEN THE Validator SHALL display an inline error message identifying the missing field(s) and prevent the transaction from being saved.
5. IF the user submits the Input_Form with an amount that is not a positive number, THEN THE Validator SHALL display an inline error message and prevent the transaction from being saved.

---

### Requirement 2: View Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every saved transaction showing its name, amount (formatted as currency), and Category.
2. WHEN a new transaction is added, THE Transaction_List SHALL update immediately to include the new entry without requiring a page reload.
3. WHILE the number of transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain scrollable so all entries are accessible.
4. WHEN the App loads, THE Transaction_List SHALL display all transactions previously persisted in Storage.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to remove an individual transaction, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Storage.
3. WHEN a transaction is deleted, THE Total_Balance SHALL update immediately to reflect the removal.
4. WHEN a transaction is deleted, THE Pie_Chart SHALL update immediately to reflect the removal.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see the total amount I have spent, so that I can understand my overall expenditure at a glance.

#### Acceptance Criteria

1. THE App SHALL display the Total_Balance at the top of the page.
2. THE Total_Balance SHALL equal the sum of the amounts of all transactions currently in Storage.
3. WHEN a transaction is added, THE Total_Balance SHALL update immediately to reflect the new sum.
4. WHEN all transactions are deleted, THE Total_Balance SHALL display zero.

---

### Requirement 5: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render using Chart.js and display one segment per Category that has at least one transaction.
2. THE Pie_Chart SHALL show each segment proportional to the total amount spent in that Category relative to the Total_Balance.
3. WHEN a transaction is added, THE Pie_Chart SHALL update immediately to reflect the new category distribution.
4. WHEN a transaction is deleted, THE Pie_Chart SHALL update immediately to reflect the revised category distribution.
5. WHEN no transactions exist, THE Pie_Chart SHALL display an empty state (no segments rendered).

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Storage before the UI is updated.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Storage before the UI is updated.
3. WHEN the App loads, THE App SHALL read all transactions from Storage and restore the Transaction_List, Total_Balance, and Pie_Chart to the state they were in at the end of the previous session.
4. IF Storage is unavailable or returns a parse error on load, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning message to the user.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work in any modern browser, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari without requiring any browser extensions or plugins.
2. THE App SHALL use only standard Web APIs (DOM, Local Storage, Fetch) and SHALL NOT depend on browser-specific non-standard APIs.

---

### Requirement 8: Custom Categories

**User Story:** As a user, I want to create my own spending categories, so that I can organize transactions in a way that reflects my personal budget.

#### Acceptance Criteria

1. THE App SHALL provide a Category_Manager that allows the user to add a new Custom_Category by entering a name and confirming.
2. WHEN a Custom_Category is created, THE App SHALL persist it to Storage and immediately make it available in the Input_Form category dropdown.
3. IF the user attempts to create a Custom_Category with an empty name or a name that duplicates an existing category (case-insensitive), THEN THE Validator SHALL display an inline error and prevent the category from being saved.
4. THE Category_Manager SHALL allow the user to delete a Custom_Category.
5. WHEN a Custom_Category is deleted, THE App SHALL remove it from Storage and from the Input_Form dropdown; existing transactions that used that category SHALL retain their original category label in the Transaction_List.

---

### Requirement 9: Monthly Summary View

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can track how my expenses change over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view that groups transactions by calendar month (e.g., "June 2025") and displays the total amount spent per month.
2. THE Monthly_Summary SHALL also break down each month's total by Category, showing the amount spent per category within that month.
3. WHEN a transaction is added or deleted, THE Monthly_Summary SHALL update immediately to reflect the change.
4. WHEN no transactions exist, THE Monthly_Summary SHALL display an empty state message.
5. THE Monthly_Summary SHALL be accessible from the main App view via a clearly labelled navigation control.

---

### Requirement 10: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can quickly find and compare entries.

#### Acceptance Criteria

1. THE App SHALL provide a Sort_Control that allows the user to sort the Transaction_List by amount (ascending or descending) or by category (alphabetical A–Z or Z–A).
2. WHEN the user selects a sort option, THE Transaction_List SHALL reorder immediately without a page reload.
3. THE sort order SHALL be applied consistently to all transactions currently displayed, including any active filter.
4. THE default sort order SHALL be the order in which transactions were added (insertion order).
5. THE sort preference SHALL NOT be persisted to Storage; it SHALL reset to insertion order on page reload.

---

### Requirement 11: Spending Limit Highlights

**User Story:** As a user, I want to set a spending limit per category and see when I have exceeded it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL allow the user to set a Spending_Limit (a positive monetary amount) for each Category, including Custom_Categories.
2. WHEN the cumulative total for a Category meets or exceeds its Spending_Limit, THE App SHALL visually highlight all transactions in that Category within the Transaction_List (e.g., with a distinct background color or icon).
3. WHEN the cumulative total for a Category meets or exceeds its Spending_Limit, THE App SHALL display a visible warning indicator for that Category (e.g., in the Pie_Chart legend or a dedicated summary area).
4. WHEN a transaction is added or deleted, THE App SHALL re-evaluate all Spending_Limits and update highlights immediately.
5. Spending_Limits SHALL be persisted to Storage so they survive page reloads.
6. IF the user sets a Spending_Limit that is not a positive number, THEN THE Validator SHALL display an inline error and prevent the limit from being saved.

---

### Requirement 12: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a Theme toggle control that switches the UI between a light Theme and a dark Theme.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme immediately across all UI components without a page reload.
3. THE selected Theme SHALL be persisted to Storage so that the App loads with the user's last chosen Theme on subsequent visits.
4. IF no Theme preference is stored, THE App SHALL default to the user's operating-system preference (via the `prefers-color-scheme` media query).
5. THE dark Theme SHALL maintain sufficient color contrast for all text and interactive elements to meet WCAG AA contrast requirements.
