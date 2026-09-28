# Testing Your Addon in a World

Writing an addon is half the job. The other half is testing it properly, and most "my addon is broken" problems turn out to be testing problems: wrong world settings, packs that aren't active, or an old copy of the addon still being used. This lesson gives you a reliable test setup and routine.

## Set up before you test

### Turn on the content log

You did this in [Lesson 1.3](../01-getting-started/03-tools-and-accounts-you-need.md). If you skipped it, do it now: **Settings > Creator**, and enable the content log options. Testing without it is like debugging with your eyes shut.

### Make a dedicated test world

Don't test in your survival world. Make one just for testing:

1. In Minecraft, choose to create a new world.
2. Set the **game mode to Creative**, so you can fly around and get any item.
3. Turn on **cheats** (the option is usually labeled Activate Cheats). Without them, `/function`, `/give`, and most of the commands you'll use won't work.
4. Consider using a **Flat** world type, which loads fast, and has nothing in the way when you're testing blocks or mobs.
5. Open the **Add-Ons** section of the world settings.

> **Note:** Turning on cheats disables achievements for that world. That doesn't matter for a test world.

### Activate your packs

In the world's Add-Ons section, you'll find separate **Behavior Packs** and **Resource Packs** tabs. In each:

1. Find your pack under the list of available packs (it shows the name and icon from your manifest).
2. Select it and choose to **activate** it.

You need to do this for **both** the BP and the RP. If you set up the dependency in [Lesson 2.4](../02-creating-your-first-project/04-uuids-and-modules.md), activating the behavior pack may bring the resource pack along with it. Check both tabs and make sure each pack appears in the active list, rather than assuming.

> **Warning:** A pack that isn't active does nothing. Not a warning, not an error, nothing. Most "it isn't working at all" problems are this.

## The test routine

Follow the same steps every time. Consistency finds bugs faster.

1. **Save** your changes in mcbCode.
2. **Bump the version** in the manifests you changed (use **View Raw JSON**, then change `[1, 0, 0]` to `[1, 0, 1]`, and so on).
3. **Export** and import the new addon.
4. **Create a new test world** (or activate the new version in an existing test world).
5. **Enter the world and immediately check the content log** for errors.
6. **Test each feature** you changed.

## Why the version bump and fresh world matter

Minecraft doesn't always reload packs the way you'd expect. Worlds keep their own record of which pack version they use, so a world you made last week can quietly keep using last week's copy of your addon even after you import a new one.

The most reliable defenses are:

- **Increase the manifest version** every time you re-export.
- **Test in a brand-new world** when something doesn't seem to update. A new world always uses the newest files.

If you ever spend more than ten minutes confused about why a change isn't showing up, make a new world before you do anything else. It's the fastest way to rule out this problem.

## What to check, and in what order

Each time you load the world:

1. **Content log.** Any red text? Deal with it first. Everything else may be a side effect. See [Lesson 5.2](02-content-log-errors.md).
2. **Are both packs active?** Peek at the Add-Ons list again.
3. **Does the feature exist?** `/give @s learn:ruby`, `/function my_addon/hello`, `/summon learn:ghost`, or whatever applies. If the game says it doesn't recognize it, the pack didn't load properly.
4. **Does it look right?** Textures, names, models.
5. **Does it behave right?** Timers, effects, drops, recipes.

That order matters. Checking behavior before checking whether the content log is clean is how people lose an evening to a comma.

## Quick commands worth knowing

| Command | Use |
| --- | --- |
| `/give @s namespace:item` | Get a custom item |
| `/summon namespace:entity` | Spawn a custom entity |
| `/function folder/name` | Run a function |
| `/scoreboard players list @s` | See your scores |
| `/tag @s list` | See your tags |

## Test with other people and in other setups

A world that works when you're alone in creative might fail in survival, in multiplayer, or on another device. When your addon is close to done, [Lesson 6.2](../06-finishing-and-publishing/02-testing-and-reviewing.md) covers a fuller review.

## Exercise

Deliberately break something so you can see what it looks like:

1. In `BP/items/ruby.json`, delete a comma between two components.
2. Export (with a bumped version), import, and load a fresh world.
3. Read the content log. Note what it says about your file.
4. Fix the comma, and repeat.

Seeing a real error message once makes them much less scary later.

## Recap

- Use a dedicated Creative test world with cheats on and both packs **active**.
- Follow the same routine each time: save, bump version, export, import, fresh world, check the content log, test features.
- Worlds can hold onto old pack copies. A new version number and a new world get around that.
- Check things in order: content log, packs active, feature exists, looks right, behaves right.

**Previous:** [Animations and Other Customization Concepts](../04-customizing-minecraft/05-animations-and-other-customization.md) | **Next:** [Reading Content Log Errors](02-content-log-errors.md)
