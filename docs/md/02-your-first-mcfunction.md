# Writing Your First mcfunction

Enough theory. In this lesson you'll write a real function in mcbCode, export it, and run it in a world. It's a small function, but it covers the whole workflow you'll use for everything else in this chapter.

## Step 1: Create the file

You made the folders for this in [Lesson 2.2](../02-creating-your-first-project/02-projects-files-and-folders.md). If you skipped that exercise, create `functions` inside `BP`, and `my_addon` inside `functions`.

1. Open **BP**, then **functions**, then **my_addon**.
2. Click **+ Add Files**, then **+ File**.
3. Name it `hello.mcfunction` (extension included).

Click it to open the editor. mcbCode highlights mcfunction syntax, so commands and comments show up in different colors.

## Step 2: Write the function

Type this into the editor:

```
# hello.mcfunction - my first function
say Hello from my first function!
tellraw @s {"rawtext":[{"text":"You ran a function!"}]}
give @s minecraft:diamond 1
playsound random.levelup @s
```

Click **Save**.

## What each line does

**Line 1** is a comment. Minecraft skips it. Use comments freely to explain your own work.

**`say Hello from my first function!`** broadcasts a chat message to everyone in the world. It's the simplest command there is, and a good "is my function running?" test.

**`tellraw @s {"rawtext":[{"text":"You ran a function!"}]}`** sends a message to just one player. `@s` means "the thing running this command" (more on that in the [next lesson](03-commands-selectors-coordinates.md)). The odd-looking `{"rawtext":[...]}` part is JSON. It's the format `tellraw` uses to describe text. For now, treat it as a template: put your message inside the quotes after `"text":`.

**`give @s minecraft:diamond 1`** gives the player one diamond. Notice the full name of the item is `minecraft:diamond`. Items have a namespace (`minecraft`) and a name (`diamond`), separated by a colon. Your custom items will use your own namespace instead, which you'll see in [Lesson 4.2](../04-customizing-minecraft/02-custom-items.md).

**`playsound random.levelup @s`** plays the level-up sound to the player.

## Tip: test commands in chat first

Every time you change a function, you have to export and re-import your addon, which takes a minute. Save yourself that by typing new commands into chat first. If `/give @s minecraft:diamond 1` works in chat, you know it'll work in a function. Once a command behaves the way you want, paste it into your function without the slash.

## Step 3: Export and run it

1. Bump the version number in both manifests (see [Lesson 2.5](../02-creating-your-first-project/05-exporting-and-testing.md)) so Minecraft picks up the change.
2. Click **Export** and import the new `.mcaddon`.
3. Create a **new world** with **cheats enabled**, and activate both packs in the Add-Ons section.
4. In the world, open chat and type:

```
/function my_addon/hello
```

You should see the messages, hear the sound, and find a diamond in your inventory.

## If it doesn't work

Work through these in order:

- **The command isn't recognized or the function isn't found.** The pack may not be active in this world, or the file may be in the wrong place. Confirm the path is exactly `BP/functions/my_addon/hello.mcfunction`, all lowercase.
- **You get a permissions error.** Cheats are off in this world.
- **Some lines ran and some didn't.** Check the content log for a message about the failing command. A typo in one command doesn't always stop the others, which can make this confusing.
- **Nothing changed after re-importing.** The world is still using an old copy. Test in a brand-new world.

[Chapter 5](../05-testing-and-troubleshooting/01-testing-in-a-world.md) covers debugging in much more depth.

## Exercise

Make a second function called `party.mcfunction` in the same folder. It should:

1. Say something in chat.
2. Give the player a cake (`minecraft:cake`).
3. Give the player a speed effect for 30 seconds: `effect @s speed 30 1 true`.

Then run it with `/function my_addon/party`.

The effect command's format is `effect <who> <effect> <seconds> <level> <hide particles>`, so `speed 30 1 true` means speed, for 30 seconds, at level 1, hiding the particles.

## Recap

- Create `.mcfunction` files inside `BP/functions/`, name them with the extension, and write one command per line without the `/`.
- Run a function with `/function folder/name`. The name is its path inside `functions`, minus the extension.
- Test new commands in chat first, then move them into a function.
- Changes only appear after you export, re-import, and (to be safe) test in a fresh world.

**Previous:** [What Functions Are and How They Work](01-what-are-functions.md) | **Next:** [Commands, Selectors, and Coordinates](03-commands-selectors-coordinates.md)
