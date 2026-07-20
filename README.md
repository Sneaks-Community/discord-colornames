# Discord-ColorNames

A Discord bot that manages color-based roles in a Discord server.

## Features

- **`/color <number>`** — Set your color role by selecting from a numbered list (pass `0` to reset/remove all color roles)
- **`/colors`** — List all available color roles with their assigned numbers
- **Auto-pinned color list** — On startup, the bot automatically creates or updates a pinned color list message in the configured channel (optional)
- **Health check endpoint** — HTTP `/` returns `{"status":"healthy","timestamp":"...","uptime":...}` for container orchestration
- **Structured logging** — Configurable log levels

## User Commands

| Command | Description | Permissions |
|---|---|---|
| `/color <number>` | Set your color role (0 to reset) | Must have an allowed role |
| `/colors` | List all available color roles | Must have an allowed role |

## Requirements

- [Node.js](https://nodejs.org) >= 26.0.0
- A [Discord Bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html) with the following Intents enabled:
  - `Guilds`
  - `Guild Members`
- A Discord server with roles configured for each color

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Example |
|---|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | `MTIzNDU2Nzg5...` |
| `DISCORD_CLIENT_ID` | Application (client) ID | `123456789012345678` |
| `SERVER_ID` | Guild ID where commands are registered | `987654321098765432` |
| `PIN_CHANNEL_ID` | Channel ID to pin the color list message to (optional) | `123456789012345678` |
| `EMBED_COLOR` | Decimal color for embeds | `299410` |
| `LOG_LEVEL` | Log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) | `info` |
| `HEALTH_PORT` | Port for the health check HTTP server | `3000` |
| `ACCESS_DENIED_DESCRIPTION` | Message shown to users without allowed roles (supports markdown) | `Sorry, this command is for VIPs and Nitro Boosters only.` |
| `ALLOWED_ROLES` | Comma-separated role IDs allowed to use color commands | `111,222,333` |
| `COLOR_ROLE_<NAME>` | Mappings of color names to Discord role IDs (sorted numerically/alphabetically) | `COLOR_ROLE_BLUE=444` |

## Getting Started

### Using Docker Compose (Recommended)

The easiest way to run the bot is with the provided [`docker-compose.yml`](docker-compose.yml), which uses the pre-built image from GitHub Container Registry:

```bash
# Ensure you have a .env file configured (see Environment Variables below)
docker compose up -d
```

### Building Your Own Docker Image

If you prefer to build the image yourself:

```bash
docker build -t discord-colornames:dev .
docker run --env-file .env discord-colornames:dev
```

Or using npm scripts:

```bash
npm run docker:build
npm run docker:run
```

### Running Locally

For local development with TypeScript watch mode:

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your Discord credentials
    ```

3. **Start the bot:**

    ```bash
    # Development mode (TypeScript watches for changes)
    npm run dev

    # Or build once then start
    npm run build && npm start
    ```

## Bot Permissions

For the bot to function correctly, ensure the following permissions are configured:

### General Permissions (required for all features)

| Permission | Purpose |
|---|---|
| `Send Messages` | Send responses and messages |
| `Embed Links` | Display formatted embeds |
| `Read Message History` | View past messages |

### Auto-Pin Permissions (required when `PIN_CHANNEL_ID` is set)

When configuring `PIN_CHANNEL_ID`, the bot's role must have **all** of the following permissions in the target channel, and its role must be positioned **above** any roles that deny these permissions:

| Permission | Purpose |
|---|---|
| `View Channel` | Access the channel (required to interact with any resource) |
| `Send Messages` | Post the color list message |
| `Read Message History` | Fetch pinned messages to check for existing pins |
| `Manage Messages` | Edit existing pinned messages |
| `Pin Messages` | Pin new messages to the channel |

> **Common Issue: "Missing Access" Error (Code 50001)**
>
> If the bot logs `DiscordAPIError[50001]: Missing Access` when attempting to pin, this means the bot cannot access the channel itself — not that it lacks a specific permission. This is almost always caused by:
> 1. Missing `View Channel` permission (or `@everyone` has it denied)
> 2. Missing `Read Message History` permission (required to fetch pinned messages)
> 3. Role hierarchy issue: the bot's role is below another role that denies `View Channel`
>
> **Fix:** In your Discord server settings, go to **Channel Permissions** for the target channel and ensure the bot's role has `View Channel` and `Read Message History` explicitly allowed.
