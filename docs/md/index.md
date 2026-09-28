# mcbCode Beginner Course: Build Your First Minecraft Bedrock Addon

This course takes you from "what even is an addon?" to a finished, tested addon that you can share with other people. You'll do all of it in your browser using mcbCode, and you won't need a terminal, a code editor, or any paid software besides Minecraft itself.

Every lesson builds on one running project called **My First Addon**. You'll set up its folders, write its manifests, add a few functions, create a custom item, swap in a custom texture, break things on purpose, fix them, and finally package it up.

You don't need any programming experience. When a lesson introduces a new term (JSON, UUID, selector, and so on), it explains it right there and then.

## Who this is for

- People who have never made an addon.
- People who have tried copying files from a tutorial and ended up with a pack that does nothing.
- People who can follow instructions but want to understand *why* the instructions work, so they can go off-script later.

## What you need

- **Minecraft Bedrock Edition** on a device where you can import packs (Windows, Android, and iOS/iPadOS are the easy ones; see [Tools and Accounts](01-getting-started/03-tools-and-accounts-you-need.md)). This is the only thing on the list that costs money.
- A free mcbCode account and a web browser.
- A free image editor for making textures. [Lesson 1.3](01-getting-started/03-tools-and-accounts-you-need.md) has suggestions.

Some mcbCode features are marked as **Obsidian** features in the site itself (private projects, snapshots, GitHub sync, custom share links). This course only mentions them where they're relevant, and you never need them to finish.

## Recommended order

Go through the chapters in order the first time. Each one leans on the one before it.

- Chapters 1 and 2 are required before anything else. Chapter 2 is where you build the project everything else lives in.
- Chapters 3 and 4 are fairly independent of each other. If you're more excited about custom items than commands, you can do Chapter 4 first, but you'll want to have at least skimmed Chapter 2.
- Chapter 5 is best read after you've built *something* to break. You'll get more out of it that way.
- Chapter 6 comes last because it assumes you have a finished addon to polish.

## How the lessons are written

Every lesson has a short intro, clear headings, a **Recap** at the end, and (where it fits) an **Exercise**. You'll see three kinds of callouts:

> **Warning:** Something that commonly goes wrong or can break your project.

> **Version note:** Something that depends on which version of Minecraft you're running. Minecraft changes often, so treat these as "double-check before you rely on it."

> **Tip:** A shortcut or habit that saves time.

## A note on Minecraft versions

This course was written in September 2026 against the Bedrock Edition 26.x release line. Minecraft's public version numbers now look like `26.50`, while the version numbers you type inside pack files still look like `1.26.50`. The two are the same release written two ways. The lessons use `1.26.30` as the format version in examples, which is what mcbCode's own Create Block and Create Item tools write, so the two match.

Addon formats change more often than most people expect. Whenever a lesson depends on a specific version, it says so. If something doesn't work, [Lesson 5.5](05-testing-and-troubleshooting/05-checking-compatibility.md) covers how to check.

## Course contents

### Chapter 1: Getting started

1. [What Is a Minecraft Bedrock Addon?](01-getting-started/01-what-are-addons.md): what addons can and can't do.
2. [Behavior Packs vs Resource Packs](01-getting-started/02-behavior-packs-vs-resource-packs.md): the two halves of every addon.
3. [The Tools and Accounts You'll Need](01-getting-started/03-tools-and-accounts-you-need.md): a $0 setup, plus the one Minecraft setting to turn on now.
4. [Addon File Formats Explained](01-getting-started/04-addon-file-formats.md): `.json`, `.mcfunction`, `.mcaddon`, and friends.

### Chapter 2: Creating your first project

1. [Creating a Project in mcbCode](02-creating-your-first-project/01-creating-a-project-in-mcbcode.md)
2. [Projects, Files, and Folders](02-creating-your-first-project/02-projects-files-and-folders.md)
3. [Writing Your First Manifest](02-creating-your-first-project/03-your-first-manifest.md)
4. [UUIDs and Pack Modules](02-creating-your-first-project/04-uuids-and-modules.md)
5. [Exporting and Testing Your Project](02-creating-your-first-project/05-exporting-and-testing.md)

### Chapter 3: Learning mcfunction

1. [What Functions Are and How They Work](03-learning-mcfunction/01-what-are-functions.md)
2. [Writing Your First mcfunction](03-learning-mcfunction/02-your-first-mcfunction.md)
3. [Commands, Selectors, and Coordinates](03-learning-mcfunction/03-commands-selectors-coordinates.md)
4. [Scoreboards and Basic Logic](03-learning-mcfunction/04-scoreboards-and-basic-logic.md)
5. [Organizing and Running Functions](03-learning-mcfunction/05-organizing-and-running-functions.md)

### Chapter 4: Customizing Minecraft

1. [Understanding JSON in Addons](04-customizing-minecraft/01-json-in-addons.md)
2. [Your First Custom Item](04-customizing-minecraft/02-custom-items.md)
3. [Custom Entities: The Big Picture](04-customizing-minecraft/03-custom-entities-big-picture.md)
4. [Textures and Resource Packs](04-customizing-minecraft/04-textures-and-resource-packs.md)
5. [Animations and Other Customization Concepts](04-customizing-minecraft/05-animations-and-other-customization.md)

### Chapter 5: Testing and troubleshooting

1. [Testing Your Addon in a World](05-testing-and-troubleshooting/01-testing-in-a-world.md)
2. [Reading Content Log Errors](05-testing-and-troubleshooting/02-content-log-errors.md)
3. [Fixing Invalid JSON and Common Mistakes](05-testing-and-troubleshooting/03-fixing-json-and-common-mistakes.md)
4. [Missing Textures and Broken Behavior](05-testing-and-troubleshooting/04-missing-textures-and-broken-behavior.md)
5. [Checking Compatibility](05-testing-and-troubleshooting/05-checking-compatibility.md)

### Chapter 6: Finishing and publishing

1. [Organizing a Finished Project](06-finishing-and-publishing/01-organizing-a-finished-project.md)
2. [Testing and Reviewing Your Addon](06-finishing-and-publishing/02-testing-and-reviewing.md)
3. [Preparing Your Addon for Sharing](06-finishing-and-publishing/03-preparing-to-share.md)
4. [Publishing and Maintaining Your Addon](06-finishing-and-publishing/04-publishing-and-maintaining.md)

## The running project

By the end you'll have a project shaped like this:

```
My First Addon/
  BP/
    manifest.json
    pack_icon.png
    functions/
      tick.json
      my_addon/
        setup.mcfunction
        hello.mcfunction
        welcome.mcfunction
        tick_loop.mcfunction
    items/
      ruby.json
  RP/
    manifest.json
    pack_icon.png
    textures/
      item_texture.json
      items/
        ruby.png
```

Don't worry about what all of that means yet. By Chapter 4 every line of it will make sense.

Ready? Start with [What Is a Minecraft Bedrock Addon?](01-getting-started/01-what-are-addons.md).
