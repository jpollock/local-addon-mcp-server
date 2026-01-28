# MCP Server Addon for Local

This addon adds Model Context Protocol (MCP) server capabilities to Local by WP Engine, enabling AI assistants like Claude Code, Claude.ai, ChatGPT, and Gemini to manage WordPress development sites.

## Features

- **MCP Server** - Exposes Local functionality to AI tools via stdio transport
- **14 MCP Tools** - Site management, WP-CLI, blueprints, and more
- **GraphQL Extensions** - Additional mutations for programmatic control
- **Preferences UI** - View status and connection info in Local preferences

## Installation

### Method 1: Pre-built Release (Recommended)

1. Go to the [Releases](https://github.com/getflywheel/local-addon-mcp-server/releases) page
2. Download the latest `.tgz` file
3. Open Local → Add-ons
4. Click **Install from disk**
5. Select the downloaded `.tgz` file
6. Toggle the addon **ON**
7. Click **Relaunch**

### Method 2: Build from Source

```bash
git clone https://github.com/getflywheel/local-addon-mcp-server.git
cd local-addon-mcp-server
npm install
npm run build
npm run install-addon
```

Restart Local, then enable the addon in Add-ons settings.

## Uninstallation

**If installed from disk:**
1. Open Local → Add-ons
2. Toggle the MCP Server addon **OFF**
3. Click **Remove**
4. Restart Local

**If installed from source:**
```bash
npm run uninstall-addon
```
Then restart Local.

## Configure Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "local": {
      "command": "node",
      "args": ["/path/to/local-addon-mcp-server/bin/mcp-stdio.js"]
    }
  }
}
```

**Note:** Replace `/path/to` with the actual path. For pre-built releases, the path will be in Local's addons directory.

## Usage Examples

Ask Claude Code to:
- "List my Local sites"
- "Start the blog site"
- "Create a new site called test-project"
- "Run wp plugin list on my-site"
- "Clone my-site as my-site-copy"
- "Open my-site in the browser"
- "Export my-site to a zip file"

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
| `open_site` | Open site in browser |
| `clone_site` | Clone an existing site |
| `export_site` | Export site to zip file |
| `list_blueprints` | List available blueprints |
| `save_blueprint` | Save site as blueprint |

## Documentation

- [User Guide](docs/USER-GUIDE.md) - Setup instructions and usage
- [Developer Guide](docs/DEVELOPER-GUIDE.md) - Contributing and architecture
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [RFC](docs/RFC-001-MCP-Server.md) - Technical specification

## Development

```bash
npm run build       # Build for production
npm run watch       # Watch mode for development
npm run lint        # Run ESLint
npm run test        # Run tests
npm run typecheck   # TypeScript type checking
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - See [LICENSE](LICENSE) for details.
