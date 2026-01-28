# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-01-28

### Added
- Initial release of MCP Server addon for Local
- **Core MCP Tools:**
  - `list_sites` - List all WordPress sites with status filtering
  - `get_site` - Get detailed site information
  - `start_site` - Start a stopped site
  - `stop_site` - Stop a running site
  - `restart_site` - Restart a site
  - `create_site` - Create new WordPress sites
  - `delete_site` - Delete sites (with confirmation)
  - `wp_cli` - Execute WP-CLI commands
  - `get_local_info` - Get Local installation info
- **Expanded Tools:**
  - `open_site` - Open sites in browser (supports /wp-admin path)
  - `clone_site` - Clone existing sites
  - `export_site` - Export sites to zip files
  - `list_blueprints` - List available blueprints
  - `save_blueprint` - Save sites as blueprint templates
- **Dual Transport Support:**
  - stdio transport for Claude Code (primary)
  - SSE transport for web-based AI tools
- **Preferences UI:**
  - Server status display with uptime
  - Start/Stop/Restart controls
  - Token regeneration
  - AI tool setup guides (Claude Code, Claude.ai, ChatGPT)
- **Documentation:**
  - User guide with setup instructions
  - Developer guide for contributors
  - Troubleshooting guide
