# Projects, Files, and Folders

This is the "how do I actually do things in mcbCode" lesson. You'll learn how to move around, create folders and files, rename and delete them, open the editor, and upload images. By the end you'll have built the folder structure the rest of the course uses.

## Moving around

Click a **folder** to open it. Click the **`..`** row at the top of a folder to go up one level. The **path bar** above the file list also shows where you are, and clicking any part of it jumps back to that level.

The page's address updates as you navigate, so a URL like this points directly at a folder:

```
https://mcbcode.com/project/YOUR-SHARE-CODE/BP/functions
```

That means your browser's back and forward buttons work as you'd expect, and you can copy the address to send someone straight to a folder.

## Where things can be created

mcbCode has a few placement rules. They exist to stop beginners from putting files in spots where Minecraft would never find them.

- **The project root can only hold two folders**, which are normally BP and RP. If you try to create a third, mcbCode explains the limit and suggests creating it inside BP or RP instead.
- **You can't create files at the root.** The `+ File`, `+ Image`, and `+ Structure` options only appear once you're inside a folder.
- **Some files can only go in certain places.** For example, `manifest.json` is only allowed at the top of BP or RP. If you try to put it somewhere else, mcbCode shows a warning explaining where it belongs.

<!-- VERIFY: mcbCode loads extra placement rules from /project/guardrails.json, which wasn't included in the supplied code. Only the manifest.json rule is confirmed. If other extensions (like .mcfunction) have rules, list them here. -->

If a warning like that pops up, it's not an error. It's telling you the file is in the wrong folder.

## The Add Files menu

Inside BP or RP, the **+ Add Files** button opens a small menu:

| Option | What it does |
| --- | --- |
| **+ Folder** | Creates a new folder in the current location. |
| **+ File** | Creates a new text file. You type the full name including extension. |
| **+ Image** | Uploads a PNG from your computer. |
| **+ Structure** | Uploads a `.mcstructure` file. |

### Creating a folder

1. Click **+ Add Files**, then **+ Folder**.
2. Type a name such as `functions`.
3. Confirm.

### Creating a file

1. Click **+ Add Files**, then **+ File**.
2. Type the complete name, such as `hello.mcfunction`.
3. Confirm.

> **Warning:** The name must include the extension. mcbCode's hint says the same thing: something like `.mcfunction`, `.json`, or `.png`. A file named `hello` with no extension is just a file named `hello`, and Minecraft won't know what to do with it.

## Renaming and deleting

Each row has two small buttons:

- **ren** renames a file or folder. When the rename box opens, the part of the name before the extension is pre-selected, so you can type a new name without wiping out `.json`.
- **del** deletes it after a confirmation. Treat deleting as permanent.

For two special files, mcbCode adds an extra warning before you delete: **`manifest.json`** and **`pack_icon.png`**. Both are important for a pack to work properly, so it wants to make sure you meant it.

## Opening and editing files

Click a text file to open it in mcbCode's editor. It has syntax highlighting for JSON, JavaScript, and mcfunction, plus Save, Undo, Redo, and a toggle for wrapping long lines, and a button to close. If you close the editor with unsaved changes, it asks before throwing them away.

Some details worth knowing:

- **You must be logged in** to view file contents. If you're not, the editor is blocked.
- **Only the owner and collaborators can edit.** Anyone else who is logged in gets a read-only view.
- **The editor doesn't check your JSON.** It saves whatever text you've typed, so a missing comma is saved just like a correct file. Lesson [4.1](../04-customizing-minecraft/01-json-in-addons.md) and [5.3](../05-testing-and-troubleshooting/03-fixing-json-and-common-mistakes.md) cover how to catch these.
- **`manifest.json` opens in a special visual editor** instead. [Lesson 2.3](03-your-first-manifest.md) covers it.

## Images

Click a `.png` file to expand a preview underneath it. Files tagged **image** are PNGs. Files tagged **3d** are `.mcstructure` or `.geo.json` files, and clicking one offers an **Open Beacon Editor** button (models also get a **View as JSON** option).

### The pack icon

When you open BP or RP, and there's no `pack_icon.png` inside yet, mcbCode shows a faded placeholder row that says **Add a pack_icon.png**. Click it, choose a PNG, and mcbCode puts a copy in *both* BP and RP. The pack icon is the thumbnail Minecraft shows next to your pack in menus. It's not strictly required for a pack to load, but packs look unfinished without one.

## Timestamps

The "updated" time next to each item is relative ("3 hours ago"). Hover over it to see the exact date and time. For folders, it shows the most recent change to anything inside.

## Exercise: build the skeleton

Create this structure in your **My First Addon** project. Work inside BP or RP for each item, using **+ Folder**.

```
BP/
  functions/
    my_addon/
  items/
RP/
  textures/
    items/
```

Tips: to make `my_addon`, open `functions` first. To make `items` under `textures`, open `textures` first. Use the `..` row or the path bar to move between folders.

Don't create any files yet. You'll fill these in as the course goes on.

## Recap

- Click folders to open, `..` to go up, and the path bar to jump back. The address bar follows along.
- The root holds only BP and RP. Files and images can only be added inside a folder.
- Use **ren** and **del** on any row. Deleting `manifest.json` or `pack_icon.png` gets an extra warning.
- The editor saves what you type without validating it, and only owners and collaborators can edit.

**Previous:** [Creating a Project in mcbCode](01-creating-a-project-in-mcbcode.md) | **Next:** [Writing Your First Manifest](03-your-first-manifest.md)
