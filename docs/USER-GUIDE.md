---
layout: default
title: User Guide
---

# MCP Server User Guide

The MCP (Model Context Protocol) Server enables AI tools like Claude Code, Claude.ai, ChatGPT, and other MCP-compatible assistants to control your Local WordPress sites.

## What is MCP?

MCP is an open protocol that allows AI assistants to interact with external tools and services. With the MCP Server enabled in Local, you can use natural language to:

- List your WordPress sites
- Start, stop, and restart sites
- Run WP-CLI commands
- Create and delete sites
- Get detailed site information

## Quick Start

### 1. Enable the MCP Server

The MCP Server starts automatically when Local launches. You can verify it's running by checking the health endpoint:

```bash
curl http://127.0.0.1:10789/health
```

### 2. Find Your Connection Info

The connection information is saved to:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/Local/mcp-connection-info.json` |
| Windows | `%APPDATA%\Local\mcp-connection-info.json` |
| Linux | `~/.config/Local/mcp-connection-info.json` |

Example connection info:
```json
{
  "url": "http://127.0.0.1:10789",
  "authToken": "your-auth-token-here",
  "port": 10789,
  "version": "1.0.0",
  "tools": ["list_sites", "start_site", "stop_site", ...]
}
```

### 3. Configure Your AI Tool

#### Claude Code

Add the MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "local": {
      "url": "http://127.0.0.1:10789/mcp/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer YOUR_AUTH_TOKEN"
      }
    }
  }
}
```

#### Other MCP-Compatible Tools

Use the SSE endpoint with Bearer token authentication:
- **SSE Endpoint**: `http://127.0.0.1:10789/mcp/sse`
- **Messages Endpoint**: `http://127.0.0.1:10789/mcp/messages`
- **Auth Header**: `Authorization: Bearer YOUR_AUTH_TOKEN`

## Available Tools

### list_sites
List all WordPress sites in Local.

**Parameters:**
- `status` (optional): Filter by status - "all", "running", or "stopped"

**Example:**
```
List all my running WordPress sites
```

### start_site
Start a WordPress site.

**Parameters:**
- `site` (required): Site name or ID (partial names work)

**Example:**
```
Start the site called "my-blog"
```

### stop_site
Stop a running WordPress site.

**Parameters:**
- `site` (required): Site name or ID

**Example:**
```
Stop the my-blog site
```

### restart_site
Restart a WordPress site. If stopped, it will be started.

**Parameters:**
- `site` (required): Site name or ID

**Example:**
```
Restart my-blog
```

### wp_cli
Run a WP-CLI command against a site. The site must be running.

**Parameters:**
- `site` (required): Site name or ID
- `command` (required): WP-CLI command as an array of strings

**Example:**
```
Run "wp plugin list --format=json" on my-blog
```

### get_site
Get detailed information about a specific site.

**Parameters:**
- `site` (required): Site name or ID

**Example:**
```
Get details about my-blog
```

### create_site
Create a new WordPress site.

**Parameters:**
- `name` (required): Site name
- `domain` (optional): Site domain (default: name.local)
- `phpVersion` (optional): PHP version
- `webServer` (optional): "nginx" or "apache"
- `database` (optional): "mysql" or "mariadb"
- `wpAdmin` (optional): WordPress admin credentials
  - `username`: Admin username (default: admin)
  - `password`: Admin password (default: password)
  - `email`: Admin email (default: admin@local.test)

**Example:**
```
Create a new site called "test-site" with PHP 8.2
```

### delete_site
Delete a WordPress site. Requires confirmation for safety.

**Parameters:**
- `site` (required): Site name or ID
- `confirm` (required): Must be `true` to confirm deletion
- `trashFiles` (optional): Move files to trash (default: true)

**Example:**
```
Delete the test-site (confirm: true)
```

### get_local_info
Get information about the Local application.

**Parameters:** None

**Example:**
```
What version of Local am I running?
```

## Troubleshooting

### Connection Refused

If you get "connection refused" errors:

1. **Check if Local is running** - The MCP server only runs when Local is open
2. **Check the port** - The default port is 10789, but it may use a different port if that's unavailable
3. **Check the connection info file** - Verify the port in `mcp-connection-info.json`

### Authentication Failed

If you get 401 Unauthorized errors:

1. **Check your auth token** - Make sure you're using the token from `mcp-connection-info.json`
2. **Token format** - Use `Authorization: Bearer YOUR_TOKEN` header
3. **Regenerate token** - Restart Local to get a new token

### Site Not Found

If tools can't find your site:

1. **Check the site name** - Partial matching is case-insensitive
2. **Try the site ID** - Use `list_sites` to get exact IDs
3. **Check if site exists** - The site might have been deleted

### WP-CLI Errors

If WP-CLI commands fail:

1. **Site must be running** - Start the site first
2. **Check command syntax** - Commands are passed as arrays: `["plugin", "list"]`
3. **Check Local logs** - Look for detailed error messages

## Security

The MCP server has several security measures:

1. **Localhost only** - Only accepts connections from 127.0.0.1
2. **Token authentication** - Requires a valid Bearer token
3. **Delete confirmation** - The delete_site tool requires explicit confirmation

## Getting Help

- Check Local's logs for detailed error messages
- Visit the [Local Community Forums](https://community.localwp.com)
- Report issues at the project repository
