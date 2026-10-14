# Migration Report: Venus OMS -> FUTURE X DESIGN OMS

## A. Project audit
**Stack (from package.json / source):** React 19.2, Vite 8, Tailwind 3.4, React Router 7, lucide-react, Firebase 12 (Auth + Firestore), vite-plugin-pwa, oxlint. JavaScript (JSX), no TypeScript, no custom backend, no automated tests.
**Structure:** `src/main.jsx`, `src/App.jsx` (routes + auth guard), `src/firebase.js`, `src/index.css`, 16 files in `src/pages/`, `public/` (favicon.svg, icons.svg), Vite/Tailwind/PostCSS configs.
**Persistence:** Firestore collections `orders, customers, inventory, stockMovements, expenses, offers, deliveries, notifications, enquiries, endDayReports, users` and docs `settings/shop`, `settings/prices`. Browser `localStorage` for theme, WhatsApp key/templates/history, Sheet URL.
**Integrations:** Firebase Auth (email/password); WhatsApp via `wa.me` links; user-supplied Google Apps Script URL; browser Notification API; Firestore runtime cache in the service worker.
**Excluded from copy:** `node_modules/`, `dist/` (stale Venus-branded build output; regenerate with `npm run build`).
**Not provided / not inspected:** Firestore security rules, Firebase Auth user list, any live data, and the larger zip in the uploads folder (only `venus-oms.zip` was used).

## B. Changes made
**Branding (user-visible):** browser title; login heading and footer; sidebar brand; invoice, End Day and Report print headers; default shop name in Settings; all WhatsApp/customer message sign-offs (Orders, Enquiries, Delivery, WhatsApp templates); notification titles; PWA name, short name and description.
**Metadata:** `package.json` and `package-lock.json` name -> `future-x-design-oms`; export filenames `venus-*` -> `fxd-*`.
**Configuration (the one structural change):** `src/firebase.js` previously contained the Venus Firebase project config hard-coded. It now reads `VITE_FIREBASE_*` variables; `.env.example` (blank values) was added and `.env*` was added to `.gitignore`. Reason: the brief forbids committing credentials and forbids silently pointing at a database. Logic is otherwise identical.
**Deliberately NOT changed:** Firestore data, schemas and collection names; routes; business logic; stack; unrouted pages; PWA icon list.

## C. Identifiers / references intentionally left alone
Existing Firestore records (including any saved shop name in `settings/shop`) are data and were not touched. The saved shop name and any saved WhatsApp templates in a user's `localStorage` will keep the old text until edited in Settings / WhatsApp. If you reuse the Venus Firebase project, `settings/shop` will still show "Venus Studio" until updated in the app.

## D. Testing, what was and was not done
| Check | Result |
|---|---|
| Syntax parse of all 22 JS/JSX files (@babel/parser, JSX) | **Passed**, 0 errors |
| Relative imports resolve | **Passed**, 0 unresolved |
| Third-party imports declared in package.json | **Passed**, none missing |
| Diff vs original shows only intended changes | **Passed** |
| `vite build` | **Blocked**: bundled `node_modules` holds Windows-only native binaries (rolldown); no network to reinstall |
| `oxlint` | **Blocked**: same reason |
| `npm install` | **Blocked**: network disabled in this environment |
| Dev server start, login/logout, CRUD, role behavior, search/sort, exports, print, uploads, WhatsApp/Sheet integrations, Firestore connectivity | **Blocked / not run**: need a browser, `npm install`, and a Firebase project |

Because the build never ran, **I cannot claim the app builds or runs**. The changes are small string edits plus the env-var config, so risk is low, but run the commands in section 3 of the README before relying on it.

## E. Issues found in the original (preserved, not fixed)
1. `Enquiries` and `Analytics` pages are not routed in `App.jsx`, so they are unreachable. Adding routes/sidebar items is a feature change; say the word and I'll do it separately.
2. `vite.config.js` lists `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico`, `apple-touch-icon.png`, `masked-icon.svg`, none of which exist in `public/`. PWA install will lack icons.
3. `public/favicon.svg` appears to be the Vite template logo, not Venus or FXD artwork.
4. Role labels are not enforced client-side (sidebar always shows "Admin"). If enforcement matters, it must be in Firestore rules.
5. The original shipped the Firebase web config in source. Firebase web keys are identifiers rather than secrets, but protection depends entirely on Firestore/Auth rules, so review them.

## F. Remaining manual steps / approvals needed
1. **Decide the database:** reuse the Venus Firebase project (shared data; this app can modify it) or create a new Firebase project. I did not choose for you. Back up Firestore (managed export) before connecting this app to any project holding real data.
2. Fill `.env`, then `npm install`, `npm run build`, `npm run lint`, and run through the checklist in a browser.
3. Provide an official FUTURE X DESIGN logo, favicon and 192/512px PWA icons (none were supplied; I did not invent one).
4. Create or copy Firestore security rules and Auth users for the chosen project.
5. Confirm whether Enquiries/Analytics should be exposed.
