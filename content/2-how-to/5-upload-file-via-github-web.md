# Uploading a New Version of a File via GitHub Web

This guide covers how to manage files directly from the GitHub website — no local git setup or Godot editor required. You'll learn how to:

- Create a new directory (folder)
- Upload or replace an existing file (like a character asset sprite)
- Create a PR to get your changes into `main`

## When to Use This

Use this method when you need to add or update asset files (e.g., a new character sprite, an updated sprite sheet) and you don't have the local dev environment set up. The general workflow is:

1. **Create** a new directory (if needed)
2. **Delete** the old file on your branch (if replacing)
3. **Upload** the new file(s) to the correct location
4. **Create a PR** from your branch to `main`

> [!NOTE]
> You can only edit files on GitHub if you have **Write** access to the repository. Ask a maintainer if you're unsure.

## TOC
<!-- mtoc-start -->

- [Part 1: Create a New Directory](#part-1-create-a-new-directory)
  - [Example: Adding a new character folder](#example-adding-a-new-character-folder)
- [Part 2: Delete the Old File](#part-2-delete-the-old-file)
- [Part 3: Upload the New File](#part-3-upload-the-new-file)
- [Part 4: Create a Pull Request](#part-4-create-a-pull-request)
- [Troubleshooting](#troubleshooting)
  - ["I don't see the 'Add file' button"](#i-dont-see-the-add-file-button)
  - ["I deleted the wrong file"](#i-deleted-the-wrong-file)
  - ["The PR says there are conflicts"](#the-pr-says-there-are-conflicts)

<!-- mtoc-end -->

## Part 1: Create a New Directory

GitHub doesn't have a "create folder" button — **you create a directory by creating a file inside it**. GitHub will automatically create any missing folders in the file path.

### Example: Adding a new character folder

Let's say we want to add a new character called `gatoFelix` under `game/assets/characters/` on the `azva01` branch.

1. Open the repository on GitHub and navigate to your branch:
   <https://github.com/Indie-Seishun/indie-seishun/tree/azva01>
2. Navigate to the parent folder where you want the new directory. For example:
   <https://github.com/Indie-Seishun/indie-seishun/tree/azva01/game/assets/characters>
3. Click the **"Add file"** button near the top-right, then select **"Create new file"**
4. In the file name field, type the full path including the new folder and a placeholder file. For example:
   `gatoFelix/.gitkeep`
5. GitHub will show the path with the new folder highlighted — you can see it's creating `gatoFelix/` as a new directory
6. In the commit panel:
   - **Commit message** — write something like `Add gatoFelix character directory`
   - **Commit directly to the `azva01` branch** — make sure this is selected
7. Click **Commit changes**

> [!NOTE]
> The `.gitkeep` file is an empty placeholder file — it's a common convention to force Git to track an otherwise empty directory. You can delete it later once you upload actual files into the folder. Alternatively, skip this step entirely if you're about to [upload files](#part-3-upload-the-new-file) — uploading into a new folder name will create the directory automatically.

> [!TIP]
> You can also use **"Upload files"** instead of "Create new file" to create a directory. When you drag a file into the upload area, type a new folder name in the path field (e.g., `gatoFelix/sprite.png`) and GitHub will create both the folder and the file in one step.

## Part 2: Delete the Old File

Let's say we want to replace a sprite inside `game/assets/characters/` on the `azva01` branch.

1. Open the repository on GitHub and navigate to your branch:
   <https://github.com/Indie-Seishun/indie-seishun/tree/azva01>
2. Browse to the file you want to replace. For example, if you're updating a character asset, navigate into:
   `game/assets/characters/`
3. Click on the file you want to replace
4. Click the **trash can icon** (🗑️) in the top-right corner of the file viewer
5. GitHub will show a commit panel at the bottom of the page:
   - **Commit message** — leave the default or write something clear like `Update perraRoja sprite sheet`
   - **Commit directly to the `azva01` branch** — make sure this option is selected (not "Create a new branch")
6. Click **Commit changes**

> [!WARNING]
> Double-check that you're on the correct branch (`azva01`) **before** deleting. Deleting a file on `main` directly is not allowed — all changes must go through a PR.

## Part 3: Upload the New File

Now that the old file is gone, upload the replacement:

1. Make sure you're still on your branch:
   <https://github.com/Indie-Seishun/indie-seishun/tree/azva01>
2. Navigate to the **folder** where the old file was located. For example:
   <https://github.com/Indie-Seishun/indie-seishun/tree/azva01/game/assets/characters>
3. Click the **"Add file"** button near the top-right of the file listing, then select **"Upload files"**
4. Drag and drop your new file(s) into the upload area (or click to browse)
5. GitHub will show a commit panel:
   - **Commit message** — write something clear like `Add updated perraRoja sprite sheet`
   - **Commit directly to the `azva01` branch** — make sure this is selected
6. Click **Commit changes**

> [!TIP]
> You can upload multiple files at once. If your asset update includes several files (e.g., a sprite sheet + an import file), drag them all in together in a single commit.

## Part 4: Create a Pull Request

Once your branch has the updated file(s), you need to create a Pull Request to get the changes into `main`.

See the full PR guide here: **[Guide for Creating a Pull Request](./3-create-a-pull-request-pr.md)**

Quick summary:

1. Open <https://github.com/Indie-Seishun/indie-seishun>
2. Click the **"Compare & pull request"** button
3. Make sure:
   - **Base:** `main`
   - **Compare:** `azva01` (or your branch)
4. Add a title like `[ISSUE-123] - Update perraRoja character sprite`
5. Add a brief description of what changed
6. Click **"Create pull request"**

---

## Troubleshooting

### "I don't see the 'Add file' button"

- Make sure you're logged into GitHub with an account that has **Write** access to the repository
- Check that you're viewing the correct branch (look at the branch dropdown near the top-left)

### "I deleted the wrong file"

- Don't panic! Go to your branch's commit history and you can revert the commit
- As long as you haven't merged the PR yet, nothing is permanent

### "The PR says there are conflicts"

- This means someone else changed the same file on `main` while you were working
- Ask a maintainer for help resolving the conflict, or follow the [Sync with Main guide](./4-sync-with-main-guide.md)
