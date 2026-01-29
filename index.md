---
layout: default
title: MCP Server for Local
---

# MCP Server for Local

[![CI](https://github.com/jpollock/local-addon-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/jpollock/local-addon-mcp-server/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Enable AI tools like Claude Code to manage your WordPress development sites through the Model Context Protocol (MCP).

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to interact with external tools and data sources. This addon turns Local into an MCP server, allowing AI tools to:

- List, start, stop, and restart WordPress sites
- Create, clone, and delete sites
- Run WP-CLI commands
- Manage blueprints and exports
- Import/export databases
- Change PHP versions and trust SSL certificates

## Features

- **Dual Transport Support**: Both stdio (for Claude Code) and SSE (for web-based tools)
- **24 MCP Tools**: Complete site lifecycle and development workflow
- **Secure**: Token-based authentication for SSE transport
- **Dark Mode**: Seamless integration with Local's theme

## Quick Start

### Installation

1. Download the latest release from the [Releases page](https://github.com/jpollock/local-addon-mcp-server/releases)
2. Open Local and go to **Add-ons**
3. Click **Install from disk** and select the downloaded `.tgz` file
4. Toggle the addon **ON** and click **Relaunch**

### Configure Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "local": {
      "command": "/path/to/Local.app/Contents/Resources/extraResources/bin/local-mcp"
    }
  }
}
```

## Documentation

- [User Guide](docs/USER-GUIDE/) - Installation and usage instructions
- [Developer Guide](docs/DEVELOPER-GUIDE/) - Architecture and contributing
- [Troubleshooting](docs/TROUBLESHOOTING/) - Common issues and solutions

## Available Tools

### Site Management
| Tool | Description |
|------|-------------|
| `list_sites` | List all WordPress sites |
| `get_site` | Get detailed site information |
| `start_site` | Start a site's services |
| `stop_site` | Stop a site's services |
| `restart_site` | Restart a site's services |
| `create_site` | Create a new WordPress site |
| `delete_site` | Delete a site |
| `clone_site` | Clone an existing site |
| `rename_site` | Rename a site |
| `open_site` | Open site in browser |

### Import/Export
| Tool | Description |
|------|-------------|
| `export_site` | Export site to a zip file |
| `import_site` | Import site from a zip file |
| `export_database` | Export database to SQL file |
| `import_database` | Import SQL file into database |

### Development Tools
| Tool | Description |
|------|-------------|
| `wp_cli` | Run WP-CLI commands |
| `open_adminer` | Open Adminer database UI |
| `change_php_version` | Change site PHP version |
| `trust_ssl` | Trust site SSL certificate |
| `toggle_xdebug` | Enable/disable Xdebug |
| `get_site_logs` | Get PHP/Nginx/MySQL logs |
| `list_services` | List available service versions |

### Blueprints & System
| Tool | Description |
|------|-------------|
| `list_blueprints` | List available blueprints |
| `save_blueprint` | Save site as blueprint |
| `get_local_info` | Get Local application info |

## Requirements

- Local 9.0.0 or higher
- macOS, Windows, or Linux
- Node.js 18+ (for development)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.
