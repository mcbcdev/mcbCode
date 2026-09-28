# mcbCode MCP

Connect your mcbCode projects to Claude, ChatGPT, and other AI tools.

## What is this?

mcbCode MCP lets AI assistants read your Minecraft Bedrock addon projects directly — no copy-pasting files back and forth. Once connected, an AI tool can look up your project info, list your files, read specific files, and search across a project, the same way it would use any other tool you give it access to.

This is a **read-only** connection right now. Nothing it does can edit, delete, or create anything in your projects.

## The endpoint

`https://mcp.mcbcode.com/mcp`

Paste that URL into any MCP-compatible client's connector settings. You'll be sent to mcbCode to log in (if you aren't already) and approve access — you never give the AI tool your mcbCode password.

## What it can access

### get\_project

Basic project info — name, description, owner, visibility, tags.

### list\_files

The file/folder tree of a project. Paths and names only, no contents.

### read\_file

The contents of one specific file you (or the AI) pick.

### search\_files

Text search across a project's files, with matching lines and context.

An AI tool can only reach projects you own, projects you collaborate on, or public projects — same rules as everywhere else on mcbCode. It can't see anyone else's private projects, and it can't see your account info beyond what's needed to check those permissions.

## How authentication works

This uses standard OAuth, the same kind of "Connect with X" flow you've used elsewhere:

- You click connect in your AI client
- You're sent to mcbCode to log in (if needed)
- You see exactly what access is being requested and approve or deny it
- mcbCode gives the AI client a scoped, revocable token — never your password or session

That token can be revoked at any time (see "Disconnecting" below), and it only grants the read-only access described above.

## Supported clients

### Claude tested

Add mcbCode as a custom connector in Claude's connector settings.

### ChatGPT, Cursor, VS Code, others untested

Built against the standard MCP spec, so these should work, but haven't been verified yet. If you try one and hit an issue, let us know.

## Free vs Obsidian

Read-only MCP access works the same for everyone right now — project visibility and collaborator permissions apply exactly like they do on the site. Obsidian members will get higher request limits and, later, additional capabilities (editing files, creating projects, exporting) as those are added.

## Privacy &amp; security

- Your mcbCode password is never shared with any AI client.
- Access tokens are scoped to read-only project access and expire automatically.
- Every request is checked against the same ownership/collaborator rules as the normal site — an AI client can't see anything you couldn't see yourself.
- You can revoke access at any time; it takes effect immediately.

## Disconnecting

Go to your [profile settings](https://mcbcode.com/profile) (the "settings" tab on your profile) to see everything connected to your mcbCode account and revoke access for any of them. Revoking access immediately invalidates that connection — the AI client will need to reconnect and get your approval again to use mcbCode after that.
