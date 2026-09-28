# Reading Content Log Errors

The content log is Minecraft telling you exactly what's wrong with your addon, if you know how to read it. Error messages look intimidating at first, but they follow a pattern, and once you spot it, most of them point straight at the problem. This lesson teaches you how to find the log, read it, and act on what it says.

## What the content log is

Whenever Minecraft loads content from your packs, it checks everything. If it finds something wrong (a JSON typo, a missing file, a component name it doesn't recognize), it writes a message to the content log. There are three ways to see it:

- **On screen (the GUI).** With the content log GUI enabled, errors pop up in the game.
- **The history screen.** Press **Ctrl + H** on Windows (this only works if the GUI option is on), or open **Content Log History** from the Creator settings or your profile screen. You can copy all the messages to your clipboard from there.
- **The log file.** With the file option enabled, Minecraft saves messages on disk. Its location is shown in the Creator settings. On Windows, it's in a `logs` folder under `%APPDATA%\Minecraft Bedrock\`.

> **Version note:** Log file locations differ between Windows builds, Preview vs. release, and platforms. Trust the location shown in your own Creator settings over any path written in a tutorial, this one included.

## Errors vs warnings

Messages are usually either errors or warnings:

- **Errors** mean something is broken. A file didn't load, a feature won't work. Fix these first.
- **Warnings** mean something is questionable but the game kept going. Worth reading, but lower priority.

## Anatomy of a message

The wording varies by version, so don't memorize exact sentences. Instead, learn what information to look for. A useful message tells you some combination of:

1. **Which pack** the problem is in.
2. **Which file** (or which kind of content).
3. **What went wrong** (a parse failure, a missing reference, an unknown name).
4. **Where** (sometimes a line, or the path inside the file).

Read every message with those four questions in mind. Then match it to a category below.

## Common message categories

### "Couldn't parse" or unexpected character (invalid JSON)

The file has a syntax problem: a missing comma, a stray quote, mismatched brackets. This is the most common category by far. It means Minecraft couldn't even read the file, so nothing inside it takes effect.

**What to do:** open the named file and check it against the rules in [Lesson 4.1](../04-customizing-minecraft/01-json-in-addons.md). Run it through a JSON validator. The problem is often a line or two *before* where the error points.

### Unknown or invalid property, component, or value

The JSON is valid, but something in it isn't something Minecraft understands. Maybe a misspelled component (`minecraft:max_stack_sise`), a value of the wrong type (`"16"` in quotes instead of `16`), or a component that isn't allowed at your `format_version`.

**What to do:** compare the name against the documentation, check spelling and capitalization, and check the value's type.

### Missing reference or file not found

One file points at another that Minecraft can't find. A texture path with a typo, a geometry name that doesn't exist, a loot table path that's wrong, a dependency UUID that doesn't match any pack.

**What to do:** find the pointer (the path, name, or UUID) and compare it character by character to the thing it should point at. Remember that texture paths have no `.png` and start from `textures/`.

### Manifest and dependency problems

The pack itself failed to load. Common causes: an invalid `manifest.json`, duplicate or malformed UUIDs, or a dependency whose UUID or version doesn't match.

**What to do:** open both manifests in the raw view and run the checklist from [Lesson 2.4](../02-creating-your-first-project/04-uuids-and-modules.md).

### Identifier problems

An identifier that's missing its namespace, has capital letters, or uses characters that aren't allowed. mcbCode's Create tools enforce the `namespace:name` shape with lowercase letters, numbers, and underscores, but hand-written files don't get that protection.

## How to work through a log

1. **Start at the top.** Errors early in the log often cause a pile of later ones. Fixing the first one may make a dozen others vanish.
2. **Fix one thing, then retest.** Don't fix five errors at once. If the log still complains, you won't know which fix helped or hurt.
3. **Copy the message.** Paste it into a note or search for it. If you need help from someone else, the exact text is the most useful thing you can give them.
4. **Beware of old errors.** The log isn't always cleared between world loads, so a message you see may be from a previous attempt. Note the timing, or start from a clean state by loading a fresh world.

## When the log is empty but nothing works

An empty log doesn't mean success. It can mean:

- The content log isn't actually enabled (check Creator settings).
- The pack isn't active in the world, so Minecraft never tried to load it.
- The file is in the wrong folder, so Minecraft never noticed it. This produces *no error at all*, because from the game's view, the file doesn't exist. (Recall from [Lesson 1.4](../01-getting-started/04-addon-file-formats.md) that folder names are meaningful.)

That last one catches many beginners. An item file in `BP/item/` instead of `BP/items/` isn't wrong, just ignored.

## Exercise

Deliberately introduce each of these one at a time, re-import, and read the log:

1. Change `"minecraft:max_stack_size": 16` to `"minecraft:max_stack_size": "16"`.
2. Change the item's `minecraft:icon` short name so it no longer matches `item_texture.json`.
3. Change the dependency UUID in the BP manifest by one character.

For each, write down: what did the log say, and which of the four questions (pack, file, what, where) did the message answer? Then fix each one.

## Recap

- The content log lists problems Minecraft found in your packs. Enable it and read it every time.
- Look for four things in each message: which pack, which file, what went wrong, and where.
- Common categories: invalid JSON, unknown properties or values, missing references, manifest and dependency problems.
- Fix from the top down, one at a time, and retest.
- An empty log doesn't guarantee success. Wrong-folder files produce no errors at all.

**Previous:** [Testing Your Addon in a World](01-testing-in-a-world.md) | **Next:** [Fixing Invalid JSON and Common Mistakes](03-fixing-json-and-common-mistakes.md)
