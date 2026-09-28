# What Is a Minecraft Bedrock Addon?

An addon is a bundle of files that changes how Minecraft Bedrock Edition looks or behaves. Add a new item, retexture the pickaxe, make zombies drop emeralds, run a command every time a player joins: that's all addon territory.

This lesson explains what addons are actually made of, what they can do, and where their limits are, so the rest of the course doesn't feel like magic.

## Addons are data, not code you compile

A lot of people picture "modding" as writing a big program that gets injected into the game. Bedrock addons mostly don't work like that. They're **data-driven**: you write plain text files that describe things, and Minecraft reads those files and builds the behavior from them.

Here's the mental model. A creeper isn't hard-coded as "a creeper" from scratch. Minecraft has a file that says, roughly: this entity is called `minecraft:creeper`, it has this much health, it walks, it explodes when it's near a player, it fears cats. Change the file, and the creeper changes.

In fact, vanilla Minecraft is built from the same kinds of files you'll write. Mojang publishes a sample copy of them (search for "bedrock-samples" on GitHub), and reading them is one of the best ways to learn.

## The three ingredients

Addons are built from three things, and you'll use all three in this course:

1. **JSON files.** JSON is a text format for describing structured data. Items, blocks, entities, recipes, and loot tables are all JSON. You'll learn it properly in [Lesson 4.1](../04-customizing-minecraft/01-json-in-addons.md).
2. **mcfunction files.** A function is a text file full of the same commands you'd type in chat, one per line. They let you save and reuse command logic. Chapter 3 is all about these.
3. **Scripts (optional, advanced).** Minecraft can run JavaScript through its scripting API for logic that JSON and commands can't easily express. This course doesn't teach scripting, but you'll see where it fits in [Lesson 4.5](../04-customizing-minecraft/05-animations-and-other-customization.md).

You'll also work with images (PNG textures) and, later, possibly models and sounds.

## What addons can do

- Add custom **items**, **blocks**, and **entities** (mobs and other things that move around).
- Change or replace **textures**, models, and sounds.
- Change how vanilla things behave, such as loot tables, recipes, and spawn rules.
- Run **commands and logic** automatically with functions.
- Add gameplay systems with the scripting API.

## What addons can't do

- They can't change the game engine itself. You can only use the features Mojang has exposed through files and APIs.
- They're not Java Edition mods. Java mods and Bedrock addons are separate systems, and their files aren't interchangeable. If you find a "mod" tutorial for Java, it won't apply here.
- Some things are limited by platform. Consoles in particular are more restricted about importing packs.

> **Version note:** Bedrock gets new addon features regularly, and things that were impossible a year ago sometimes become possible. If a tutorial says "you can't do X," check its date.

## Where addons run

Addons work on Bedrock Edition across its supported platforms, which is a big reason to make them: one addon can reach players on Windows, mobile, and more. How you *import* a pack differs by platform, and [Lesson 2.5](../02-creating-your-first-project/05-exporting-and-testing.md) covers that.

## What you'll build in this course

A small addon called **My First Addon**: a few functions that run automatically, a custom item with its own texture, and a retextured vanilla item. It's small on purpose. The point is understanding the whole pipeline, from an empty project to a shareable file, so that making the *next* addon is just a matter of adding more.

## Recap

- Addons are folders of text files and images that Minecraft reads to change how the game looks and behaves.
- Most of the work is JSON, mcfunction, and textures. Scripting is optional and comes later.
- Addons can add and modify a lot, but they can't change the engine, and they aren't Java mods.

**Next:** [Behavior Packs vs Resource Packs](02-behavior-packs-vs-resource-packs.md)
