# MCP Server Addon for Local

This addon adds Model Context Protocol (MCP) server capabilities to Local by WP Engine, enabling AI assistants like Claude Code, Claude.ai, ChatGPT, and Gemini to manage WordPress development sites.

## Features

- **MCP Server** - Exposes Local functionality to AI tools via stdio transport
- **9 MCP Tools** - list_sites, get_site, start_site, stop_site, restart_site, create_site, delete_site, wp_cli, get_local_info
- **GraphQL Extensions** - Additional mutations for programmatic control
- **Preferences UI** - View status and connection info in Local preferences

## Quick Start

### 1. Install the Addon

```bash
cd local-addon-mcp-server
npm install
npm run build
ln -sf "$(pwd)" "$HOME/Library/Application Support/Local/addons/local-addon-mcp-server"
```

Restart Local.

### 2. Configure Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "local": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/local-addon-mcp-server/bin/mcp-stdio.js"]
    }
  }
}
```

### 3. Start Using

Ask Claude Code to:
- "List my Local sites"
- "Start the blog site"
- "Create a new site called test-project"
- "Run wp plugin list on my-site"

## Documentation

- [User Guide](docs/USER-GUIDE.md) - Setup instructions and usage
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [RFC](docs/RFC-001-MCP-Server.md) - Technical specification
- [Implementation Plan](docs/IMPLEMENTATION-PLAN.md) - Development roadmap

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_sites` | List all WordPress sites in Local |
| `get_site` | Get detailed site information |
| `start_site` | Start a stopped site |
| `stop_site` | Stop a running site |
| `restart_site` | Restart a site |
| `create_site` | Create a new WordPress site |
| `delete_site` | Delete a site (requires confirmation) |
| `wp_cli` | Run WP-CLI commands |
| `get_local_info` | Get Local version and status |

## GraphQL Extensions

This addon also extends Local's GraphQL API:

```graphql
# Create a new site
mutation CreateSite($input: CreateSiteInput!) {
  createSite(input: $input) {
    success
    siteId
    siteDomain
  }
}

# Delete a site
mutation DeleteSite($input: DeleteSiteInput!) {
  deleteSite(input: $input) {
    success
    error
  }
}

# Run WP-CLI command
mutation WpCli($input: WpCliInput!) {
  wpCli(input: $input) {
    success
    output
    error
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              Local App (Electron)            │
│  ┌─────────────────────────────────────────┐ │
│  │           MCP Server Addon               │ │
│  │  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │  SSE Server  │  │ GraphQL Extend  │  │ │
│  │  │  (Health)    │  │ createSite etc  │  │ │
│  │  └──────────────┘  └────────▲────────┘  │ │
│  └─────────────────────────────┼───────────┘ │
│                                │              │
│  ┌─────────────────────────────▼───────────┐ │
│  │           Local Services                 │ │
│  │  siteData, siteProcessManager, wpCli    │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                    ▲
                    │ GraphQL (localhost)
                    │
           ┌────────┴────────┐
           │  bin/mcp-stdio  │ ◀── stdio ── Claude Code
           └─────────────────┘
```

## Development

```bash
npm run watch   # Watch for changes and rebuild
npm run build   # Production build
```

## License

MIT
