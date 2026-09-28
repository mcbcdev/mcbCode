# Exporting and Testing Your Project

Your project has two manifests but no actual content yet. That's fine. This lesson gets you through the full loop once with an empty addon: export from mcbCode, import into Minecraft, and confirm Minecraft sees both packs. Getting this loop working now means every later lesson is just "change something, run the loop again."

## Before you export: add pack icons

Open BP and click the faded **Add a pack_icon.png** row (see [Lesson 2.2](02-projects-files-and-folders.md)). Choose a PNG from your computer. mcbCode copies it into both BP and RP.

A pack icon is commonly a square image around 256x256 pixels, but any small square PNG will give you something to look at. You can replace it later.

## Export from mcbCode

1. Make sure you're **logged in**. The **Export** button is greyed out if you aren't.
2. Click **Export** in the project header.
3. The button text changes as it works (for example "Checking files...", then "Packing BP/RP...", then "Building .mcaddon...").
4. Your browser downloads the file.

What you get depends on what's in your project:

| Project has | You get |
| --- | --- |
| Both a **BP** and an **RP** folder | `Project Name.mcaddon` |
| Only one of them | `Project Name.mcpack` |

The file is named after your project, with unusual characters stripped out.

There's one warning you might see. If any files are sitting loose at the root of the project (outside BP and RP), mcbCode lists them and lets you continue. Those loose files aren't included in the addon, so if you see something in that list you care about, move it into BP or RP first.

> **Warning:** mcbCode identifies the packs by their folder names: `BP` and `RP`. If you rename those folders to something else, the export won't recognize them as packs. Keep the names as they are.

## Import into Minecraft

How you import depends on your device:

- **Windows:** double-click the `.mcaddon` file. Minecraft opens and imports it.
- **Android:** open the file (from your Downloads or Files app) and choose Minecraft to open it with.
- **iOS / iPadOS:** open the file in the Files app and use the share option to send it to Minecraft.
- **Consoles:** as far as I know, these can't open pack files directly. Test on another device.

Minecraft shows an import message when it finishes. If it reports a failure instead, jump to [Lesson 5.2](../05-testing-and-troubleshooting/02-content-log-errors.md), because that's exactly what the content log is for.

> **Version note:** Import steps vary a little between versions and platforms. If yours doesn't match, check Minecraft's current help pages for your device.

## Check that Minecraft sees your packs

A quick check, before making a full test world:

1. In Minecraft, create a new world (or edit an existing one).
2. Open the world's settings and find the **Add-Ons** section.
3. Look under both **Behavior Packs** and **Resource Packs**.
4. You should see **My First Addon BP** and **My First Addon RP** with your pack icon.

Seeing both in the list means the manifests are valid and the packs were imported. You can activate them here now or wait until [Lesson 5.1](../05-testing-and-troubleshooting/01-testing-in-a-world.md), which covers world setup in more detail.

Since the addon doesn't do anything yet, there's nothing to *see* in the world. That's expected.

## What "working" looks like

- Minecraft reports a successful import.
- Both packs appear in the world's Add-Ons list with the right names.
- The content log (which you turned on in [Lesson 1.3](../01-getting-started/03-tools-and-accounts-you-need.md)) shows no errors about your packs.

## The update loop

From now on, every change you make follows the same cycle:

1. Edit files in mcbCode and **Save**.
2. **Export** a fresh `.mcaddon`.
3. **Import** it into Minecraft.
4. Test in a world. Check the content log.

Step 3 has a gotcha, and it's the source of many "my changes don't show up" reports. Worlds keep their own copy of the packs they use. If you re-import an updated addon, an existing world may keep using its old copy. The habit that avoids this is:

- **Bump the `version`** in your manifests when you re-export. Use the **View Raw JSON** view in the manifest editor to change `[1, 0, 0]` to `[1, 0, 1]`, since the visual editor doesn't have a version field.
- **Test in a fresh world** when in doubt. A brand-new world always picks up the current files.

[Lesson 5.1](../05-testing-and-troubleshooting/01-testing-in-a-world.md) goes into this properly.

## Exercise

1. Add a `pack_icon.png`.
2. Export your project and confirm you got a `.mcaddon` file.
3. Import it and find both packs in a world's Add-Ons list.
4. Open the content log history (**Ctrl + H** on Windows, or via Settings > Creator) and confirm there are no errors from your packs.

If you got all four, Chapter 2 is done. You have a real addon skeleton.

## Recap

- **Export** builds a `.mcaddon` (BP and RP) or `.mcpack` (only one pack) from your project. You need to be logged in.
- Import by opening the file on your device. Minecraft handles the rest.
- Both packs showing in the world's Add-Ons list means the manifests work.
- Worlds can hold onto old copies of packs. Bump your version and test in a fresh world when changes don't appear.

**Previous:** [UUIDs and Pack Modules](04-uuids-and-modules.md) | **Next:** [What Functions Are and How They Work](../03-learning-mcfunction/01-what-are-functions.md)
