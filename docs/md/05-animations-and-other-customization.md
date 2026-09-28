# Animations and Other Customization Concepts

You've seen items, entities, and textures. This lesson does two things: it introduces **animations** (how model parts move), and then gives a quick tour of everything else addons can customize, so you know what exists and where to learn more when you're ready. It's a map, not a full tutorial for each topic.

## Animations

An **animation** describes how the parts (bones) of an entity's model move over time. A ghost that bobs up and down, a mob that swings its arms, a door that swings open: all animations.

Animations live in the resource pack, in `RP/animations/`, as JSON. Here's a small one:

```json
{
  "format_version": "1.8.0",
  "animations": {
    "animation.learn_ghost.float": {
      "loop": true,
      "animation_length": 2,
      "bones": {
        "body": {
          "position": [0, "math.sin(query.anim_time * 180) * 1", 0]
        }
      }
    }
  }
}
```

Reading it:

- **`animation.learn_ghost.float`** is the animation's name. Names always start with `animation.` and are yours to choose.
- **`loop: true`** repeats it forever.
- **`animation_length: 2`** makes one cycle last 2 seconds.
- **`bones`** lists which parts of the model to move. `body` has to be the name of a real bone in your model, so this only works if your geometry has one called that.
- **`position`** shifts the bone by `[x, y, z]`. Only the middle value (up and down) has a formula.

### That formula is Molang

`"math.sin(query.anim_time * 180) * 1"` is written in **Molang**, Minecraft's small expression language for values that change over time. Here:

- **`query.anim_time`** is how many seconds the animation has been playing.
- **`math.sin(...)`** produces a smooth wave between -1 and 1 (Molang's trig functions use degrees).
- Multiplying by 180 makes one full wave take 2 seconds, matching `animation_length`.
- `* 1` sets how far it moves. Model units are small (1/16 of a block), so this is subtle.

You don't need to master Molang now. Recognizing it, and knowing where it shows up, is enough.

### Hooking the animation to an entity

Animations only play if the entity's **client file** says so. Inside the `description` of `RP/entity/ghost.json` (from [Lesson 4.3](03-custom-entities-big-picture.md)), add:

```json
"animations": {
  "float": "animation.learn_ghost.float"
},
"scripts": {
  "animate": ["float"]
}
```

The `animations` block gives the animation a short name (`float`), and `scripts.animate` tells the entity to play it. Both parts are needed. Animations that aren't listed in `animate` never run.

### Making animations

Like models, animations are painful to write by hand and easy in **Blockbench**, which has a visual timeline where you pose bones at keyframes and export the result.

### Animation controllers

Sometimes an entity needs to *switch* between animations depending on what's happening (idle vs. walking vs. attacking). That's the job of **animation controllers**, small state machines that pick which animation plays. They're a step beyond this course, but now you know what to search for.

## The rest of the customization map

Each of these is a real topic worth its own lesson. Here's what they are and where they live.

### Language files (display names)

Language files in `RP/texts/` (like `en_US.lang`) hold the text players see, such as item names, in each language. They let you translate an addon and keep names out of your item files. Format is one `key=value` pair per line. Some item and block display names use these instead of a literal string.

### Loot tables

A **loot table** decides what an entity or block drops. It's a JSON file in `BP/loot_tables/`:

```json
{
  "pools": [
    {
      "rolls": 1,
      "entries": [
        {
          "type": "item",
          "name": "learn:ruby",
          "weight": 1,
          "functions": [
            { "function": "set_count", "count": { "min": 1, "max": 3 } }
          ]
        }
      ]
    }
  ]
}
```

That gives one roll on the table, and the result is 1 to 3 Rubies. A **block** points at its loot table with the `minecraft:loot` component, which takes a plain path string, for example `"minecraft:loot": "loot_tables/blocks/ruby_ore.json"`.

mcbCode's Create Block and Create Item forms have an optional **Loot Table** section that writes a file shaped like this. After it saves, open the block's JSON and confirm the `minecraft:loot` component is a plain string like the example above. If the tool wrote it as an object instead, fix it by hand.

### Recipes

A **recipe** says what crafts into what. This shaped recipe (from mcbCode's Create tools, and saved in `BP/recipes/`) crafts a Ruby from a 2x2 of diamonds:

```json
{
  "format_version": "1.20.10",
  "minecraft:recipe_shaped": {
    "description": { "identifier": "learn:ruby_recipe" },
    "tags": ["crafting_table"],
    "pattern": [
      "AA ",
      "AA ",
      "   "
    ],
    "key": {
      "A": { "item": "minecraft:diamond" }
    },
    "result": { "item": "learn:ruby", "count": 1 }
  }
}
```

The `pattern` is the crafting grid, each letter is defined in `key`, and spaces are empty cells. The Create Item form's **Crafting Recipe** section is a 3x3 grid that writes exactly this structure.

### Spawn rules

**Spawn rules** control where and when a mob naturally appears (which biomes, what light level, how often). They live in `BP/spawn_rules/`.

### Sounds

Sound files (`.ogg`) live in `RP/sounds/`, and definition files connect them to named events. Custom sounds are one area where mcbCode's file menu currently doesn't have an upload option for the audio files (see [Lesson 1.4](../01-getting-started/04-addon-file-formats.md)).

### Particles

Particle effects (sparks, smoke, magic swirls) are JSON files in `RP/particles/`.

### Scripting

For logic that JSON and functions can't express, Bedrock has a **scripting API** in JavaScript. Scripts go in `BP/scripts/` and need a `script` module in the manifest, along with dependencies on Minecraft's script modules. It's powerful, but scripting versions and APIs change frequently, so consult Microsoft's current scripting documentation and check compatibility carefully. mcbCode can edit `.js` files with syntax highlighting.

<!-- VERIFY: the animation JSON, Molang formula, loot table, and recipe examples are from general Bedrock knowledge plus the recipe/loot formats used by mcbCode's own Create tools; confirm against current Microsoft Learn docs for 26.x. -->

## Exercise

1. Add the loot table above to your project as `BP/loot_tables/blocks/ruby_ore.json`. Use your own namespace for the item name.
2. Add the recipe above as `BP/recipes/ruby.json`, also with your namespace. Export, import, and check whether you can craft a Ruby from four diamonds in a crafting table.
3. In your own words, explain why an animation needs to be in both the `animations` block and `scripts.animate` of a client entity.

## Recap

- Animations are JSON in the resource pack. Model parts (bones) move using values or Molang formulas, and the client entity must list the animation in both `animations` and `scripts.animate`.
- Blockbench is the practical way to create models and animations.
- Beyond that: language files, loot tables, recipes, spawn rules, sounds, particles, and scripts all follow the same pattern of JSON files in the right folder.
- Version-sensitive areas (especially scripting) deserve a check against current documentation.

That's Chapter 4. You can now create and customize content. Next: making sure it works.

**Previous:** [Textures and Resource Packs](04-textures-and-resource-packs.md) | **Next:** [Testing Your Addon in a World](../05-testing-and-troubleshooting/01-testing-in-a-world.md)
