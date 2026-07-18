# Publishing under github.com/OrcaCMS

1. Create the repo **in the org** (not a personal account):

   ```bash
   gh auth login
   cd /path/to/orca-developer-block   # already has commit(s)
   gh repo create OrcaCMS/orca-developer-block --public --source=. --remote=origin --push
   ```

2. GitHub → repo **Settings → General → Template repository** → enable.

3. Optional description: “Starter for OrcaCMS sandboxed React developer blocks”.

Users: `pnpm install && pnpm dev`, then `pnpm zip` before uploading to Orca.
