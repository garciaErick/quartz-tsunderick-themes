## Contributing Workflow

All changes go through **Pull Requests** — never commit directly to `main`. Your personal branch (`robomario`, `tsunderick`, `mean-bean`, `azva01`, etc.) is your workspace. Here's the full contribution lifecycle:

### Step 1: Day-to-Day — Keep Your Branch Synced with main

While you're working on your branch, `main` keeps moving forward as other contributors merge their PRs. You should sync **regularly** (daily or at the start of each work session) so your branch doesn't drift too far from `main`.

Use the **reconcile script** — it preserves all your work (both committed and uncommitted) while pulling in the latest `main`:

```bash
# From your branch (e.g., robomario, tsunderick, etc.)
./scripts/github-workflows/sync-with-main-and-reconcile-changes.sh
```

**What it does step-by-step:**

1. Stashes any uncommitted changes temporarily (tracked and untracked files)
2. Rebases your local commits onto the latest `main` — your commit history is preserved
3. Restores your stashed changes and auto-commits them
4. Pushes everything to your remote branch

**When to use this:**

- ✅ You have work in progress you want to keep
- ✅ Start-of-day sync to pull in changes your teammates merged
- ✅ You want to commit and push your current changes alongside syncing
- ❌ Your changes aren't ready to be committed yet
- ❌ You have merge conflicts you're not ready to resolve

### Step 2: When Your Work Is Ready — Create a Pull Request

Once your feature or fix is complete and tested on your branch, it's time to contribute it back to `main`. See the full guide at **[How to Create a Pull Request](docs/how-to/3-create-a-pull-request-pr.md)** — here's the summary:

1. **Sync with main first** using the [reconcile script](./scripts/github-workflows/sync-with-main-and-reconcile-changes.sh) from Step 1 to make sure your branch is up-to-date
2. Go to [GitHub → indie-seishun](https://github.com/Indie-Seishun/indie-seishun) — you should see a **"Compare & pull request"** button
3. Verify the direction:
   - **Base:** `main` ← the target
   - **Compare:** `<your-branch>` ← your work
4. Title your PR with the issue number and summary: `[ISSUE-123] - Add Health System with HUD display`
5. Write a brief description of what your changes do and why
6. Click **"Create pull request"**

**After review, if changes are requested:**

```bash
# Make the requested changes in your code, then:
git add .
git commit -m "Address review feedback: fix X, Y, Z"
git push origin <your-branch>
```

The PR will automatically update with your new commit. No need to close and reopen anything.

> **No local dev environment?** If you only need to add or replace asset files (like sprites), you can do it entirely from the GitHub website — no Git or Godot required. See **[Upload a file via GitHub Web](docs/how-to/5-upload-file-via-github-web.md)** for the step-by-step guide.

### Step 3: After Your PR Is Merged — Reset Your Branch

Once your PR is approved and merged into `main`, your branch still contains the old commits that are now also in `main`. This is the right time to **nuclear reset** your branch so it's clean and identical to `main` before you start your next feature:

```bash
./scripts/github-workflows/sync-with-main-NUCLEAR.sh
```

**What it does step-by-step:**

1. Stashes any uncommitted changes (recoverable via `git stash pop stash@{0}`)
2. Shows you which local commits will be deleted and asks for confirmation
3. **Permanently deletes** all local commits on your branch
4. Resets your branch (both local AND remote) to exactly match `main`
5. Force pushes the reset to your remote branch

**When to use this:**

- ✅ Your PR was just merged — reset to a clean slate for your next feature
- ✅ You want to start fresh from `main` and discard experimental work
- ✅ Your branch is in a broken state and you want to reset
- ❌ You have uncommitted work you want to keep (use `git stash` first or use the reconcile script instead)
- ❌ You have local commits that haven't been merged into `main` yet (they'll be **permanently destroyed**)

> ⚠️ **This is destructive.** All commits unique to your branch are permanently deleted. The script shows you exactly which commits will be lost and asks you to confirm before proceeding. Uncommitted changes are stashed and recoverable.

📖 For detailed testing scenarios and edge cases, see **[Sync with main guide](docs/how-to/4-sync-with-main-guide.md)**
