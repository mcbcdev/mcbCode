# Fixing Invalid JSON and Common Mistakes

Most addon bugs aren't clever. They're small typing mistakes that a strict file format refuses to forgive. This lesson is a field guide to the mistakes beginners make most often, with before-and-after examples, so you can spot them quickly.

## How to check a file

Since mcbCode's normal editor doesn't validate JSON (see [Lesson 2.2](../02-creating-your-first-project/02-projects-files-and-folders.md)), you have three ways to catch problems:

1. **Read it against the rules.** The checklist below covers nearly everything.
2. **Paste it into a free online JSON validator.** Search "JSON validator" and pick a well-known result. Most highlight the exact place it breaks.
3. **Use the content log** after importing. It tells you which file failed.

A small note on the exceptions: `manifest.json` in raw view and the `.geo.json` "View as JSON" editor both refuse to save invalid JSON and show an error instead. Every other file saves regardless.

## JSON syntax mistakes

### Missing comma

```json
"identifier": "learn:ruby"
"menu_category": { "category": "items" }
```

Every item in an object needs a comma after it, except the last one. Fix:

```json
"identifier": "learn:ruby",
"menu_category": { "category": "items" }
```

### Trailing comma

```json
"minecraft:max_stack_size": 16,
"minecraft:glint": true,
}
```

The comma after `true` has nothing after it. Remove it.

### Single quotes or missing quotes

```json
'identifier': 'learn:ruby'
identifier: "learn:ruby"
```

Keys and text values need straight double quotes, always. Fix:

```json
"identifier": "learn:ruby"
```

### Curly quotes from copy-paste

If you copy code from a document, chat app, or web page that "beautifies" text, quote marks can silently become curly ones (`"` and `"`). They look almost identical and JSON rejects them. If a file looks perfect and still fails, retype the quotes on the failing lines.

### Unmatched brackets

Every `{` needs a `}` and every `[` needs a `]`. When a file is deeply nested, it's easy to lose count. Indenting consistently (two spaces per level, like the examples in this course) makes mismatches visible: the closing bracket should line up with the line that opened it.

### Wrong types

```json
"minecraft:max_stack_size": "16"
"minecraft:glint": "true"
```

Those are strings. Minecraft expects a number and a boolean. Fix:

```json
"minecraft:max_stack_size": 16
"minecraft:glint": true
```

## Structure and naming mistakes

### Misspelled keys and components

`"minecraft:max_stack_sise"` is valid JSON, and Minecraft will complain, or worse, quietly ignore it. When something isn't working, re-read every key slowly. Copy names from documentation instead of typing from memory.

### Wrong folder

| You put it in | It should be in |
| --- | --- |
| `BP/item/ruby.json` | `BP/items/ruby.json` |
| `BP/function/hello.mcfunction` | `BP/functions/hello.mcfunction` |
| `RP/texture/items/ruby.png` | `RP/textures/items/ruby.png` |
| `RP/item_texture.json` | `RP/textures/item_texture.json` |

Wrong-folder files produce no error, which makes them sneaky. If the game acts like your file doesn't exist, first suspect the path.

### Wrong file extension

`hello.mcfunction.txt`, `ruby.jsn`, `manifest.json.json`. Check the full name, especially if you created a file elsewhere and uploaded it. Inside mcbCode, use **ren** to fix a name.

### Uppercase letters and spaces

`Ruby.json`, `my ruby.png`, `learn:Ruby`. Keep everything lowercase with underscores.

### Namespace problems

- Missing: `"identifier": "ruby"`. It needs `namespace:name`.
- Using `minecraft:` for your own content. Use your own namespace.
- Different namespaces in different files: `learn:ruby` in the item file but `mine:ruby` in `item_texture.json`. Everything that refers to the same thing must match exactly.

## Pack-level mistakes

### Missing or misplaced manifest

Each pack needs `manifest.json` at its top level. mcbCode enforces the location (a warning shows if you try to put it elsewhere), but a *missing* manifest isn't caught. If a pack doesn't appear in Minecraft's list at all, check for it.

### Reused or placeholder UUIDs

Copying a tutorial's manifest without regenerating the UUIDs. See [Lesson 2.4](../02-creating-your-first-project/04-uuids-and-modules.md).

### Forgetting to bump the version

You fix a bug, export, import, and the bug is still there because the world is using the old copy. See [Lesson 5.1](01-testing-in-a-world.md).

### Deleted critical files

Removing `manifest.json` or `pack_icon.png`. mcbCode asks for extra confirmation before deleting either, because deleting a manifest breaks the pack.

## mcfunction mistakes

- **A leading slash** (`/say hi`) in a function file. Remove it.
- **A comment at the end of a command line.** Comments need their own line starting with `#`.
- **A command spread over several lines.** One command per line.
- **A function name with an extension or wrong path** in `tick.json` or a `function` line. Use `folder/name` with no `.mcfunction`.
- **Old `/execute` syntax.** Commands copied from pre-1.19.50 tutorials may fail. Use the `execute as ... at ... run` style from [Lesson 3.3](../03-learning-mcfunction/03-commands-selectors-coordinates.md).

## Exercise: the bug hunt

This resource pack file has four problems. Find them before reading the answers.

```json
{
  "texture_data": {
    "learn:Ruby": {
      "textures": "textures/items/ruby.png"
    },
  }
}
```

**Answers:**

1. `learn:Ruby` has a capital letter. It should be lowercase, and it must match the icon in the item file exactly.
2. `textures/items/ruby.png` shouldn't include the `.png` extension.
3. There's a trailing comma after the closing `}` of `learn:Ruby`.
4. If this file is saved at `RP/item_texture.json` rather than `RP/textures/item_texture.json`, it will be ignored, and that mistake isn't visible in the file itself.

Fixed:

```json
{
  "texture_data": {
    "learn:ruby": {
      "textures": "textures/items/ruby"
    }
  }
}
```

## Recap

- Most bugs are small: missing or extra commas, wrong quotes, wrong types, misspelled names.
- Use a validator, read against the rules, and use the content log. mcbCode's normal editor won't warn you.
- Wrong-folder and wrong-name files often produce no error at all, only silence.
- Names must match exactly across files: namespaces, short names, geometry names, and UUIDs.

**Previous:** [Reading Content Log Errors](02-content-log-errors.md) | **Next:** [Missing Textures and Broken Behavior](04-missing-textures-and-broken-behavior.md)
