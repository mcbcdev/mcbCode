# UUIDs and Pack Modules

UUIDs are the part of manifests that scares people the most, mostly because they look like random garbage and nobody explains why they exist. They're actually simple. In this lesson you'll learn what UUIDs and modules are, replace the placeholders in your BP manifest, write the RP manifest, and link the two packs together.

## What is a UUID?

A **UUID** (universally unique identifier) is a long random ID that looks like this:

```
3f2b8c1e-9a47-4d6b-8e15-7c0a2d94b6f3
```

It's 32 hexadecimal characters (digits `0-9` and letters `a-f`) split into five groups by hyphens. The pattern is always 8-4-4-4-12 characters.

The point of a UUID is uniqueness. Minecraft needs to tell your pack apart from every other pack in existence, so it needs an ID that nobody else has. Names can clash (lots of people call their pack "Cool Addon"), but a randomly generated UUID essentially never repeats. You don't invent one by hand. You generate one, and mcbCode does that for you.

## The rules

- **Every UUID must be unique.** Never reuse the same one for two different things, and never copy one from a tutorial into your real pack.
- **A pack's header UUID and its module UUID must be different from each other.** The header identifies the pack, and the module identifies a part inside it.
- **Once you release a pack, don't change its header UUID.** Minecraft treats a new UUID as a completely different pack. Players' worlds that used the old one would lose their connection to it, and updates wouldn't replace the old version.

For an addon with both a behavior pack and a resource pack, that adds up to four UUIDs:

| # | Where | Belongs to |
| --- | --- | --- |
| 1 | BP `header.uuid` | The behavior pack as a whole |
| 2 | BP `modules[0].uuid` | The behavior pack's `data` module |
| 3 | RP `header.uuid` | The resource pack as a whole |
| 4 | RP `modules[0].uuid` | The resource pack's `resources` module |

All four must be different.

## What is a module?

A pack is divided into **modules**, and each module has a `type` that says what kind of content it holds. The types you need to know:

| Type | Used by | Holds |
| --- | --- | --- |
| `data` | Behavior packs | Items, blocks, entities, functions, loot, recipes |
| `resources` | Resource packs | Textures, models, sounds, animations |
| `script` | Behavior packs using the scripting API | JavaScript (advanced, not covered here) |

Other module types exist for things like skin packs and world templates, but you won't need them.

Most simple packs have exactly one module. The `type` is what tells Minecraft "treat the contents of this folder as behavior data" or "treat it as resources."

mcbCode's manifest editor explains this in plain language next to each UUID field. The `data` module UUID, for instance, is described as identifying the behavior side of your pack.

## Step 1: Regenerate your BP UUIDs

1. Open `BP/manifest.json` in the visual editor.
2. Next to **Pack UUID**, click **Regenerate**.
3. Next to the **Module UUID**, click **Regenerate**.
4. Click **Save**.

The Regenerate buttons create fresh random UUIDs. Note the warning shown next to Pack UUID: changing it later makes Minecraft treat the pack as a brand-new one. That's fine right now because nothing exists yet, but remember it once you publish.

## Step 2: Create the RP manifest

1. Open the **RP** folder.
2. Click **+ Add Files**, then **+ File**, and name it `manifest.json`.
3. Open it. If it's empty, use **View Raw JSON** and paste this template:

```json
{
  "format_version": 2,
  "header": {
    "name": "My First Addon RP",
    "description": "Resource pack for my first addon.",
    "uuid": "00000000-0000-4000-8000-000000000003",
    "version": [1, 0, 0],
    "min_engine_version": [1, 26, 30]
  },
  "modules": [
    {
      "type": "resources",
      "uuid": "00000000-0000-4000-8000-000000000004",
      "version": [1, 0, 0],
      "description": "Resources for my first addon."
    }
  ]
}
```

4. Switch back to the visual editor and click **Regenerate** on both the Pack UUID and the Module UUID.
5. Save.

Notice the only real differences from the BP manifest: the name and description, and the module `type` is `resources` instead of `data`.

## Step 3: Link the packs with a dependency

Right now your two packs are strangers. To make the behavior pack say "I need the resource pack too," you add a **dependency** to the BP manifest that points at the RP's header UUID.

1. Open `RP/manifest.json` and copy the **Pack UUID** (the header one, not the module one). It's shown in a read-only box, but you can still select and copy the text.
2. Open `BP/manifest.json`.
3. In the **Compatibility (Dependencies)** section, click **+ Add Compatibility**.
4. Paste the RP's Pack UUID into the UUID box.
5. In the version box, enter `1.0.0` (this must match the RP's header version).
6. Save.

If you view the raw JSON, your BP manifest now has an extra block at the end:

```json
"dependencies": [
  {
    "uuid": "PASTE-THE-RP-HEADER-UUID-HERE",
    "version": [1, 0, 0]
  }
]
```

(Your real one will have the actual UUID in it, not the placeholder text.)

> **Warning:** The dependency UUID has to match the RP's header `uuid` exactly, and the version has to match too. A wrong character here means Minecraft can't find the pack you're depending on, and you'll get a content log error about a missing dependency. Copy and paste rather than retyping.

This dependency is a big part of what makes the two packs behave as one addon. When a world uses the behavior pack, Minecraft knows it needs the resource pack alongside it.

## Subpacks (skip for now)

The manifest editor also has a **Subpacks** section. Subpacks let players choose between variants of one pack (for example a "low" and "high" quality set of textures). You don't need them for a normal addon, so leave that section empty.

## Check your work

Open the raw view of each manifest and confirm:

- [ ] Four different UUIDs across the two files, none of them starting with `00000000`.
- [ ] BP module `type` is `data`. RP module `type` is `resources`.
- [ ] The BP's `dependencies` UUID equals the RP's header `uuid`.
- [ ] Both `min_engine_version` values are the same.

## Recap

- A UUID is a random, unique ID that lets Minecraft tell packs apart. Generate them, never invent them, and never reuse them.
- An addon with BP and RP has four UUIDs, all different.
- Modules describe what a pack contains: `data` for behavior, `resources` for resources.
- A dependency in the BP manifest pointing at the RP's header UUID links the two packs.
- mcbCode's **Regenerate** buttons make the UUIDs for you.

**Previous:** [Writing Your First Manifest](03-your-first-manifest.md) | **Next:** [Exporting and Testing Your Project](05-exporting-and-testing.md)
