# The Tools and Accounts You'll Need

You can make a full addon with nothing but a browser, Minecraft, and a free image editor. This lesson lists exactly what to set up, what's optional, and one Minecraft setting to turn on right now that will save you a lot of frustration later.

## The required stuff

### 1. Minecraft Bedrock Edition

You need a copy of Minecraft: Bedrock Edition. That's the one thing here that isn't free.

Where you play affects how easy testing is:

- **Windows, Android, iOS/iPadOS:** the easiest. You can open an exported addon file and Minecraft imports it.
- **Consoles (Xbox, PlayStation, Switch):** as far as I know, you can't just open a pack file on these. Build and test on another device, then share the addon for others to use.

> **Version note:** Platform import rules change. If you're on a console, check Minecraft's current help pages before assuming either way.

### 2. An mcbCode account

mcbCode is where you'll create and edit your files. You'll need to be logged in to view and edit file contents and to export your project. Go to [mcbcode.com](https://mcbcode.com) and make an account.

mcbCode runs entirely in the browser. There's nothing to install, and you don't need a terminal.

## The optional (but useful) stuff

### An image editor for textures

Item and block textures are small PNG images, often 16x16 pixels. Any of these free options work:

- **Piskel**, a free pixel-art editor that runs in the browser.
- **Krita** or **GIMP**, free desktop image editors that can do pixel art.
- **Paint.NET**, a free Windows editor.

Whichever you choose, make sure it can save **PNG** files, because that's the only image format mcbCode uploads.

### Blockbench

Blockbench is a free 3D model editor that can export Minecraft Bedrock models and animations. You don't need it until you start making custom entities or models. It's covered lightly in [Lesson 4.3](../04-customizing-minecraft/03-custom-entities-big-picture.md).

### A JSON validator

JSON is picky about commas and quotes (you'll see this in [Lesson 4.1](../04-customizing-minecraft/01-json-in-addons.md)). mcbCode's normal file editor saves whatever you type without checking it, so a free online JSON validator is a handy safety net. Search for "JSON validator" and pick any of the top results.

### Reference documentation

Bookmark these. You'll come back to them often:

- **Microsoft's Minecraft Creator documentation** (on Microsoft Learn): the official reference for components, formats, and versions.
- **The Bedrock Wiki** (wiki.bedrock.dev): community-written guides and tutorials, generally very good and beginner-friendly.

## What you don't need

- A code editor like VS Code. Nice to have someday, not required here.
- A terminal or command line.
- Any paid mcbCode features. Anything in mcbCode marked as an Obsidian feature is a convenience, not a requirement.

## Turn on the content log now

This is the most important setup step in the whole course. Minecraft has a built-in error log for addons called the **content log**. When a pack has a problem (a typo in a JSON file, a missing texture), the content log tells you. With it off, a broken pack just silently fails to do anything.

To turn it on:

1. Open Minecraft and go to **Settings**.
2. Open the **Creator** section.
3. Enable the content log options: the **content log file** and the **content log GUI** (shown in some versions as "Show content log UI").

The GUI shows errors on screen, and the file keeps a record on disk. On Windows you can press **Ctrl + H** in-game to open the content log history if the GUI option is on.

> **Version note:** The exact menu wording has shifted between versions. Look for a **Creator** section under Settings and turn on anything mentioning "content log."

[Lesson 5.2](../05-testing-and-troubleshooting/02-content-log-errors.md) explains how to read what it tells you.

## Recap

- You need Minecraft Bedrock, an mcbCode account, and a browser. That's it.
- A free PNG-capable image editor is the only other thing you'll really want.
- Turn on the content log in Minecraft's Creator settings before you build anything.

**Previous:** [Behavior Packs vs Resource Packs](02-behavior-packs-vs-resource-packs.md) | **Next:** [Addon File Formats Explained](04-addon-file-formats.md)
