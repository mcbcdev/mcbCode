# Writing Your First Manifest

The manifest is the single most important file in a pack. Without it, Minecraft doesn't know your folder is a pack at all. In this lesson you'll learn what a manifest says, write one for your behavior pack, and learn how mcbCode's visual manifest editor works.

## What a manifest does

`manifest.json` is an identity card. It tells Minecraft:

- What the pack is called and what it's for.
- A unique ID for the pack (a UUID, covered in the [next lesson](04-uuids-and-modules.md)).
- What version of the pack this is.
- What Minecraft version it was built for.
- What kind of pack it is (behavior or resource).
- Whether it depends on other packs.

Every pack has exactly one manifest, at the top level of that pack's folder. So your project needs two of them: `BP/manifest.json` and `RP/manifest.json`. This lesson does the BP. The RP comes in Lesson 2.4.

## Reading a manifest

Here's a complete behavior pack manifest. It's the one you'll be writing. Read it once through, then we'll go piece by piece.

```json
{
  "format_version": 2,
  "header": {
    "name": "My First Addon BP",
    "description": "Behavior pack for my first addon.",
    "uuid": "00000000-0000-4000-8000-000000000001",
    "version": [1, 0, 0],
    "min_engine_version": [1, 26, 30]
  },
  "modules": [
    {
      "type": "data",
      "uuid": "00000000-0000-4000-8000-000000000002",
      "version": [1, 0, 0],
      "description": "Behavior data for my first addon."
    }
  ]
}
```

### `format_version`

The version of the *manifest format itself*, not of Minecraft. Use `2`. It's a number, not a string, so no quotes.

> **Version note:** You may see references to a newer manifest format (version 3) that was in Preview at the time of writing. Stick with `2` for now. It's the stable one that works everywhere.

### `header`

The "who is this pack" section.

- **`name`** is what players see in the pack list.
- **`description`** is the small text under the name.
- **`uuid`** is the pack's unique ID. The value above is a placeholder, and you'll replace it in a moment.
- **`version`** is your pack's version as three numbers in square brackets: `[1, 0, 0]`. Bump it when you update your pack.
- **`min_engine_version`** is the lowest Minecraft version the pack is designed for. Here that's `[1, 26, 30]`, meaning 1.26.30. It matters for more than compatibility, too. The commands in your functions follow the rules of the version you declare here.

### `modules`

A pack is made of one or more **modules**, and each module has a type. A behavior pack's main module has the type `data`. (A resource pack uses `resources`.) Each module also has its own UUID and version. [Lesson 2.4](04-uuids-and-modules.md) covers modules in detail.

## Create the file in mcbCode

1. Open the **BP** folder in your project.
2. Click **+ Add Files**, then **+ File**.
3. Name it exactly `manifest.json`.

> **Warning:** `manifest.json` is only allowed at the top of BP or RP. If you try to create it inside a subfolder, mcbCode warns you that it belongs in `/BP/` or `/RP/`.

## Open the visual manifest editor

Click the `manifest.json` row. Instead of a plain text editor, you get a **visual manifest editor** with labeled fields.

At the top, it explains that mcbCode fills in the technical bits like UUIDs for you, so you mostly just need the name and description. You'll see:

- **Pack Name** and **Description** fields.
- A **Pack UUID** with a **Regenerate** button.
- A **Module UUID** for each module, each with its own **Regenerate** button.
- **Subpacks** and **Compatibility (Dependencies)** sections, both with add buttons.
- A **View Raw JSON** button and a **Save** button.

If your file was created with the right structure already filled in, the fields will show real values and you can just edit the name and description.

If the fields are empty (no module UUID rows, no UUID), the file starts blank, and the quickest route is to paste the whole manifest in using the raw view:

1. Click **View Raw JSON**. The visual editor swaps to a text box.
2. Select everything in the text box and replace it with the manifest from above.
3. Click **Save**.

<!-- VERIFY: it isn't confirmed from the supplied code whether a newly created manifest.json is prefilled by the server. The visual editor copy says mcbCode fills in technical details, so it may be. Test with a fresh project and adjust this section. -->

The raw view is also the only place you can edit things the visual editor doesn't have fields for, such as `version` and `min_engine_version`. If you switch back with **Back to Visual Editor** and the text isn't valid JSON, mcbCode warns you instead of losing your edits.

## Fill in the friendly parts

Whether you pasted or not, make sure these are set (use the visual editor's fields, or edit in raw):

- **Pack Name:** `My First Addon BP`
- **Description:** `Behavior pack for my first addon.`

Save it.

> **Warning:** Don't export or test yet! The UUIDs in the template above are obvious placeholders (`00000000-...`). If you left them in and used them in real packs, they'd collide with anyone else who copied the same example. The very next lesson has you replace them with real ones.

## Exercise

1. Create `BP/manifest.json` and get the content in using the steps above.
2. Open the raw view and find each piece we discussed: `format_version`, `header`, `modules`.
3. Change the description to something of your own, save, close, and re-open the file to confirm it saved.

## Recap

- The manifest is the pack's identity card, and every pack needs one at its top level.
- Key parts: `format_version` (use `2`), `header` (name, description, UUID, version, minimum Minecraft version), and `modules`.
- mcbCode opens `manifest.json` in a visual editor. **View Raw JSON** lets you edit anything, including fields the visual editor doesn't cover.
- Your placeholder UUIDs need replacing before you use the pack.

**Previous:** [Projects, Files, and Folders](02-projects-files-and-folders.md) | **Next:** [UUIDs and Pack Modules](04-uuids-and-modules.md)
