# What Functions Are and How They Work

If you've ever typed a command in Minecraft chat, like `/give @s diamond` or `/time set day`, you already know 90% of what a function is. A function is just a saved list of those commands that Minecraft can run all at once. This lesson explains what that means, why it's useful, and how functions fit into an addon.

## Commands vs functions

A **command** is one instruction you type in chat or a command block:

```
/say Hello!
```

A **function** is a text file with many commands in it, one per line:

```
say Hello!
give @s minecraft:diamond 1
playsound random.levelup @s
```

When you run the function, Minecraft runs every line, top to bottom, in one go. Instead of typing three commands (or wiring up three command blocks), you type one: `/function my_addon/hello`.

Function files use the `.mcfunction` extension.

## Why functions are worth learning

- **They're reusable.** Write it once, run it whenever you want.
- **They travel with your addon.** Command blocks live in a world. Functions live in your behavior pack, so they work in any world that uses your pack.
- **They can run automatically.** With a `tick.json` file (covered in [Lesson 3.5](05-organizing-and-running-functions.md)), a function can run every game tick with no command block in sight.
- **They're organized.** A folder of `.mcfunction` files is far easier to read and fix than a wall of command blocks.

## The rules of function files

A few differences from typing commands in chat:

1. **No leading slash.** In chat you type `/say hi`. In a function file you write `say hi`.
2. **One command per line.** Don't split a command across lines.
3. **Comments start with `#`.** Any line beginning with `#` is ignored, so you can leave notes for yourself.
4. **Blank lines are fine.** Use them to group things.

```
# greet the player who ran this function
say Hello!

# reward them
give @s minecraft:diamond 1
```

## Where functions live

Functions belong in the **behavior pack**, inside a folder named `functions`:

```
BP/
  functions/
    my_addon/
      hello.mcfunction
```

The path from the `functions` folder to the file, without `.mcfunction`, is the function's name. So the file above is run with:

```
/function my_addon/hello
```

Folders inside `functions` just organize your files. A common habit is to make one folder named after your addon (like `my_addon`) so your functions don't get mixed up with anyone else's.

> **Warning:** Use lowercase letters, numbers, and underscores in function file and folder names. Spaces and capital letters cause trouble.

## Which version of the rules do functions follow?

Commands change over time. A function runs using the command rules of the Minecraft version declared by your behavior pack's `min_engine_version` in its manifest. This is one reason your manifest matters (see [Lesson 2.3](../02-creating-your-first-project/03-your-first-manifest.md)).

> **Version note:** The syntax of `/execute` changed substantially in version 1.19.50. This course uses the modern syntax, and your manifest's `min_engine_version` of `[1, 26, 30]` is well past that point. If you copy `/execute` commands from an old tutorial, they may fail.

## Ways functions get run

You can trigger a function in three main ways:

1. **By hand,** with `/function folder/name` in chat.
2. **From another function,** by putting `function folder/name` as a line inside it.
3. **Automatically every tick,** by listing it in `BP/functions/tick.json`.

You'll practice all three in this chapter.

## Permissions

Running `/function` needs command permission, so create your test worlds with **cheats enabled**. [Lesson 5.1](../05-testing-and-troubleshooting/01-testing-in-a-world.md) covers world setup in detail.

## Recap

- A function is a file of commands, run together with one `/function` command.
- Function files use `.mcfunction`, no leading slashes, one command per line, and `#` for comments.
- They live in `BP/functions/`, and the path inside that folder is the function's name.
- They can be run by hand, from other functions, or automatically with `tick.json`.

**Previous:** [Exporting and Testing Your Project](../02-creating-your-first-project/05-exporting-and-testing.md) | **Next:** [Writing Your First mcfunction](02-your-first-mcfunction.md)
