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

- **40 MCP Tools**: Complete site management, WP-CLI, database, cloud backups, and WP Engine sync
- **Dual Transport**: stdio for Claude Code, SSE for web-based AI tools
- **Cloud Backups**: Backup and restore to Dropbox or Google Drive
- **WP Engine Connect**: Push and pull sites to/from WP Engine hosting
- **Auto-Start Sites**: Tools automatically start sites when needed
- **Security Hardened**: Input validation, command blocklists, confirmation requirements

## Quick Start

### Installation

1. Download the latest release from the [Releases page](https://github.com/jpollock/local-addon-mcp-server/releases)
2. Open Local and go to **Add-ons**
3. Click **Install from disk** and select the downloaded `.tgz` file
4. Toggle the addon **ON** and click **Relaunch**

### Using the Preferences Panel

After installation, access the MCP Server settings via **Local → Preferences → MCP Server**.

![MCP Server Preferences](assets/mcp-preferences.png)

The panel has two tabs:

- **Status & Controls** - View server status, start/stop/restart, test connection, regenerate auth token
- **AI Tool Setup** - Copy-ready configurations for Claude Code and other AI tools

### Configure Claude Code

From the **AI Tool Setup** tab, click **Copy Config** to get the configuration.

![AI Tool Setup](assets/mcp-ai-tool-setup.png)

Or manually add to your `~/.claude.json`:

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

## Documentation

- [User Guide](docs/USER-GUIDE/) - Installation and usage instructions
- [Developer Guide](docs/DEVELOPER-GUIDE/) - Architecture and contributing
- [Troubleshooting](docs/TROUBLESHOOTING/) - Common issues and solutions

## Available Tools

### Site Management

| Tool           | Description                   |
| -------------- | ----------------------------- |
| `list_sites`   | List all WordPress sites      |
| `get_site`     | Get detailed site information |
| `start_site`   | Start a site's services       |
| `stop_site`    | Stop a site's services        |
| `restart_site` | Restart a site's services     |
| `create_site`  | Create a new WordPress site   |
| `delete_site`  | Delete a site                 |
| `clone_site`   | Clone an existing site        |
| `rename_site`  | Rename a site                 |
| `open_site`    | Open site in browser          |

### Import/Export

| Tool              | Description                   |
| ----------------- | ----------------------------- |
| `export_site`     | Export site to a zip file     |
| `import_site`     | Import site from a zip file   |
| `export_database` | Export database to SQL file   |
| `import_database` | Import SQL file into database |

### Development Tools

| Tool                 | Description                     |
| -------------------- | ------------------------------- |
| `wp_cli`             | Run WP-CLI commands             |
| `open_adminer`       | Open Adminer database UI        |
| `change_php_version` | Change site PHP version         |
| `trust_ssl`          | Trust site SSL certificate      |
| `toggle_xdebug`      | Enable/disable Xdebug           |
| `get_site_logs`      | Get PHP/Nginx/MySQL logs        |
| `list_services`      | List available service versions |

### Blueprints & System

| Tool              | Description                |
| ----------------- | -------------------------- |
| `list_blueprints` | List available blueprints  |
| `save_blueprint`  | Save site as blueprint     |
| `get_local_info`  | Get Local application info |

### Cloud Backups

| Tool               | Description                            |
| ------------------ | -------------------------------------- |
| `backup_status`    | Check cloud backup availability        |
| `list_backups`     | List backups from Dropbox/Google Drive |
| `create_backup`    | Create backup to cloud storage         |
| `restore_backup`   | Restore from cloud backup              |
| `delete_backup`    | Delete a cloud backup                  |
| `download_backup`  | Download backup as ZIP                 |
| `edit_backup_note` | Update backup description              |

### WP Engine Connect

| Tool               | Description                    |
| ------------------ | ------------------------------ |
| `wpe_status`       | Check WP Engine auth status    |
| `wpe_authenticate` | Start OAuth authentication     |
| `wpe_logout`       | Clear WP Engine tokens         |
| `list_wpe_sites`   | List WP Engine sites           |
| `get_wpe_link`     | Get site's WPE connection info |
| `push_to_wpe`      | Push local changes to WPE      |
| `pull_from_wpe`    | Pull changes from WPE          |
| `get_sync_history` | Get push/pull history          |
| `get_site_changes` | Preview file changes           |

## Requirements

- Local 9.0.0 or higher
- macOS, Windows, or Linux
- Node.js 18+ (for development)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.
