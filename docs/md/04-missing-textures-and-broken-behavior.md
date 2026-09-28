# Missing Textures and Broken Behavior

Your JSON is valid, the content log is clean (or at least understandable), and something is still wrong. Either an item looks broken, or a function isn't doing what you expect. This lesson gives you step-by-step checklists for the two most common situations: missing textures and behavior that doesn't work.

## Part 1: Missing or wrong textures

Missing textures show up in a few ways: the famous black-and-purple checkerboard, a blank or invisible item, or a vanilla texture where yours should be. They all come from a broken chain, and the chain is the same every time.

### The chain for a custom item

```
item file (BP)  ->  short name  ->  item_texture.json (RP)  ->  path  ->  PNG file (RP)
minecraft:icon      "learn:ruby"    "learn:ruby": {...}         "textures/items/ruby"   ruby.png
```

Every arrow is a place it can break. Walk down the chain and check each link.

### The checklist

**1. Is the resource pack active?**
The most common cause. Open the world's Add-Ons section and confirm the RP is in the active list.

**2. Does the short name match exactly?**
Compare `minecraft:icon` in the item file against the key in `item_texture.json`. Same spelling, same capitalization, same namespace, same characters.

**3. Is the path right?**
In `item_texture.json`, the path must:
- start from the resource pack root (`textures/items/ruby`, not `RP/textures/items/ruby`),
- have no `.png` extension,
- match the real folder and file name.

**4. Does the PNG actually exist where the path says?**
In mcbCode, open `RP/textures/items/` and look. Click the image to preview it. Check the name for typos and capital letters.

**5. Is `item_texture.json` in the right place?**
It belongs in `RP/textures/`, next to the `items` folder, not inside it and not at the RP root.

**6. Is the file a real PNG?**
mcbCode only uploads PNGs, but renaming another format to `.png` doesn't convert it. Export properly from your image editor as PNG.

**7. Did the world load the new version?**
An old copy of your pack may be in use. Bump the version and test in a fresh world ([Lesson 5.1](01-testing-in-a-world.md)).

### Blocks, entities, and vanilla overrides

- **Blocks** use `terrain_texture.json` instead of `item_texture.json`, and the block file connects to it through `minecraft:material_instances`. The same checks apply.
- **Entities** skip short-name registration. Check the `textures` path in the client entity file, and check that `geometry` matches the identifier in the model file.
- **Vanilla overrides** (from Replace Texture) need the path to match the vanilla texture exactly. If an override isn't showing, check that the file in your RP is at the same path the tool reported, and that another active pack isn't overriding it too.

### Texture looks wrong, not missing

- **Blurry:** the image got smoothed when resized. Redraw at the target size.
- **Stretched or tiny:** the wrong dimensions for the target.
- **Wrong colors or missing transparency:** check that your editor saved the PNG with the alpha channel.

## Part 2: Broken behavior

Behavior problems are harder than texture problems because "wrong" can mean many things. The trick is to narrow it down. Ask these questions in order.

### 1. Is the behavior pack active?

Same as for textures. Check the Behavior Packs tab of the world's Add-Ons.

### 2. Does the thing exist at all?

- For an item: `/give @s learn:ruby`.
- For a function: start typing `/function my_addon/` and see if the game suggests it.
- For an entity: `/summon learn:ghost`.

If the game says it doesn't recognize it, Minecraft never loaded the file. Check the content log, then check the folder name and identifier.

### 3. Are cheats on?

`/function`, `/give`, and `/summon` need them. A "you don't have permission" message means cheats are off in this world.

### 4. Do the format and engine versions fit?

If `format_version` or `min_engine_version` is newer than your game, the file may not load. See [Lesson 5.5](05-checking-compatibility.md).

### 5. For functions: what does the command actually do on its own?

Take one line from your function, paste it into chat with the `/`, and run it. If it fails in chat, it fails in the function. Fix the command first.

Common function issues:

- **Nothing happens from `tick.json`.** Is the name in `tick.json` exactly `folder/name` with no extension? Is `tick.json` valid JSON, in `BP/functions/` itself?
- **Effects or messages go to nobody.** `@s` only means something when the function runs *as* an entity. Inside `tick.json` functions, use `execute as @a ...` so there's a player to be `@s`.
- **Something appears in the wrong place.** Relative coordinates (`~`) refer to where the command runs. In tick functions, that isn't a player unless you used `execute ... at @s` (see [Lesson 3.3](../03-learning-mcfunction/03-commands-selectors-coordinates.md)).
- **A score condition never fires.** Does the objective exist? Run `/scoreboard players list @s` to check the actual value. Is your range right (`200..` vs `200`)?
- **A timer fires every tick.** You forgot to reset the score after it fired.
- **It ran once and never again.** A tag is stopping it. Check with `/tag @s list`.

### 6. Add a debug message

When you can't tell which part of a function ran, drop `say` lines into it:

```
say DEBUG: tick_loop started
scoreboard players add @a timer 1
say DEBUG: timer incremented
```

Whichever messages appear tell you how far it got. Just remember to take them out before you publish, and don't leave a `say` inside anything that runs every tick, because it will flood the chat. Test with these in a function you run by hand, or use a score or tag to limit it.

### 7. Change one thing at a time

If you edit five things and it starts working, you won't know which one fixed it, and you won't know what to avoid next time. Small changes, one test each.

## Exercise

Make each of these bugs on purpose in your running project, then fix them using the checklists:

1. Change the texture path in `item_texture.json` to `textures/item/ruby` (missing an "s").
2. Change the function name in `tick.json` to `my_addon/tickloop`.
3. Delete the line in `every_ten_seconds.mcfunction` that resets the timer.

For each, decide which checklist item would have led you to the cause.

## Recap

- Missing textures come from a broken chain: pack active, short name, registration file location, path, and the PNG itself.
- For behavior problems, ask in order: is the pack active, does the thing exist, are cheats on, do versions fit, does the raw command work?
- `say` lines are a simple debugging tool for functions, but remove them afterward.
- Change one thing at a time.

**Previous:** [Fixing Invalid JSON and Common Mistakes](03-fixing-json-and-common-mistakes.md) | **Next:** [Checking Compatibility](05-checking-compatibility.md)
