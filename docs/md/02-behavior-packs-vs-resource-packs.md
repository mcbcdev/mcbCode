# Behavior Packs vs Resource Packs

Every addon is made of one or two **packs**, and there are exactly two kinds you need to know about: behavior packs and resource packs. Understanding the split now will save you hours of confusion later, because it decides where every single file you create belongs.

## The one-sentence version

- A **behavior pack (BP)** controls what things *do*.
- A **resource pack (RP)** controls what things *look and sound like*.

## Behavior packs

A behavior pack holds the game logic. It's the "server side" of your addon. It defines things like:

- What custom **items**, **blocks**, and **entities** exist, and what they can do.
- **Functions** (`.mcfunction` files) and the `tick.json` file that runs them automatically.
- **Loot tables** (what drops from what) and **recipes** (what crafts into what).
- **Spawn rules** (where and when mobs appear).
- **Scripts**, if you use the scripting API.

## Resource packs

A resource pack holds what players see and hear. It's the "client side". It defines things like:

- **Textures** (PNG images) for items, blocks, and mobs.
- **Models** (the 3D shape of an entity or block).
- **Animations**, **particles**, and **sounds**.
- **Text**: the language files that give things their display names.
- The client-side half of a custom entity (which model, texture, and animations it uses).

## Why does Minecraft split them?

Because of multiplayer. In a multiplayer world, the server decides what happens (a zombie has 20 health, a custom sword deals damage), and each player's game decides how to draw it. Keeping logic and visuals separate lets the server run the first and each player's device run the second.

You don't need to think about servers to make addons, but the split explains why a single custom item needs files in both packs.

## A custom item touches both

Take a custom ruby item, which you'll build in [Lesson 4.2](../04-customizing-minecraft/02-custom-items.md):

| File | Pack | What it does |
| --- | --- | --- |
| `items/ruby.json` | Behavior | Declares that the item exists and what it can do. |
| `textures/items/ruby.png` | Resource | The image you see in your inventory. |
| `textures/item_texture.json` | Resource | Connects a short name to that image. |

Miss the behavior file and the item doesn't exist. Miss the resource files and the item exists but looks broken. This kind of half-working state is the most common beginner problem, and knowing which pack owns which job tells you where to look.

## Do you always need both?

No. It depends on what you're making:

- A **functions-only addon** (say, a system that runs commands automatically) needs only a behavior pack.
- A **retexture** (new looks for existing stuff) needs only a resource pack.
- A **custom item, block, or entity** needs both.

When an addon has both packs, they're usually bundled into one `.mcaddon` file so players can install everything at once. You'll learn about that format in [Lesson 1.4](04-addon-file-formats.md).

## How the two packs find each other

Two packs sitting next to each other don't automatically know about each other. Each pack has its own **manifest** file (an identity card for the pack), and one pack can list the other as a **dependency**. That's how a behavior pack can say "I need that resource pack too." You'll set this up yourself in [Lesson 2.4](../02-creating-your-first-project/04-uuids-and-modules.md).

## How this looks in mcbCode

In mcbCode, your project's top level holds two folders named **BP** and **RP**. Everything you create goes inside one of them. mcbCode limits the project root to those two folders, and when you export, it builds your `.mcaddon` from them. [Chapter 2](../02-creating-your-first-project/01-creating-a-project-in-mcbcode.md) walks through this.

## Exercise

For each item below, decide whether it belongs in the behavior pack (BP) or resource pack (RP). Answers are underneath.

1. A PNG image of a new sword.
2. A file that makes zombies drop rotten flesh less often.
3. A `.mcfunction` file that gives players a welcome message.
4. A custom sound effect.
5. The definition of a new block's hardness and drops.

**Answers:** 1 is RP. 2 is BP (loot tables). 3 is BP. 4 is RP. 5 is BP.

## Recap

- Behavior pack = logic. Resource pack = visuals and sound.
- A custom item, block, or entity usually needs files in both.
- Packs are linked to each other through their manifests, which you'll write in Chapter 2.

**Previous:** [What Is a Minecraft Bedrock Addon?](01-what-are-addons.md) | **Next:** [The Tools and Accounts You'll Need](03-tools-and-accounts-you-need.md)
