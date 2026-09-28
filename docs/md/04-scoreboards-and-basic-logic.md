# Scoreboards and Basic Logic

So far, your functions do the same thing every time. To make them react (do something only once, count time, remember a value), you need memory and conditions. Minecraft gives you two tools for that: **scoreboards** to store numbers, and **tags** to store labels. This lesson covers both, plus the `if`/`unless` logic that ties them together.

## Scoreboards: numbers with a name

A **scoreboard objective** is a named list of scores. Think of it like a table with a title, where each row is a player or entity and each value is a number.

```
Objective: timer
  Steve     45
  Alex      120
  Creeper1  3
```

You create the objective once, then read and change scores as often as you like.

### Creating an objective

```
scoreboard objectives add timer dummy
```

- **`timer`** is the objective's name.
- **`dummy`** is its type. In Bedrock, `dummy` is the only type: the score only changes when your commands change it. (Java Edition has other types that track things like kills automatically. Bedrock doesn't.)

You only need to create an objective once per world. Running the command again when it already exists just gives an error message.

### Changing scores

```
scoreboard players set @s timer 0
scoreboard players add @s timer 1
scoreboard players remove @s timer 5
scoreboard players reset @s timer
```

- `set` gives the score an exact value.
- `add` and `remove` change it by an amount.
- `reset` deletes the score.

You can also see scores on screen:

```
scoreboard objectives setdisplay sidebar timer
```

That shows the `timer` objective in the sidebar of the screen, which is great for debugging. To see all scores for someone, use `/scoreboard players list @s`.

## Using scores in conditions

There are two ways to test a score.

**In a selector**, with `scores={...}`:

```
execute as @a[scores={timer=200..}] run say That's 10 seconds!
```

**In an `execute` condition**, with `if score`:

```
execute as @a if score @s timer matches 200.. run say That's 10 seconds!
```

Both do the same thing here. The `matches` part takes a number or a **range**:

| Range | Meaning |
| --- | --- |
| `5` | exactly 5 |
| `5..` | 5 or more |
| `..5` | 5 or less |
| `1..10` | from 1 to 10 |

You can also compare two scores against each other, or do math between them, with `scoreboard players operation`. That's beyond what you need right now, but it's how you'd add, subtract, or compare scores from different entities.

## Tags: labels, not numbers

Sometimes you don't need a number. You just need to remember "has this player already seen the welcome message?" That's a **tag**.

```
tag @s add welcomed
tag @s remove welcomed
```

And you filter with them in selectors:

```
@a[tag=welcomed]      # players who have the tag
@a[tag=!welcomed]     # players who don't
```

Tags and scoreboards are your two forms of memory. Use a tag for yes/no questions and a score for anything with a quantity.

## Putting it together: welcome each player once

Let's build something real. When a player first shows up, greet them once and never again. This uses a tag to remember who's been greeted.

Create `BP/functions/my_addon/welcome.mcfunction`:

```
tellraw @s {"rawtext":[{"text":"Welcome! Thanks for trying My First Addon."}]}
give @s minecraft:bread 3
tag @s add welcomed
```

The last line is the important one: after the greeting, the player gets tagged so they won't be greeted again.

Now create `BP/functions/my_addon/tick_loop.mcfunction`, which will run over and over:

```
# greet anyone who hasn't been welcomed yet
execute as @a[tag=!welcomed] run function my_addon/welcome
```

Read it aloud: "for every player who does *not* have the `welcomed` tag, run the welcome function as that player." Inside `welcome`, `@s` is that player, so the message and bread go to the right person.

You'll wire up `tick_loop` to run automatically in the [next lesson](05-organizing-and-running-functions.md).

## Building a timer

Scoreboards shine for timing. Minecraft runs at 20 ticks per second, so a score that goes up by 1 every tick reaches 200 after 10 seconds.

First, create the objective once. Make `BP/functions/my_addon/setup.mcfunction`:

```
scoreboard objectives add timer dummy
```

You'll run this one time by hand per world with `/function my_addon/setup`.

Then add these lines to the bottom of `tick_loop.mcfunction`:

```
# count up every tick for every player
scoreboard players add @a timer 1

# every 10 seconds, run the reward function
execute as @a[scores={timer=200..}] run function my_addon/every_ten_seconds
```

And create `BP/functions/my_addon/every_ten_seconds.mcfunction`:

```
tellraw @s {"rawtext":[{"text":"Ten seconds passed!"}]}
scoreboard players set @s timer 0
```

Resetting the timer to 0 at the end is what makes it repeat. Without that line, the score would stay at 200 or above, and the function would fire every single tick.

## Common mistakes

- **Forgetting to create the objective.** If `timer` doesn't exist, score commands fail. Run `/function my_addon/setup` first.
- **Forgetting to reset.** A "once every N seconds" timer needs a reset step.
- **Using a score when a tag would do.** For "has this happened yet," a tag is simpler.

## Exercise

Change the timer so it fires every 5 seconds instead of 10. Then make the reward give the player an apple. (Hint: 5 seconds is 100 ticks.)

## Recap

- A **scoreboard objective** stores numbers. Create it with `scoreboard objectives add name dummy`, then use `set`, `add`, `remove`, and `reset`.
- Check scores with `scores={name=range}` in selectors or `if score ... matches` in `execute`.
- **Tags** store yes/no labels. `tag=!name` matches entities without the tag.
- A repeating timer counts up each tick and resets when it fires. There are 20 ticks per second.

**Previous:** [Commands, Selectors, and Coordinates](03-commands-selectors-coordinates.md) | **Next:** [Organizing and Running Functions](05-organizing-and-running-functions.md)
