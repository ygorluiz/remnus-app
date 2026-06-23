I wanted my AI agents to actually own a workspace, not just peek at it. That was the whole reason this project exists.

The moment that pushed me over the edge was simple. I had Notion's MCP connector set up, and it was fine when I was sitting at my keyboard asking Claude to find a page or rewrite a paragraph. Then I tried to run an agent on a schedule with no browser open, and it stopped cold. The connector wants OAuth with a person present, every single time. The docs even say it does not support bearer tokens. So my nightly job had nowhere to put a credential. That was the itch I could not stop scratching.

## The one decision that shaped everything

Build MCP first, not MCP later.

Most tools add an agent connector once the product is already mature, and every seam shows. I wanted the opposite, so I made one rule and kept it. Every feature has to answer to two users at once, a human in the browser and an agent holding a token. If a feature only works for one of them, it is not done.

That rule sounds small. It changes everything downstream.

## The stack, honestly

There is nothing exotic here. Next.js for the app, SQLite through Drizzle so it runs happily on serverless and on Turso, and Auth.js for Google and GitHub login. I could have picked five other things and it would not matter much.

The interesting part was never the framework. It was the contract with the agent.

## The agent contract

This is where the real work went.

An agent talks to Remnus over MCP with fourteen tools, split cleanly into read and write, plus a set of resources and prompts. The read side covers search, listing the workspace, reading a page, reading a database schema, querying rows, listing members, and reading the audit log. The write side covers creating pages, updating them, bulk updates, deleting, moving items, creating databases, and changing a schema. Write tools refuse a read scoped token, so a token you handed to a reporting bot cannot quietly start editing.

There are two ways in, and that is on purpose:

1. OAuth 2.1 with PKCE for editors like Cursor and Claude that want a one click connect with a human present.
2. Scoped personal access tokens for everything headless. A cron job, a CI step, a coding agent on a server. You mint a token, give it read or write scope, and revoke it whenever you want.

Two more choices made the agent experience feel native instead of bolted on. Databases keep their fields in a JSON column, so an agent can invent a brand new schema on the fly without anyone running a migration. And every write an agent makes is recorded in an audit log you can actually read, showing which tool ran, on what, and when. When something you did not type starts changing your workspace, you want a receipt for every change, and Remnus writes one automatically.

## The proof is the sample workspace

Here is the part I am proud of. The sample workspace that every new account gets was not typed by a person. An agent connected over MCP, wrote a product spec for a small Paint clone, built a task board from that spec, generated every task with its own acceptance criteria, and then moved tasks across the board as it shipped them. A human watched the whole run and could have stepped in at any second.

That is not a staged screenshot. It is the actual thing the product is for, sitting right there in your first workspace.

## Why AGPL

You can self host Remnus, read every line, and change whatever you want. If you run it as a service for other people, you share your changes back. That felt like the honest deal for a tool people are going to trust with their notes. There is a longer post on the reasoning if you want it.

## Where I will be honest with you

Remnus is early. Notion has years of polish, a template ecosystem nobody is going to match soon, and mobile apps that millions of people rely on. I am one project, not a company with a floor full of designers.

What Remnus has is a different center of gravity. The agent is the point, not a feature someone added in a sprint. If that is what you came for, you will feel the difference in the first ten minutes.

---

If you want to see it for yourself, connect an agent from the AI Agents panel and watch the audit log fill up. For the deeper architecture story behind these choices, read [MCP-Native vs MCP-Integrated](/share/blog/mcp-native-vs-integrated).
