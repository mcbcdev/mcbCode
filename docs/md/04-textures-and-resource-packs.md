# Textures and Resource Packs

You've already used a resource pack to give your Ruby an icon. This lesson goes deeper on how textures work, how to override *vanilla* textures (change how existing things look), and how to use mcbCode's **Replace Texture** tool to do it without hunting for file paths.

## What a texture is

A texture is a PNG image that gets wrapped onto something in the game: an item icon, a block face, a mob's body. Textures live in the resource pack under `textures/`, organized by what they're for:

```
RP/
  textures/
    items/       <- item icons
    blocks/      <- block faces
    entity/      <- mob skins
    item_texture.json
    terrain_texture.json
```

Two files in that list aren't images. They're **registration files** that give short names to textures:

- **`item_texture.json`** registers item icons. You wrote one in [Lesson 4.2](02-custom-items.md).
- **`terrain_texture.json`** registers block textures.

Entity textures skip the short-name step. The client entity file points straight at the path (see [Lesson 4.3](03-custom-entities-big-picture.md)).

## Texture basics

- **Format:** PNG.
- **Size:** item and block textures are usually **16x16** pixels. Other sizes exist (32x32, 64x64, and up), but for a beginner, 16x16 is the safe default.
- **Transparency:** PNG supports transparent pixels, which is how items get their non-rectangular outlines.
- **Pixel art tip:** don't let your editor smooth or blur when resizing. Use "nearest neighbor" or work at the true size, or your crisp pixels turn to mush.

## Your resource pack manifest

For textures to load at all, your resource pack needs its `manifest.json` with a module of type `resources` (you wrote this in [Lesson 2.4](../02-creating-your-first-project/04-uuids-and-modules.md)), and the pack has to be **active in the world**. A pack that isn't active does nothing, no matter how perfect the files are. That single fact explains a large share of "my texture isn't showing" reports.

## Overriding vanilla textures

Every vanilla texture has a path. The diamond item's icon, for example, lives at a path under `textures/items/`. If your resource pack contains a file at **the same path**, Minecraft uses yours instead. That's how retexture packs work: no code, just images in the right places.

So to change how an existing item looks, you need two things:

1. Your new image.
2. The exact path of the vanilla texture you want to replace.

Finding that path by hand is the annoying part, which is where mcbCode helps.

## The Replace Texture tool

mcbCode has a built-in browser of vanilla textures. To use it:

1. First, make sure your new image is **already uploaded** to the project as a PNG (via **+ Image** anywhere inside BP or RP). The tool picks from images already in your project. If there are none, it tells you to upload one first.
2. Click the small **dots** button in the toolbar and choose **Replace Texture**.
3. A browser opens showing folders and files under `textures/`. Click folders to open them, and use `..` to go up.
4. Click a texture to preview it, then confirm the replace.
5. mcbCode asks you to **pick one of your project's PNG images** to use as the replacement.
6. It writes your image into the RP at the matching path, creating any missing folders, and shows "done!" with the path that's now overridden.

Afterward, look in your RP. You'll find a new file at the same path as the vanilla texture, containing your image.

> **Tip:** Make sure your replacement is the same dimensions as the original. A 64x64 image swapped in for a 16x16 texture can look wrong or oversized.

## Exercise: retexture a vanilla item

1. Draw a new 16x16 texture for any vanilla item, for example a food item. Save it as a PNG.
2. Upload it to your project with **+ Image** (you can put it anywhere inside the RP, like `RP/textures/`).
3. Use **Replace Texture** to find that item's texture in the browser and replace it with your upload.
4. Bump the manifest versions, export, import, and check the item in a fresh world.

You'll now have a resource pack that changes vanilla, alongside your custom Ruby.

## What about the uploaded copy?

After Replace Texture, the image you originally uploaded is still in your project, and so is the new copy at the vanilla path. That's harmless. When you tidy up in [Lesson 6.1](../06-finishing-and-publishing/01-organizing-a-finished-project.md), you can delete the extra one if you don't want it in the exported pack.

## Custom vs overriding: which to use?

| Goal | Approach |
| --- | --- |
| Add something new (Ruby) | Custom item + `item_texture.json` short name |
| Change how an existing thing looks | Same-path override (Replace Texture) |

Both are legitimate. Many polished addons use both.

## Recap

- Textures are PNGs in the resource pack's `textures/` folder. Items and blocks also need short names registered in `item_texture.json` and `terrain_texture.json`.
- The resource pack must be active in the world, and its manifest must have a `resources` module.
- A file at the same path as a vanilla texture overrides it.
- mcbCode's **Replace Texture** tool finds vanilla texture paths for you and writes your image to the right spot.

**Previous:** [Custom Entities: The Big Picture](03-custom-entities-big-picture.md) | **Next:** [Animations and Other Customization Concepts](05-animations-and-other-customization.md)
