# Creating a Project in mcbCode

Time to make something real. In this lesson you'll create your first mcbCode project, get oriented in its layout, and understand what the page is telling you. Everything you build for the rest of the course lives inside this project.

## What a project is

A **project** in mcbCode is a workspace that holds all the files and folders for one addon. Think of it as the folder you'd normally keep on your computer, except it lives on mcbCode. It has a name, a description, and a share link, and you can invite collaborators to work in it with you.

## Create your project

1. Log in at [mcbcode.com](https://mcbcode.com).
2. Go to your **dashboard**. This is where your projects are listed.
3. Use the option there to create a new project.
4. Name it **My First Addon**, and add a short description if you're asked.

<!-- VERIFY: the dashboard / create-project screen wasn't included in the supplied mcbCode page code, so exact button labels and fields aren't documented here. Fill in the real labels before publishing. -->

Once it's created, you'll land on your project page.

> **Tip:** Pick a name you'll recognize later. You can rename the project in its settings, but the share link is generated from a code, not from the name.

## The first-time walkthrough

The first time you open a project you own, mcbCode runs a short on-screen tutorial that highlights the file panel, the editor, the Save and Close buttons, and Project Settings. You can step through it with **Next** or skip it. It's worth doing once, since it points at the same things this chapter covers.

## Getting oriented

The project page has a few main areas.

**The header** shows the project name and a badge that says either **public** or **private**. Next to it are the action buttons, which change depending on who you are. As the owner you'll see things like **+ Add Files**, a small dots button for creating blocks and items, **Watching**, **Export**, and **Share**.

**The side panel** shows a summary of the project: its description, who owns it, when it was last updated (shown as "5 minutes ago" and so on), the share code, and how many files and folders it contains.

**The file panel** is the main area. It shows the contents of whichever folder you're in, with a path bar above it that shows where you are.

**The Settings tab** is visible to the owner only. It holds the project name, description, tags, collaborators, and a few "danger zone" actions like resetting all files or deleting the project.

## BP and RP come pre-made

Every addon needs a behavior pack and a resource pack folder (see [Lesson 1.2](../01-getting-started/02-behavior-packs-vs-resource-packs.md)). In mcbCode, these are two folders at the root of your project named **BP** and **RP**.

When you open a brand-new project, mcbCode sets those up for you and shows a message along the lines of "your addon is ready," explaining that you don't have to understand every folder inside them yet.

If one of them is ever missing (say you deleted it), mcbCode shows a short explanation of what BP and RP mean at the project root, along with **+ BP folder** and **+ RP folder** buttons to recreate whichever is missing.

## Public vs private

New projects are **public** by default. In mcbCode's terms, that means anyone with the link can *view* the project. Two details matter here:

- Viewing file contents requires being **logged in**. Someone who isn't logged in can see the project page but not read the files.
- Making a project **private** is listed as an Obsidian feature, so on a standard account, assume everything you put in a project is viewable by people who have the link.

The practical rule for this course: don't put anything in a project that you wouldn't want a link-holder to read. An addon is meant to be shared eventually anyway.

## Exercise

1. Create a project named **My First Addon**.
2. Confirm that you can see both a **BP** and an **RP** folder.
3. Look at the side panel and find the share code and the file and folder counts.
4. If you skipped the walkthrough, open the Settings tab and look around. Don't change anything.

## Recap

- A project is a workspace for one addon, with a name, description, and share link.
- New projects come with **BP** and **RP** folders at the root.
- Projects are public by default. Anyone with the link can view them (if they're logged in). Private projects are an Obsidian feature.

**Previous:** [Addon File Formats Explained](../01-getting-started/04-addon-file-formats.md) | **Next:** [Projects, Files, and Folders](02-projects-files-and-folders.md)
