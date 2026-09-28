# Custom Entities: The Big Picture

Entities are the most powerful and most complicated thing you can add to Minecraft. An **entity** is anything that moves or exists in the world that isn't a block: mobs, projectiles, dropped items, minecarts, and so on. A custom entity is a mob you designed yourself.

This lesson is deliberately a "big picture" tour. Custom entities involve a lot of files, and it's more useful to understand how they fit together than to rush through a half-working example. By the end you'll know what pieces exist, where they go, and what each one is for.

> **Note:** mcbCode's **Create Entity** option currently shows "Coming Soon," so entities are a fully manual process for now. That's fine. It's a good way to learn.

## Why entities take more files

A custom item is basically a definition plus an icon. An entity has to be *behaved* (how it moves, what it does) and *drawn* (its 3D shape, textures, and animations). Those are two different jobs, which means work in both packs.

| File | Pack | Folder | Job |
| --- | --- | --- | --- |
| Server entity file | BP | `entities/` | Health, movement, behaviors, everything about how it acts |
| Client entity file | RP | `entity/` | Connects the entity to its model, texture, animations, and how it's rendered |
| Model (geometry) | RP | `models/entity/` | The 3D shape |
| Texture | RP | `textures/entity/` | The image wrapped around the shape |
| Animations | RP | `animations/` | Movement of the model's parts |

The **identifier** is what ties them together. The server file and the client file both declare the same identifier (say, `learn:ghost`), and that's how Minecraft knows they're two halves of one entity.

## The server file (behavior)

This is the entity's brain. A minimal starter looks like this:

```json
{
  "format_version": "1.21.0",
  "minecraft:entity": {
    "description": {
      "identifier": "learn:ghost",
      "is_spawnable": true,
      "is_summonable": true
    },
    "components": {
      "minecraft:type_family": { "family": ["ghost"] },
      "minecraft:health": { "value": 10, "max": 10 },
      "minecraft:collision_box": { "width": 0.6, "height": 1.8 },
      "minecraft:physics": {},
      "minecraft:movement": { "value": 0.2 },
      "minecraft:movement.basic": {},
      "minecraft:navigation.walk": {},
      "minecraft:jump.static": {},
      "minecraft:behavior.random_stroll": { "priority": 6, "speed_multiplier": 1.0 },
      "minecraft:behavior.look_at_player": { "priority": 7, "look_distance": 6.0 },
      "minecraft:behavior.random_look_around": { "priority": 9 }
    }
  }
}
```

<!-- VERIFY: entity component names and format_version above are from general Bedrock knowledge, not checked against the current stable entity docs. Confirm against Microsoft Learn's entity reference for 26.x before publishing. -->

You'd save this as `BP/entities/ghost.json`. It reads in the same way as the item you built:

- **`description`** gives the identifier and says the entity can be spawned and summoned.
- **`components`** are the abilities. This one has 10 health, a collision box, basic walking, and three simple behaviors: wander, look at players, look around.
- **`priority`** on a `behavior.*` component says which behavior wins when more than one wants control. Lower numbers are more important.

Even with only this file, `/summon learn:ghost` should create something in the world. It may be invisible or look broken without the client side, but it exists.

> **Version note:** Entity components and their format versions change with updates. Treat the list above as a shape to recognize and check current names in Microsoft's creator documentation or the Bedrock Wiki before relying on them.

## The client file (visuals)

The client file lives at `RP/entity/ghost.json` and points the entity at its visuals:

```json
{
  "format_version": "1.10.0",
  "minecraft:client_entity": {
    "description": {
      "identifier": "learn:ghost",
      "materials": { "default": "entity_alphatest" },
      "textures": { "default": "textures/entity/ghost" },
      "geometry": { "default": "geometry.ghost" },
      "render_controllers": ["controller.render.default"],
      "spawn_egg": {
        "base_color": "#ffffff",
        "overlay_color": "#99aabb"
      }
    }
  }
}
```

Here the short names on the left (`default`) are labels, and the values on the right are what they point to:

- **`materials`** controls how the entity is drawn (for example, whether transparent pixels are allowed).
- **`textures`** points to the image, without `.png`, relative to the resource pack.
- **`geometry`** names the model. That name must match the identifier inside your model file.
- **`render_controllers`** decides which material, texture, and geometry get used. `controller.render.default` is a built-in one that uses whatever you labeled `default`.
- **`spawn_egg`** gives you a spawn egg in the creative inventory.

## The model

The **geometry file** describes the entity's 3D shape as boxes ("cubes") grouped into named parts called **bones**. Writing this by hand is painful. Nobody does. Use **Blockbench**, the free tool from [Lesson 1.3](../01-getting-started/03-tools-and-accounts-you-need.md), to design the model visually and export a Bedrock entity model. The exported file is a `.geo.json` that goes in `RP/models/entity/`.

mcbCode can hold `.geo.json` files. Clicking one in the file list offers an **Open Beacon Editor** button and a **View as JSON** option.

The texture is usually painted in Blockbench too, and exported as a PNG into `RP/textures/entity/`.

## How the pieces connect

```
BP/entities/ghost.json            identifier: learn:ghost
        |
        | same identifier
        v
RP/entity/ghost.json              geometry -> "geometry.ghost"
                                  textures -> "textures/entity/ghost"
                                  animations -> (Lesson 4.5)
        |
        +--> RP/models/entity/ghost.geo.json   (defines geometry.ghost)
        +--> RP/textures/entity/ghost.png
```

If you ever have an entity that's invisible, has the wrong texture, or shows up as a strange shape, walk down this chain and check each link. Nine times out of ten it's a name that doesn't match somewhere.

## A sensible path from here

You don't need to finish an entity to finish this course. If you want to keep going on your own, here's an order that works:

1. Write the server file, and confirm `/summon` works and the content log is clean.
2. Model and texture something simple in Blockbench.
3. Add the client file and make it show up.
4. Add an animation (next lessons).
5. Only then add complicated behavior.

The Bedrock Wiki has a step-by-step "create a custom entity" guide that walks through a full working example, and it's worth following alongside this lesson.

## Exercise

Without writing any files, answer these from the diagram above:

1. If `/summon learn:ghost` works but the ghost is invisible, which pack should you look in first?
2. You renamed your model's geometry identifier to `geometry.spooky`. What do you need to update in the client file?
3. Which file decides how fast the ghost walks?

**Answers:** 1. The resource pack (the client file, geometry, or texture). 2. The `geometry` entry: `"default": "geometry.spooky"`. 3. The server file in the BP, via `minecraft:movement`.

## Recap

- An entity is split into a server file (behavior, in BP) and a client file (visuals, in RP), linked by a shared identifier.
- Visuals also need a geometry file (model), a texture, and optionally animations.
- Design models and textures in Blockbench. Don't hand-write geometry.
- When an entity misbehaves, check the chain of names one link at a time.

**Previous:** [Your First Custom Item](02-custom-items.md) | **Next:** [Textures and Resource Packs](04-textures-and-resource-packs.md)
