# Connect your cloud journal

1. Open your current journal and **Export backup** before updating it. Keep the JSON private; never upload it to GitHub.
2. Visit https://supabase.com/dashboard and sign in. Create a project in a **Free** organization, choose a region near you and set a strong database password. Keep this password private. Wait for provisioning.
3. Open **SQL Editor → New query**. Paste all of `database.sql` and run it once. Do not disable row level security or add public policies.
4. Find your **Project URL** and **publishable key** in the Connect dialog/API settings. Fill both values in `config.js`. A legacy public `anon` key is supported too. Never use `sb_secret_...`, `service_role`, a database password or an account password. The public key may be committed to GitHub; database rules protect records.
5. Under **Authentication → URL Configuration**, set Site URL and an allowed Redirect URL to `https://liszttrades.github.io/Trading-Journal/`. Keep email/password authentication enabled.
6. For you and a friend, start with **Authentication → Users → Add user → Create new user**. Create separate accounts with unique passwords and auto-confirm those directly-created users. These are journal accounts, not your GitHub/Supabase dashboard login. Your friend does not need dashboard access. Disable public new-user signups if only selected people should use this backend.
7. Public signup confirmation and password reset require configured **Authentication → SMTP settings**. Supabase's default email sender is limited and generally sends only to project team members. Configure an email provider's free allowance if desired; never put SMTP credentials in GitHub. Until configured, manage accounts and recovery in the dashboard.
8. Upload/replace the extracted code files at the root of your existing GitHub repository, including `cloud.js` and configured `config.js`. Keep Pages on main and / (root). Do not upload any personal backups or passwords.
9. After deployment, hard refresh, sign in and **Restore backup** from step 1. This replaces your account's cloud journal. Sign in with the same journal account on your phone. Your friend's separate account starts empty.

## Verify with your project

- Save a trade, screenshot and note on desktop. Sign in on phone, Sync now and verify all three plus calendar totals.
- Edit on phone and verify desktop updates after closing edit dialogs.
- A different account must see its own empty journal. Signed-out visitors must see only sign-in.
- Simultaneous edits on two devices must produce a conflict on the stale save.
- Authenticated account A querying owner B must return no rows; anonymous reads and save calls must fail. Test with real authenticated sessions; SQL Editor is an administrator and bypasses policies.
- Export a fresh cloud backup privately.

## Limits and troubleshooting

Supabase Free currently includes 500 MB database space and 5 GB egress. Free projects can pause after one week of inactivity; automatic backups are not included. Monitor usage, compress screenshots and export backups. This implementation caps each user's complete journal at 60 MB. It is not unlimited free storage.

Cloud setup not connected: fill config.js. Table/function not found: run database.sql in that same project. Invalid login: use a journal account from Authentication → Users. Email not arriving: configure SMTP or directly create confirmed personal users. Sync conflict: copy unsaved notes, close the form, Sync now and retry. Project paused: resume it in Supabase. Do not clear your browser data to fix a cloud connection error.

Official documentation:
https://supabase.com/pricing
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/getting-started/api-keys
https://supabase.com/docs/guides/auth/auth-smtp
