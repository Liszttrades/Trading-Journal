# Trade Notebook — private cloud edition

Email/password sign-in with a private cloud journal on GitHub Pages and your own Supabase project. Trades, notes, screenshots, dropdown settings, backtests and the P&L calendar sync across devices using the same account. Follow SETUP.md before replacing your live website.

Saves go online after Save succeeds. Visible devices check for changes every 30 seconds and on focus; refresh waits until edit dialogs are closed. Sync now forces a refresh. Internet is required; there is no offline queue. Concurrent edits produce a conflict error instead of overwriting newer changes. Copy unsaved notes, close the form, sync and retry.

Each account owns a private JSON journal. Database policies and the save function derive the owner from the authenticated session. The project administrator can access the database; this is not end-to-end encryption. Sign out on shared devices.

Screenshots are included as base64 in the database row to make saves/restores atomic. This edition is for small personal journals: maximum 60 MB per account, no separate Storage bucket. Compress screenshots. Full journal downloads use database/egress quota; unchanged automatic checks fetch only the revision. Larger journals should move images to private object storage and trades to separate rows.

The old browser journal is not deleted or automatically uploaded. Export its backup before deployment, then restore after signing in. Restoring replaces the signed-in account's cloud journal on every device; export a backup first. Backups remain compatible with the Pages edition.

Editable files include app.js, storage.js, cloud.js, config.js, index.html, style.css, calendar.js, model.js and validation.js. No build step. Supabase SDK 2.58.0 loads from jsDelivr.

Validation: JavaScript syntax and simulated cloud adapter checks. Real database isolation, email delivery and two-device browser testing require your Supabase project. This ZIP does not activate a live backend by itself.
