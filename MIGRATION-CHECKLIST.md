# Migration Checklist: Venus OMS -> FUTURE X DESIGN OMS

Status legend: Inspected / Updated / Tested successfully / Test blocked / Regression detected.
**No runtime tests could be executed** (see MIGRATION-REPORT.md, Testing), so nothing below is marked "Tested successfully". "Updated" items were verified only by syntax parse, import resolution and a line-level diff against the original.
Inspection depth: files were searched and sampled (routes, Firestore calls, auth, print/WhatsApp/export code, branding strings); not every line of every page was read.

| # | Feature / module | Source | Firestore / external | Behavior (as found) | Change made | Verification | Status |
|---|---|---|---|---|---|---|---|
| 1 | Login | `pages/Login.jsx` | Firebase Auth email/password | Email + password sign-in, show/hide password, error banner | Heading + footer text rebranded | Parse + diff | Updated; test blocked |
| 2 | Route protection | `App.jsx` | Firebase Auth state | `ProtectedRoute` redirects unauthenticated users to `/`; unknown paths go to `/dashboard` | None | Diff (file unchanged) | Inspected; test blocked |
| 3 | Dashboard + sidebar nav | `pages/Dashboard.jsx` | `orders` | Stats, due-today/overdue alerts, quick search, 13-item sidebar, dark-mode toggle, logout | Sidebar brand text | Parse + diff | Updated; test blocked |
| 4 | Orders | `pages/Orders.jsx` | `orders` (CRUD) | Calendar view, search/filter, complete + WhatsApp message, delete, printable invoice | Invoice header and WhatsApp sign-off text | Parse + diff | Updated; test blocked |
| 5 | Customers | `pages/Customers.jsx` | `customers`, `orders` | Customer records, wa.me links | None | Diff | Inspected; test blocked |
| 6 | WhatsApp templates | `pages/WhatsApp.jsx` | `orders`; localStorage `wa_templates`, `wa_history` | Template editor/sender via wa.me | Five default templates' sign-off text | Parse + diff | Updated; test blocked |
| 7 | Reports | `pages/Reports.jsx` | `orders` | Date-range metrics, CSV export, print report | Print header; CSV filename `fxd-report-*` | Parse + diff | Updated; test blocked |
| 8 | Google Sheet sync | `pages/GoogleSheet.jsx` | `orders`; Apps Script URL; localStorage `sheet_url`, `sheet_last_sync` | Push/pull orders to a user-supplied Apps Script endpoint, CSV export | CSV filename `fxd-orders-*` | Parse + diff | Updated; test blocked |
| 9 | Notifications | `pages/Notifications.jsx` | `notifications`, `orders`; Browser Notification API | In-app + desktop alerts | Notification titles/test text | Parse + diff | Updated; test blocked |
| 10 | Inventory | `pages/Inventory.jsx` | `inventory`, `stockMovements` | Stock items and movements | None | Diff | Inspected; test blocked |
| 11 | Expenses | `pages/Expenses.jsx` | `expenses` | Expense CRUD, monthly CSV export | CSV filename `fxd-expenses-*` | Parse + diff | Updated; test blocked |
| 12 | Offers | `pages/Offers.jsx` | `offers` | Offer CRUD | None | Diff | Inspected; test blocked |
| 13 | Delivery | `pages/Delivery.jsx` | `deliveries`, `orders` | Delivery tracking, WhatsApp notices | Message sign-off text | Parse + diff | Updated; test blocked |
| 14 | End Day | `pages/EndDay.jsx` | `orders`, `endDayReports` | Daily summary, save report, print | Print header | Parse + diff | Updated; test blocked |
| 15 | Settings | `pages/Settings.jsx` | `settings/shop`, `settings/prices`, `users`; localStorage `dark`, `wa_key`, `sheet_url` | Shop info, price list, user roles (admin/cashier), theme, integrations, JSON backup export | Default shop name; backup filename `fxd-backup-*` | Parse + diff | Updated; test blocked |
| 16 | Enquiries (**not routed in original**) | `pages/Enquiries.jsx` | `enquiries`, `orders` | Enquiry CRUD, convert to order | WhatsApp sign-off text | Parse + diff | Updated; test blocked |
| 17 | Analytics (**not routed in original**) | `pages/Analytics.jsx` | `orders`, `customers`, `expenses` | Analytics view, JSON export | Export filename `fxd-analytics-*` | Parse + diff | Updated; test blocked |
| 18 | Firebase connection | `src/firebase.js` | Firebase Auth + Firestore | Hard-coded project config | **Moved to `VITE_FIREBASE_*` env vars** (needed for safe config; see report) | Parse + diff | Updated; test blocked |
| 19 | PWA manifest | `vite.config.js` | n/a | Name, short name, description, icons, Firestore NetworkFirst cache | Name/short name/description | Diff | Updated; test blocked |
| 20 | Browser title / metadata | `index.html`, `package.json` | n/a | Title and package name | Both updated | Diff | Updated; test blocked |
| 21 | Dark mode, styling, responsive layout | `index.css`, `tailwind.config.js`, pages | n/a | Tailwind navy/gold theme, class-based dark mode | None | Diff | Inspected; test blocked |
| 22 | Roles/permissions | `Settings.jsx`, `Dashboard.jsx` | `users` | Roles stored in `users`; sidebar label is hard-coded "Admin"; no client-side role gating found by search. Any enforcement would live in Firestore rules, which were not provided | None | Search | Inspected; **needs owner confirmation** |
