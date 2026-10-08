# Trade Notebook — GitHub Pages edition

A free, standalone trading journal. Editable HTML, CSS and JavaScript. No Node server, subscriptions, ChatGPT account, build step or external services are needed after publishing.

## Publish with your own GitHub account

1. Extract this ZIP.
2. On GitHub, create a **public** repository named `trade-notebook`. A public repository is needed for GitHub Pages on GitHub Free.
3. Choose **Add file → Upload files**. Upload the contents of this folder directly into the repository root. `index.html` must be at the root, not inside another folder. Do not upload the ZIP itself.
4. Commit the upload to `main`.
5. Open **Settings → Pages**. Under Build and deployment choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
6. Wait for deployment to finish. Pages will show your link, normally `https://YOUR-USERNAME.github.io/trade-notebook/`.
7. Bookmark the link in Chrome. Reloading works without keeping a terminal open.

You sign in to GitHub to manage the repository, but visitors do not need GitHub or ChatGPT sign-in to open the journal.

## Where your information goes

The website and source code are public. Your saved trades, notes and screenshots stay in **IndexedDB in the browser profile that created them**. The app never sends these records to GitHub or a server. Another visitor gets their own empty journal. Anyone with access to your browser profile can open your journal; it has no password or encryption.

There is **no automatic cloud sync**. Another computer, browser, private browsing window or different website address has separate storage. Keep the same URL and browser profile. Clearing site data, browser eviction or removing a profile can erase saved entries. Use **Export backup** regularly and store the downloaded JSON safely. It includes notes and screenshots. **Restore backup** replaces the current browser journal after confirmation.

Never upload backups, screenshots or the old local edition's `data` folder to your public repository. This package contains no personal trades.

## Existing local edition

Keep your old `data` folder backed up. Its `journal.json` is not the same format as a Pages backup: images are separate files. This edition starts empty and does not automatically import the local or ChatGPT-hosted journal. Keep those originals if you have existing records.

## Customize in VS Code

| File | What to edit |
| --- | --- |
| `style.css` | Charcoal colors, spacing, layout |
| `index.html` | Page structure, labels and navigation |
| `app.js` | Forms, dashboard, filters and chart |
| `model.js` | Default dropdowns and P&L/R calculations |
| `storage.js` | Browser saving, images and backups |
| `validation.js` | Field validation |

Use **Customize** in the website to change dropdowns without editing code. Updating defaults in code does not replace settings already saved in a browser. After code edits, upload changed files and commit; GitHub redeploys them. Open the GitHub Pages URL rather than double-clicking `index.html` (browser modules require HTTP/HTTPS).

## If something goes wrong

- A 404 after publishing usually means `index.html` is inside an extra folder or Pages is using the wrong branch/root.
- Blank styling usually means assets were not uploaded beside `index.html`.
- After a code update, hard refresh with Ctrl+Shift+R.
- Save errors can mean blocked/full browser storage. Export your journal before changing browser storage settings.
- Unsaved form text is lost when you reload. Saved entries survive ordinary reloads.
- The old localhost server requires its terminal to stay open. A reload normally should not stop it; diagnosing an unexpected shutdown needs the terminal error. This Pages edition removes that server dependency.

Official publishing guide: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## P&L calendar

The journal and backtest dashboards each include a monthly calendar with Monday-to-Sunday columns, daily net P&L and closed-trade counts, weekly totals and a monthly total. The pair filter applies to the calendar. Use the arrows or This month to navigate; click a day and then a trade to review or edit it. Results belong to their recorded closing date in the journal time zone. Weekly totals exclude adjacent-month days. Open trades are excluded. The new calendar does not change the database or backup format.

To update an existing GitHub Pages site, upload and replace all included code files in the same repository, including the new `calendar.js`. Keep the same website address and browser profile. Export a backup before updating; do not upload the backup.
