# Your First Custom Item

Time to add something new to the game. In this lesson you'll create a custom item called Ruby with a behavior file, a texture, and a texture registration. You'll do it by hand first so you understand every piece, then look at the shortcut mcbCode provides.

## What a custom item needs

A working custom item takes three files, split across both packs (recall [Lesson 1.2](../01-getting-started/02-behavior-packs-vs-resource-packs.md)):

| File | Pack | Job |
| --- | --- | --- |
| `BP/items/ruby.json` | Behavior | Declares that the item exists and what it can do |
| `RP/textures/items/ruby.png` | Resource | The image |
| `RP/textures/item_texture.json` | Resource | Connects a short name to the image |

## Step 1: The item file

Create `BP/items/ruby.json` (the `items` folder should already exist from Lesson 2.2) and enter:

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
      "minecraft:display_name": {
        "value": "Ruby"
      },
      "minecraft:max_stack_size": 16,
      "minecraft:icon": "learn:ruby"
    }
  }
}
```

Replace `learn` with your own namespace everywhere it appears in this lesson. What each part does:

- **`identifier`** is the item's unique name. This is what you type in `/give`.
- **`menu_category`** puts the item in the creative inventory's "items" tab. Without it, the item exists but won't show up there, and you'd have to `/give` it.
- **`minecraft:display_name`** is the name shown in-game.
- **`minecraft:max_stack_size`** makes the item stack up to 16.
- **`minecraft:icon`** points to a texture **short name**. The short name isn't a file path. It's a label you'll define in Step 3. Here, the label is `learn:ruby`.

> **Version note:** `minecraft:icon` accepts a plain string (as above) in recent format versions, and also an object form (`{ "textures": { "default": "..." } }`) that's needed for extras like dyed variants. Older tutorials use a different form with `"texture"`. That older key is deprecated.

## Step 2: The texture

Make a small PNG. 16x16 pixels is the standard size for item textures. Draw a red gem, or anything at all, in your image editor from [Lesson 1.3](../01-getting-started/03-tools-and-accounts-you-need.md), and export it as `ruby.png`.

Upload it:

1. In mcbCode, open **RP**, then **textures**, then **items**.
2. Click **+ Add Files**, then **+ Image**.
3. Choose `ruby.png`.

Click the file afterward to see a preview and confirm it uploaded.

## Step 3: Register the texture

Now connect the short name to the image. Create `RP/textures/item_texture.json` (inside the `textures` folder, next to the `items` folder, not inside it):

```json
{
  "texture_data": {
    "learn:ruby": {
      "textures": "textures/items/ruby"
    }
  }
}
```

This says: "the label `learn:ruby` means the image at `textures/items/ruby`." Two details that trip people up:

- The path is **relative to the resource pack's root**, so it starts with `textures/`, not `RP/`.
- The path has **no `.png` extension**.

The label here has to match `minecraft:icon` in the item file **exactly**, character for character.

## Step 4: Test it

1. Bump the version in both manifests, export, and import.
2. Make a fresh world with cheats on, and activate both packs.
3. In chat, type:

```
/give @s learn:ruby
```

Or open the creative inventory and look under the items tab.

You should see your Ruby with your texture and the name "Ruby." If not, the [troubleshooting lesson](../05-testing-and-troubleshooting/04-missing-textures-and-broken-behavior.md) covers the usual suspects.

## The shortcut: mcbCode's Create Item tool

mcbCode can write these files for you. Click the small **dots** button in the toolbar and choose **Create Item** (the same menu has **Create Block**, and **Create Entity**, which currently just says it's coming soon).

The form has:

- **Name** and **Identifier** (which must look like `namespace:identifier` using only lowercase letters, numbers, and underscores).
- **Texture (upload new)**: upload a PNG and mcbCode puts it in `RP/textures/items/` and registers it in `item_texture.json` automatically. Or, instead, fill in **Texture Path / Shortname** to reuse an existing texture.
- **Components**, grouped into categories (Appearance, Usage & Interaction, Combat, and so on). Each component has a small **?** that shows a definition on hover, and inputs that fit the type (a dropdown for true/false, a number box with limits, and so on).
- Optional **Loot Table** and **Crafting Recipe** sections.

When you save, mcbCode writes `BP/items/<name>.json` (creating folders as needed), plus the texture and registration if you uploaded one.

> **Warning:** Always open the generated files afterward and read them. Your goal is to understand what the tool produced, not to trust it blindly. In particular, check whether the display name you typed ended up in the file. If your item shows up with a raw-looking name in-game, add the `minecraft:display_name` component yourself as shown in Step 1.

> **Warning:** The loot table section is designed for blocks, since the `minecraft:loot` component belongs to blocks. For items, skip it.

<!-- VERIFY: In the supplied code, creatorSave() validates the Name field but does not appear to write it into the generated JSON; and it writes minecraft:loot as {"table": "..."} where current docs define it as a plain string path (and it's a block component only). Confirm actual behavior before publishing and adjust these two warnings. -->

The tool is great for speed, but do the manual route at least once. When something breaks, you'll know where to look.

## Blocks work the same way

Custom blocks follow the same pattern with `BP/blocks/` and `minecraft:block`, plus a texture registered in `RP/textures/terrain_texture.json` instead of `item_texture.json`. **Create Block** in the same menu handles it. The full block workflow isn't covered in this course, but everything you've learned here transfers.

## Exercise

1. Give your Ruby a shimmering enchantment glow by adding `"minecraft:glint": true` to `components`. Remember the comma rules from [Lesson 4.1](01-json-in-addons.md).
2. Change its stack size to 64.
3. Use **Create Item** to make a second item called `learn:sapphire`, then open the files it generated and compare them to your hand-written Ruby.

## Recap

- A custom item needs an item file in the BP, plus a texture and a texture registration in the RP.
- The `minecraft:icon` short name must match the label in `item_texture.json` exactly, and the texture path there has no `.png` and starts from `textures/`.
- `/give @s namespace:name` is the fastest way to test.
- The Create Item tool writes these files for you, but read what it generates.

**Previous:** [Understanding JSON in Addons](01-json-in-addons.md) | **Next:** [Custom Entities: The Big Picture](03-custom-entities-big-picture.md)
