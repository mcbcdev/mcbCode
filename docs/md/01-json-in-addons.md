# Understanding JSON in Addons

Almost everything you'll create in the rest of this course is JSON: items, blocks, entities, recipes, animations. If you can read and write JSON without fear, the rest of addon-making gets dramatically easier. This lesson teaches you JSON from zero, shows how addon files are structured, and covers the small mistakes that break files.

## What JSON is

**JSON** is a text format for describing information in a structured way. That's it. It has no logic, no commands. It's a way to write down "this thing has these properties."

Here's a made-up example, a description of a cat:

```json
{
  "name": "Whiskers",
  "age": 4,
  "is_indoor": true,
  "toys": ["ball", "mouse", "string"],
  "owner": {
    "name": "Sam",
    "city": "Portland"
  }
}
```

You already understand most of this just by reading it. Let's name the parts.

## The building blocks

**Objects** are wrapped in curly braces `{ }`. They hold **key-value pairs**, where each key is a name in double quotes, followed by a colon, followed by a value:

```json
"age": 4
```

**Values** can be one of these types:

| Type | Example | Notes |
| --- | --- | --- |
| String | `"Whiskers"` | Text, always in double quotes |
| Number | `4` or `0.5` | No quotes |
| Boolean | `true` or `false` | No quotes, lowercase |
| Array | `["ball", "mouse"]` | A list, in square brackets |
| Object | `{ "name": "Sam" }` | Another set of braces, nested inside |
| Null | `null` | "Nothing." Rare in addons |

**Nesting** means putting objects inside objects. That's how JSON describes complicated things. In the cat example, `owner` is an object inside the main object.

## The rules (this is where it breaks)

JSON is strict. These rules are the cause of most "my addon doesn't work" problems:

1. **Keys and strings use double quotes.** Single quotes (`'name'`) are invalid.
2. **Items are separated by commas.** Put a comma after every item *except the last one*.
3. **No trailing commas.** A comma after the final item in an object or array is an error.
4. **Every `{` needs a `}` and every `[` needs a `]`.** Count them if you're lost.
5. **Numbers and booleans have no quotes.** `"true"` is a string, not a boolean, and Minecraft may reject it where it expects a real boolean.
6. **Standard JSON has no comments.** Minecraft tolerates comments in some files, but other tools don't, and it isn't guaranteed. Avoid them in JSON.

## The shape of an addon file

Addon JSON files follow a pattern. Nearly all of them have two things at the top level:

1. A **`format_version`** that says which rules Minecraft should use to read the file.
2. A main object named `minecraft:<something>` (like `minecraft:item`, `minecraft:block`, or `minecraft:entity`) containing everything else.

Inside that main object you typically find a **`description`** (identity information such as the identifier) and a **`components`** object (the properties that define behavior). Here's the skeleton of a custom item:

```json
{
  "format_version": "1.26.30",
  "minecraft:item": {
    "description": {
      "identifier": "learn:ruby",
      "menu_category": {
        "category": "items"
      }
    },
    "components": {
      "minecraft:max_stack_size": 16
    }
  }
}
```

Read it in layers:

- The **outer object** has two keys: `format_version` and `minecraft:item`.
- **`minecraft:item`** holds two more: `description` and `components`.
- **`description`** says the item's identifier is `learn:ruby` and it shows in the "items" creative category.
- **`components`** sets one property: the item stacks to 16.

A **component** is one named property with a value. `"minecraft:max_stack_size": 16` is a component. Building an item, block, or entity mostly means picking the components you want and giving them values.

## Identifiers and namespaces

`learn:ruby` has two halves separated by a colon:

- **`learn`** is the **namespace**, a short prefix that's yours. It keeps your stuff from clashing with vanilla Minecraft (`minecraft:`) or other people's addons.
- **`ruby`** is the name.

Rules of thumb: use lowercase letters, numbers, and underscores; pick a namespace unique to you (like your username or addon name, 3 to 8 letters); and never use `minecraft:` for your own custom things.

In the examples, `learn` is a stand-in. Swap it for your own.

## Format versions

`"format_version": "1.26.30"` tells Minecraft which version of the file format to use when reading this file. Newer versions unlock newer features. Two things to know:

- Each file type can have its own valid versions, so you may see different numbers in different files.
- If your `format_version` is newer than the Minecraft version you're running, Minecraft may not be able to read the file. [Lesson 5.5](../05-testing-and-troubleshooting/05-checking-compatibility.md) covers this.

> **Version note:** `1.26.30` is what mcbCode's Create Item and Create Block tools currently write, so this course uses it for consistency. Microsoft's creator documentation lists what's current if you need to check.

## mcbCode won't check your JSON for you

mcbCode's normal editor saves whatever you type. It doesn't warn about a missing comma. (The exceptions are `manifest.json` in raw view, and the `.geo.json` "View as JSON" editor, which do refuse to save invalid JSON.) So build the habit of running important files through a free online JSON validator, and of using the content log after every import.

## Exercise: fix the broken file

This item file has three JSON mistakes. Find them without running anything.

```json
{
  "format_version": "1.26.30",
  "minecraft:item": {
    "description": {
      "identifier": "learn:ruby"
      "menu_category": { "category": "items" }
    },
    "components": {
      "minecraft:max_stack_size": 16,
      'minecraft:glint': true,
    }
  }
}
```

**Answers:**

1. The `identifier` line is missing a comma at the end.
2. `'minecraft:glint'` uses single quotes. It needs double quotes.
3. There's a trailing comma after `true`. The last item in an object can't be followed by a comma.

Corrected:

```json
{
  "format_version": "1.26.30",
  "minecraft:item": {
    "description": {
      "identifier": "learn:ruby",
      "menu_category": { "category": "items" }
    },
    "components": {
      "minecraft:max_stack_size": 16,
      "minecraft:glint": true
    }
  }
}
```

## Recap

- JSON is structured text: objects `{}`, arrays `[]`, strings, numbers, and booleans.
- It's strict: double quotes, commas between items, no trailing commas, matching brackets.
- Addon files have a `format_version`, a main `minecraft:...` object, a `description`, and `components`.
- Identifiers look like `namespace:name`. Make your own namespace.
- mcbCode doesn't validate normal JSON files, so check your work.

**Previous:** [Organizing and Running Functions](../03-learning-mcfunction/05-organizing-and-running-functions.md) | **Next:** [Your First Custom Item](02-custom-items.md)
