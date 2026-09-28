# Checking Compatibility

An addon that works on your device today might break on someone else's, or on yours after the next Minecraft update. This lesson covers what "compatibility" means for addons, how the version numbers in your files relate to the game, and how to check that your addon will behave for other players.

## Why compatibility is a real issue

Minecraft Bedrock updates frequently, and addon formats update with it. New components appear, old ones change, and some are deprecated. Three things can differ between your device and a player's:

1. **The game version** they're running.
2. **The platform** they're playing on.
3. **Other packs** they have active alongside yours.

## Understanding the version numbers

There are several version numbers in play, and they mean different things.

| Where | Example | Meaning |
| --- | --- | --- |
| The game's public version | `26.50` | The release the player is running |
| `min_engine_version` in the manifest | `[1, 26, 30]` | The oldest game version your pack is designed for |
| `format_version` in a JSON file | `"1.26.30"` | Which rules Minecraft uses to read that file |
| `version` in the manifest header | `[1, 0, 0]` | *Your pack's* version, bumped when you update it |

> **Version note:** Since 2026, Bedrock's public version numbers look like `26.50`, while pack files write the same release as `1.26.50`. At the time of writing (September 2026), the current stable release is 26.50, and preview builds of 26.60 are being tested. Check Minecraft's current release notes for the latest.

### The relationship between them

- Your **`min_engine_version`** says "I need at least this version." Set it to the oldest version you've actually tested and can support.
- Each file's **`format_version`** should not be *newer* than that. If a file uses a feature from format `1.26.30`, then the game running it must be at least 1.26.30.
- Your pack's own **`version`** has nothing to do with Minecraft's version. It's your own numbering, and it exists so Minecraft can tell one release of your pack from another.

The simple rule for this course: keep `min_engine_version` and your files' `format_version` consistent. This course uses `1.26.30` for both, which mcbCode's Create tools also use.

### What happens when they don't fit

- If a player's game is **older** than your `min_engine_version`, Minecraft may refuse to load the pack or show a compatibility warning.
- If a file's `format_version` is **newer** than the game, that file may fail to load, and the content log will report it.
- If your `format_version` is very **old**, Minecraft usually still reads it, but you'll be missing newer features, and some old formats eventually get retired.

### Which versions to target

Microsoft's guidance for creators is to build against the most recent release of Minecraft: Bedrock Edition, and to treat versions within one minor version of the current release as up to date. In practice:

- **Target the current stable release** while you're learning.
- **Avoid depending on Preview-only features** in something you plan to publish, because Preview features can change or disappear before they reach the release.
- **Choose `min_engine_version` deliberately.** A higher one gives you newer features. A lower one lets more players use the pack, but limits what you can build.

To lower your addon's requirements, change `min_engine_version` and your `format_version` values together, and then re-test everything, because some components don't exist in older formats.

## Version-specific behavior in functions

Functions follow the command rules of the version in your manifest's `min_engine_version`. Commands copied from older tutorials may use syntax that changed. The biggest change to know is the `/execute` rewrite from 1.19.50. If a copied `execute` command fails, that's the first thing to suspect.

## Platform differences

Addons run across Bedrock platforms, but they aren't identical everywhere:

- **Importing** works differently on each platform (see [Lesson 2.5](../02-creating-your-first-project/05-exporting-and-testing.md)). Consoles have the tightest limits.
- **Path length.** Community guidance is to keep any file path under about 80 characters, because of console limits. Short folder and file names avoid the issue.
- **Performance.** Mobile and console devices have less headroom than a gaming PC. A tick function that's fine on your desktop could stutter on a phone.
- **Scripting and experimental features** may differ in availability or maturity across platforms.

## Experimental features

Some features are gated behind **experimental toggles** in the world settings. If a component's documentation says it needs one, players will have to enable it too, and enabling experiments has side effects (in particular, it can disable achievements). Avoid requiring experimental toggles unless you have to, and say so clearly on your addon's page if you do.

## Compatibility with other packs

Players rarely run only your addon. To play nicely with others:

- **Use a unique namespace** for every identifier, short name, and function folder. That prevents clashes.
- **Be careful with vanilla overrides.** If your addon overrides a vanilla texture, and another pack does too, only one wins. Be upfront about what your pack overrides.
- **Don't reuse UUIDs** from other packs, including copies of your own experiments.

## A compatibility checklist

Run through this before you call a version done:

- [ ] `min_engine_version` is set deliberately, and matches the newest `format_version` in use.
- [ ] Tested on the current stable release.
- [ ] Content log is clean on a fresh world.
- [ ] Tested on at least one platform besides your main one, if possible.
- [ ] Every identifier uses your own namespace.
- [ ] No unnecessary experimental toggles.
- [ ] File paths are short.
- [ ] Notes about required versions or toggles are ready for your addon's page.

## After Minecraft updates

When a new Minecraft version comes out, re-test your addon, even if you didn't change anything. Read the release notes for creators (Microsoft publishes them), watch for anything you rely on being changed or deprecated, and update `format_version` and `min_engine_version` when you've verified your files work with the new rules. Bump your pack's own `version` whenever you re-release.

## Exercise

1. Open your two manifests in the raw view. Write down every version number you find and what each one means.
2. Open `BP/items/ruby.json` and confirm its `format_version` is not newer than the `min_engine_version` in the BP manifest.
3. Find your game's exact version (in Minecraft's settings or help screen) and compare it to your `min_engine_version`.

## Recap

- Several version numbers exist: the game's, `min_engine_version`, each file's `format_version`, and your pack's own `version`.
- Keep `min_engine_version` and `format_version` consistent, target the current stable release, and avoid Preview-only features in published work.
- Platforms, other packs, and experimental toggles also affect compatibility.
- Re-test after each Minecraft update.

That's Chapter 5. You now have the debugging toolkit. Next: turning a working addon into a finished one.

**Previous:** [Missing Textures and Broken Behavior](04-missing-textures-and-broken-behavior.md) | **Next:** [Organizing a Finished Project](../06-finishing-and-publishing/01-organizing-a-finished-project.md)
