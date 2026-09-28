# Commands, Selectors, and Coordinates

A command tells Minecraft *what* to do. Two other things tell it *who* to do it to and *where*. Those are **selectors** and **coordinates**, and once you understand them, most commands stop looking like puzzles. This lesson also introduces `/execute`, the command that changes who and where a command runs.

## Anatomy of a command

Take this command:

```
give @a[tag=vip] minecraft:diamond 5
```

Break it into parts:

- **`give`** is the command name.
- **`@a[tag=vip]`** is a selector: *who* receives it.
- **`minecraft:diamond`** and **`5`** are arguments: *what* to give and *how many*.

Most commands follow this shape: a name, then a target, then details.

## Selectors: choosing who

A **selector** picks one or more players or entities. There are five basic ones:

| Selector | Picks |
| --- | --- |
| `@s` | The thing running the command ("self") |
| `@p` | The nearest player |
| `@a` | All players |
| `@r` | A random player |
| `@e` | All entities (mobs, items, and more, including players) |

`@s` is the one you'll use most inside functions. When a player runs `/function my_addon/hello`, `@s` in that function means that player.

### Selector arguments

You can narrow a selector with arguments in square brackets, separated by commas:

```
@e[type=zombie]              # every zombie
@e[type=zombie,r=10]         # every zombie within 10 blocks
@a[tag=vip]                  # every player tagged "vip"
@a[tag=!vip]                 # every player NOT tagged "vip"
@a[m=creative]               # every player in creative mode
@e[type=cow,c=1]             # only one cow (the nearest)
@e[name="Steve the Cow"]     # entities with that custom name
```

The useful ones to remember:

- **`type=`** filters by entity type.
- **`r=`** and **`rm=`** are maximum and minimum distance from where the command runs.
- **`tag=`** filters by tags, small labels you can add to entities. `tag=!name` means "doesn't have this tag".
- **`c=`** limits how many results you get.
- **`scores={...}`** filters by scoreboard values (see [Lesson 3.4](04-scoreboards-and-basic-logic.md)).

> **Warning:** Comments (`#`) can't go at the end of a command line in a real function file, so the notes beside the examples above are just for reading here. In a function, put comments on their own lines.

## Coordinates: choosing where

Commands that work with positions take three numbers: **x** (east/west), **y** (up/down), **z** (north/south). There are three ways to write each one.

### Absolute

Plain numbers are exact world coordinates:

```
setblock 100 64 -30 minecraft:diamond_block
```

### Relative (`~`)

A tilde means "from where the command is running." Add a number to offset:

```
setblock ~ ~3 ~ minecraft:diamond_block
```

That puts a diamond block three blocks above the position the command runs at. `~` alone means "same position," `~5` means "5 blocks in the positive direction," and `~-5` means "5 blocks the other way."

### Local (`^`)

A caret means "relative to which way the executor is facing." The three numbers are left, up, and forward:

```
summon zombie ^ ^ ^5
```

That summons a zombie 5 blocks *in front of* whoever's running the command.

> **Warning:** You can't mix `~` and `^` in the same coordinate set. Pick one style per command.

## Where does a function run "from"?

This trips up almost everyone at some point. Relative coordinates and `r=` distances depend on *where the command is running*:

- Run by a **player** with `/function`, it runs at the player's position, so `~ ~ ~` is where they're standing.
- Run automatically from **`tick.json`**, there's no player involved, so `~ ~ ~` is not where any player is.

That second case is why `/execute` exists.

## /execute: change who and where

`/execute` lets you run a command *as* a different entity, or *at* a different position. It's built from small pieces that chain together, ending with `run`:

```
execute as @a at @s run particle minecraft:heart_particle ~ ~2 ~
```

Read it left to right:

- **`as @a`**: run the rest of this once for each player, with that player as `@s`.
- **`at @s`**: and run it at that player's position.
- **`run ...`**: here's the command to run.

So this spawns a heart particle two blocks above every player, wherever they are. `as` changes *who*, `at` changes *where*. You usually need both.

The other pieces you'll use are conditions, which only run the command if something is true:

```
execute as @a at @s if block ~ ~-1 ~ minecraft:diamond_block run effect @s speed 2 1 true
```

That gives speed to every player standing on a diamond block. `if` runs the command only when the condition holds. `unless` is the opposite.

```
execute if entity @e[type=creeper,r=10] run say A creeper is nearby!
```

## Exercise

Write these as function lines (save them in a new file, `my_addon/practice.mcfunction`) and try them in chat first.

1. Summon a chicken 3 blocks in front of you.
2. Give every player a golden apple.
3. Give the nearest cow a slow falling effect (use `effect @e[type=cow,c=1] slow_falling 10 0 true`).
4. Make it so every player standing on a gold block gets jump boost. *(Hint: adapt the diamond block example.)*

## Recap

- Commands have a name, a target, and arguments.
- **Selectors** (`@s`, `@p`, `@a`, `@r`, `@e`) pick who, and `[arguments]` narrow them down.
- **Coordinates** can be absolute, relative (`~`), or local (`^`). Don't mix `~` and `^`.
- A function run from `tick.json` has no player attached, so use `execute as @a at @s run ...` to act on players.

**Previous:** [Writing Your First mcfunction](02-your-first-mcfunction.md) | **Next:** [Scoreboards and Basic Logic](04-scoreboards-and-basic-logic.md)
