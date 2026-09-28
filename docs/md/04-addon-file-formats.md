# Addon File Formats Explained

Addons involve a bunch of file extensions that look unfamiliar at first: `.json`, `.mcfunction`, `.mcaddon`, `.mcpack`, `.geo.json`, and more. This lesson is a field guide. You don't have to memorize it, but you'll come back to it whenever you meet a file you don't recognize.

## The files you write

| Extension | What it is | Where it lives |
| --- | --- | --- |
| `.json` | Structured text. Manifests, items, blocks, entities, recipes, loot tables, and lots more. | BP and RP |
| `.mcfunction` | A list of commands, one per line. | BP, inside `functions/` |
| `.png` | An image. Textures and pack icons. | RP (and `pack_icon.png` in both) |
| `.lang` | Plain-text translations, such as the display name of an item. | RP, inside `texts/` |
| `.js` | JavaScript for the scripting API (optional, advanced). | BP, inside `scripts/` |
| `.geo.json` | A model file. This is JSON, but it describes a 3D shape. | RP, inside `models/` |
| `.ogg` | Sound files. | RP, inside `sounds/` |
| `.mcstructure` | A saved structure (a chunk of blocks you exported from the game). | BP, inside `structures/` |

The important thing to notice: almost everything is **plain text**. You can open a `.json` or `.mcfunction` file in any text editor and read it. The exceptions are the images, sounds, and `.mcstructure` files, which are binary.

## The files you share

When you package an addon for other people, you don't send a folder. You send a single file. There are a few of these, and they're all secretly the same trick.

| Extension | What's inside | Typical use |
| --- | --- | --- |
| `.mcpack` | One pack (a BP or an RP). | A functions-only addon, or a retexture. |
| `.mcaddon` | Two or more packs bundled together. | A full addon with both a BP and an RP. |
| `.mcworld` | A whole world save. | Sharing a world, sometimes with packs inside. |
| `.mctemplate` | A world template. | Sharing a starting world for others to reuse. |

Under the hood, `.mcpack` and `.mcaddon` files are just **zip archives with a different extension**. Minecraft recognizes the extension and knows to import the contents. This is why, if you ever need to peek inside one, renaming it to `.zip` lets you open it like any zip.

mcbCode does the packaging for you. When you export a project that has both a BP and an RP folder, you get a `.mcaddon`. If it has only one of them, you get a `.mcpack`. [Lesson 2.5](../02-creating-your-first-project/05-exporting-and-testing.md) goes through the export step by step.

## What a pack looks like inside

Here's a small behavior pack and resource pack, side by side. Don't worry about what each file does yet. Just notice the shape.

```
BP/
  manifest.json          <- required, identifies the pack
  pack_icon.png          <- the thumbnail shown in Minecraft
  functions/
    tick.json
    my_addon/
      hello.mcfunction
  items/
    ruby.json

RP/
  manifest.json          <- required, identifies this pack too
  pack_icon.png
  textures/
    item_texture.json
    items/
      ruby.png
```

Two things are worth knowing about this layout:

- **Each pack has its own `manifest.json` at its root.** Without one, Minecraft doesn't see the folder as a pack at all. Chapter 2 is where you write these.
- **Folder names inside a pack are meaningful.** Minecraft looks for items in a folder named `items`, functions in `functions`, and textures in `textures`. Name it `item` or `Items` and your files will sit there unread. This matters more than almost anything else in this course.

## Naming rules that will save you pain

- Use **lowercase letters, numbers, and underscores** for file and folder names inside packs: `ruby_sword.json`, not `Ruby Sword.json`.
- **No spaces.** Use underscores instead.
- Always include the **extension** when you create a file (`hello.mcfunction`, not `hello`).
- The exceptions are the two top-level folder names `BP` and `RP`, which are conventionally uppercase.

> **Warning:** On some computers, file extensions are hidden by default. If you create files outside mcbCode, you can end up with something like `manifest.json.txt` without realizing it. Minecraft won't treat that as a manifest. When you make files inside mcbCode, you type the whole name yourself, so it's easy to see exactly what you named it.

## What mcbCode can and can't do with these formats

Based on the features mcbCode currently documents:

- You can **create text files** with any name (`+ File`), and mcbCode edits `.json`, `.mcfunction`, and `.js` files with syntax highlighting.
- You can **upload PNG images** (`+ Image`). PNG is the only image format it accepts.
- You can **upload `.mcstructure` files** (`+ Structure`) and open them, along with `.geo.json` models, in mcbCode's 3D Beacon editor.
- `manifest.json` opens in a dedicated visual editor.

<!-- VERIFY: sound (.ogg) upload isn't among the Add Files options in the supplied mcbCode page code. Confirm whether there's another route before publishing this lesson unchanged. -->
Uploading sound files (`.ogg`) isn't one of the documented Add Files options at the moment, so sounds are the one common addon asset you can't add through the file menu.

## Recap

- Most addon files are plain text: `.json`, `.mcfunction`, `.lang`, `.js`.
- Images, sounds, and structures are the binary exceptions.
- `.mcpack` holds one pack, `.mcaddon` holds several, and both are just renamed zip files.
- Folder names inside a pack are meaningful, so spelling and lowercase matter.

You've finished Chapter 1. Time to build something.

**Previous:** [The Tools and Accounts You'll Need](03-tools-and-accounts-you-need.md) | **Next:** [Creating a Project in mcbCode](../02-creating-your-first-project/01-creating-a-project-in-mcbcode.md)
