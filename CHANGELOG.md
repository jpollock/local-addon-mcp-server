# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Phase 12: Auto-Start Sites**
  - 12 tools now auto-start sites if not running (eliminates extra round-trips)
  - Affected tools: `wp_cli`, `open_site`, `open_adminer`, `export_database`, `import_database`, `export_site`, `save_blueprint`, `create_backup`, `restore_backup`, `push_to_wpe`, `pull_from_wpe`, `get_site_changes`
  - Added `ensureSiteRunning()` helper function

## [0.0.4] - 2026-01-29

### Added
- **Security Hardening:**
  - Confirmation requirement for `pull_from_wpe` to prevent accidental overwrites
  - WP-CLI command blocklist (blocks `eval`, `eval-file`, `shell`, `db query`, `db cli`)
  - Snapshot ID format validation for backup operations
  - SQL path traversal protection for `import_database`
- **Performance Improvements:**
  - Async file operations in `getSiteLogs` resolver
  - Timeout handling for long operations (push/pull: 5min, backup: 10min)
- Security test suite with 25 new tests

### Changed
- Total tests increased from 83 to 108

## [0.0.3] - 2026-01-28

### Added
- **Phase 11: WP Engine Connect (9 new tools):**
  - `wpe_status` - Check WP Engine authentication status
  - `wpe_authenticate` - Trigger OAuth authentication flow
  - `wpe_logout` - Clear WP Engine tokens
  - `list_wpe_sites` - List sites from WP Engine account
  - `get_wpe_link` - Get WPE connection info for a local site
  - `push_to_wpe` - Push local changes to WP Engine (requires confirmation)
  - `pull_from_wpe` - Pull changes from WP Engine to local
  - `get_sync_history` - Get recent push/pull history
  - `get_site_changes` - Preview file changes (Magic Sync dry-run)
- **Phase 10: Cloud Backups (7 new tools):**
  - `backup_status` - Check cloud backup availability
  - `list_backups` - List backups from Dropbox or Google Drive
  - `create_backup` - Create backup to cloud provider
  - `restore_backup` - Restore site from cloud backup
  - `delete_backup` - Delete a cloud backup
  - `download_backup` - Download backup as ZIP file
  - `edit_backup_note` - Update backup description
- Phase 10 and Phase 11 test suites
- WP Engine Connect and Cloud Backups documentation

### Changed
- Total tools increased from 24 to 40

## [0.0.2] - 2026-01-28

### Added
- **Phase 9: Site Configuration & Dev Tools (3 new tools):**
  - `toggle_xdebug` - Enable/disable Xdebug for debugging
  - `get_site_logs` - Retrieve PHP, Nginx, MySQL log files
  - `list_services` - List available PHP/MySQL/Nginx versions
- **Phase 8: WordPress Development Tools (7 new tools):**
  - `export_database` - Export site database to SQL file
  - `import_database` - Import SQL file into site database
  - `open_adminer` - Open Adminer database management UI
  - `trust_ssl` - Trust site SSL certificate
  - `rename_site` - Rename a WordPress site
  - `change_php_version` - Change site PHP version
  - `import_site` - Import site from zip file
- Phase 8 and Phase 9 test suites
- Updated USER-GUIDE with database and configuration tools

### Changed
- Total tools increased from 14 to 24

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
