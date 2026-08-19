# Git Workflow Scripts Testing Guide

We have two automation scripts to handle our daily Git workflow from the runbook:

## TOC

<!-- mtoc-start -->

* [🔥 `sync-with-main-NUCLEAR.sh` - The Nuclear Option](#-sync-with-main-nuclearsh---the-nuclear-option)
* [🔄 `sync-with-main-and-reconcile-changes.sh` - The Safe Option  ](#-sync-with-main-and-reconcile-changessh---the-safe-option--)
* [🧪 Test Cases](#-test-cases)
  * [Test Case 1: sync-discard.sh with uncommitted changes](#test-case-1-sync-discardsh-with-uncommitted-changes)
  * [Test Case 2: sync-discard.sh with local commits (DESTRUCTIVE)](#test-case-2-sync-discardsh-with-local-commits-destructive)
  * [Test Case 3: reconcile-changes.sh with simple changes](#test-case-3-reconcile-changessh-with-simple-changes)
  * [Test Case 4: reconcile-changes.sh with local commits](#test-case-4-reconcile-changessh-with-local-commits)
  * [Test Case 5: Stash recovery](#test-case-5-stash-recovery)

<!-- mtoc-end -->

## 🔥 [`sync-with-main-NUCLEAR.sh`](../../scripts/github-workflows/sync-with-main-NUCLEAR.sh) - The Nuclear Option

**What it does:**
* Completely discards your local work and syncs your branch with main
* Resets both local and remote branches to match main exactly
* Auto-detects your current branch and asks for confirmation

**When to use:**
* You want to start fresh from main
* Your local changes are experimental/throwaway
* You're switching tasks and don't need current work
* You made a mess and want to reset

**When NOT to use:**
* You have uncommitted work you want to keep
* You have local commits that aren't pushed/merged yet
* You're in the middle of working on a feature

## 🔄 [`sync-with-main-and-reconcile-changes.sh`](../../scripts/github-workflows/sync-with-main-and-reconcile-changes.sh) - The Safe Option  

**What it does:**
* Preserves your work, syncs with main, then commits your changes
* Auto-detects your current branch and asks for confirmation
* Handles both committed and uncommitted work safely

**When to use:**
* You have work in progress you want to keep
* You want to commit and push your current changes
* Daily sync while preserving your progress

**When NOT to use:**
* Your changes aren't ready to be committed
* You want to discard current work
* You have merge conflicts you're not ready to resolve

---

## 🧪 Test Cases

Copy and paste these commands to test each scenario:

### Test Case 1: sync-discard.sh with uncommitted changes

```bash
# Setup: Create some uncommitted work
echo "Test change $(date)" >> fileForTestingGitWorkflows.txt
echo "Added test content - this should be stashed and discarded"

# Run the script
./scripts/git-workflows/sync-discard.sh

# Verify results
git status  # Should show "working tree clean"
git stash list  # Should show your auto-stash
echo "✅ Test 1 complete - check that changes are gone but stashed"
```

### Test Case 2: sync-discard.sh with local commits (DESTRUCTIVE)

```bash
# Setup: Create a local commit
echo "Local commit test $(date)" >> fileForTestingGitWorkflows.txt
git add fileForTestingGitWorkflows.txt
git commit -m "TEST: Local commit that will be destroyed"
echo "Created local commit that should trigger warning"

# Run the script (will ask for confirmation)
./scripts/git-workflows/sync-discard.sh
# Type 'n' to abort and test the safety mechanism
# Then run again and type 'y' to test the destructive path

# Verify results
git log --oneline -3  # Local commit should be gone if you typed 'y'
echo "✅ Test 2 complete - local commits handled as expected"
```

### Test Case 3: reconcile-changes.sh with simple changes

```bash
# Setup: Create some work to preserve
echo "Reconcile test $(date)" >> fileForTestingGitWorkflows.txt
echo "More test content for reconcile" >> fileForTestingGitWorkflows.txt
echo "Added test code that should be committed and rebased onto latest main"

# Run the script
./scripts/git-workflows/reconcile-changes.sh "TEST: Added reconcile test code"

# Verify results
git log --oneline -1  # Should show your new commit
git log --oneline -5  # Should show your commit on top of latest main commits
git status  # Should be clean
echo "✅ Test 3 complete - changes were rebased onto main and pushed"
```

### Test Case 4: reconcile-changes.sh with local commits

```bash
# Setup: Create a local commit first
echo "Pre-commit test $(date)" >> fileForTestingGitWorkflows.txt
git add fileForTestingGitWorkflows.txt
git commit -m "TEST: Local commit before reconcile"

# Add more uncommitted work
echo "Additional work $(date)" >> fileForTestingGitWorkflows.txt
echo "Created local commit + uncommitted changes"

# Run the script
./scripts/git-workflows/reconcile-changes.sh "TEST: Additional work after local commit"

# Verify results
git log --oneline -3  # Should show both commits rebased onto main
echo "✅ Test 4 complete - local commits preserved and new work committed"
```

### Test Case 5: Stash recovery

```bash
# This test assumes you have a stash from previous tests
git stash list  # Check what stashes exist

# Pick a stash ID from the list (e.g., stash@{0})
git stash show stash@{0}  # Preview what's in the stash
git stash pop stash@{0}   # Restore the stashed work

# Verify results
git status  # Should show the restored changes as uncommitted
echo "✅ Test 5 complete - stash recovery works"
```
