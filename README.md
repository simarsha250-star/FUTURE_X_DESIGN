# FUTURE X DESIGN OMS (FXD OMS)

Order Management System for FUTURE X DESIGN. Migrated and rebranded from Venus OMS; functionality is unchanged.

**Stack:** React 19 + Vite 8, Tailwind CSS 3, React Router 7, Firebase (Authentication + Firestore), PWA via vite-plugin-pwa. There is no custom backend server; the browser talks to Firebase directly.

## 1. Prerequisites
- Node.js 20+ and npm
- A Firebase project with **Email/Password** sign-in enabled and a **Firestore** database

## 2. Configure
```bash
cp .env.example .env
# fill in the VITE_FIREBASE_* values from
# Firebase Console > Project settings > Your apps > Web app
```
> **Which database am I using?** The values in `.env` decide which Firebase project the app uses. Using the original Venus project's values makes this app read **and write** the original business data. For an independent deployment, create a new Firebase project (see section 5).

## 3. Run
```bash
npm install
npm run dev        # development server
npm run build      # production build -> dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```
Set the same `VITE_FIREBASE_*` variables in your hosting provider's build settings when deploying `dist/`. Configure SPA fallback (all paths -> `index.html`) because the app uses client-side routing.

## 4. Routes
`/` login, `/dashboard`, `/orders`, `/customers`, `/whatsapp`, `/reports`, `/google-sheet`, `/notifications`, `/inventory`, `/expenses`, `/offers`, `/delivery`, `/end-day`, `/settings`. Unknown paths redirect to `/dashboard`.
`src/pages/Enquiries.jsx` and `src/pages/Analytics.jsx` exist but were never routed in the original; this was preserved as-is (see MIGRATION-REPORT.md).

## 5. Firestore data model (discovered from the code)
Collections: `orders`, `customers`, `inventory`, `stockMovements`, `expenses`, `offers`, `deliveries`, `notifications`, `enquiries`, `endDayReports`, `users`; documents `settings/shop` and `settings/prices`.

To create an independent database: create a new Firebase project, enable Email/Password auth, create a Firestore database, add your users in Firebase Authentication, and write Firestore security rules. Security rules were **not** part of the uploaded project, so they must be authored/copied from the original Firebase project by its owner (Firebase CLI: `firebase firestore:rules`). To bring existing data across, use a Firestore managed export/import from a verified backup; do this only with the owner's approval.

## 6. Browser-stored settings (per device)
`localStorage` keys: `dark`, `wa_key`, `sheet_url`, `sheet_last_sync`, `wa_templates`, `wa_history`.

## 7. Branding notes
No official FUTURE X DESIGN logo was supplied. The UI uses a text wordmark. `public/favicon.svg` and the PWA icons are still template/placeholder assets; see Remaining Manual Steps in MIGRATION-REPORT.md.
