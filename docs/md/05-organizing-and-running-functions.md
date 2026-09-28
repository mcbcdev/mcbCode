# Organizing and Running Functions

You now have several function files. This lesson ties them together: how to structure them so they stay readable, how to call one function from another, and how to make a function run automatically every tick with `tick.json`. By the end, your welcome message and timer will run on their own.

## Structure your functions folder

A tidy layout makes a big difference once you have more than a few files. Here's the shape of the running project's `functions` folder:

```
BP/
  functions/
    tick.json
    my_addon/
      setup.mcfunction
      hello.mcfunction
      welcome.mcfunction
      tick_loop.mcfunction
      every_ten_seconds.mcfunction
```

A few habits that pay off:

- **One folder named after your addon** (`my_addon`), so your functions never get mixed up with anyone else's.
- **Lowercase, underscores, no spaces.** `every_ten_seconds`, not `Every Ten Seconds`.
- **Name functions by what they do.** `give_starter_kit` is better than `func1`. If you can't tell what a file does from its name, future you won't be able to either.
- **Use subfolders when a system grows.** For instance, `my_addon/events/on_join.mcfunction` and `my_addon/abilities/dash.mcfunction`.

> **Warning:** Keep your total file paths reasonably short. Community guidance for cross-platform addons is to keep any path under about 80 characters, mainly because of console limits. That's easy to hit if you nest folders deeply with long names.

## Calling one function from another

A function can run another function by including a `function` line:

```
function my_addon/welcome
```

This is how you keep individual functions small. Instead of one giant file, you make several short ones, and a main function calls them in order. You've already done this: `tick_loop` calls `welcome` and `every_ten_seconds`.

The name you give is the same one you'd type after `/function` in chat: the folder path inside `functions`, minus `.mcfunction`.

> **Warning:** Don't make a function call itself, directly or through another function. It can create a loop that Minecraft may cut off, and it's almost always a mistake.

## Running a function automatically: tick.json

Some functions should run constantly: checking timers, greeting new players, watching for things. Bedrock has a special file for this, `tick.json`, which lists functions to run **every game tick** (20 times per second).

It goes directly in the `functions` folder, not in a subfolder.

1. Open **BP**, then **functions**.
2. Click **+ Add Files**, then **+ File**, and name it `tick.json`.
3. Open it and enter:

```json
{
  "values": [
    "my_addon/tick_loop"
  ]
}
```

4. Save.

That's the whole file. Two details:

- The `values` list holds **function names without the `.mcfunction` extension**, using the same path style as `/function`.
- To run more than one function, separate them with commas: `"my_addon/tick_loop", "my_addon/other_thing"`. Often you don't need to, because `tick_loop` can call the rest.

Think of `tick.json` as the doorbell. It rings one function every tick, and that function decides what else runs.

## Why "one main function" is a good pattern

If everything listed in `tick.json` grows over time, you end up editing that file constantly. Instead, keep `tick.json` pointing at a single `tick_loop` function and put the real logic inside it. Then `tick.json` stays two lines long forever, and everything else is ordinary function files.

## Performance: be kind to the tick

Anything in `tick.json` runs 20 times per second, in every world using your pack. A few habits keep that cheap:

- **Filter early.** `execute as @a[tag=!welcomed]` runs the welcome only for the players who need it, rather than for everyone every tick.
- **Avoid selecting all entities every tick** (`@e` with no filters) unless you really need to.
- **Don't do heavy work every tick if once a second will do.** The timer pattern from [Lesson 3.4](04-scoreboards-and-basic-logic.md) exists for this reason.

## Run the whole thing

1. Confirm all five function files and `tick.json` exist and are saved.
2. Bump your manifest versions, then **Export** and import the new addon.
3. Make a **new world** with cheats on and both packs active.
4. Run `/function my_addon/setup` once to create the `timer` objective.
5. You should be greeted and given bread almost immediately (the welcome function runs from `tick.json`), and see "Ten seconds passed!" every ten seconds.

If nothing happens, check these in order:

1. Is `tick.json` valid JSON? A missing quote or comma stops it from loading. Check the content log.
2. Does `tick.json` list `my_addon/tick_loop` exactly, with no `.mcfunction` and no leading slash?
3. Did you run `setup`? Without the `timer` objective, the timer lines do nothing.
4. Is the behavior pack active in this world?

## Exercise

Add a new function called `night_check.mcfunction` that runs from `tick_loop`. Make it give night vision to any player who has the tag `explorer`:

```
effect @a[tag=explorer] night_vision 15 0 true
```

Wire it into `tick_loop` with a `function my_addon/night_check` line, then give yourself the tag with `/tag @s add explorer` and test it.

## Recap

- Organize with an addon-named folder, lowercase names, and descriptive file names.
- A function can call another with a `function` line. Keep functions small and let a main one call the rest.
- `BP/functions/tick.json` lists functions (no extension) to run every tick. Point it at one main function and keep the logic there.
- Anything in `tick.json` runs 20 times a second, so filter selectors and avoid heavy work.

That's Chapter 3. You can now make an addon that does things on its own. Next, you'll change what Minecraft *contains*.

**Previous:** [Scoreboards and Basic Logic](04-scoreboards-and-basic-logic.md) | **Next:** [Understanding JSON in Addons](../04-customizing-minecraft/01-json-in-addons.md)
