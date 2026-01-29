# MCP Server Implementation Plan

**Based on:** RFC-001-MCP-Server.md
**Target:** local-addon-mcp-server (formerly local-addon-cli-bridge)
**Last Updated:** 2026-01-28

---

## Status Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Core MCP Server | ✅ Complete | 12/12 tasks |
| Phase 2: Preferences UI | ✅ Complete | 7/7 tasks |
| Phase 3: Full Features | ✅ Complete | 6/6 tasks |
| Phase 4: Documentation | ✅ Complete | 5/5 tasks |
| Phase 5: Expanded Tools | ✅ Complete | 5/6 tasks |
| Phase 6: Distribution | ✅ Complete | 4/4 tasks |
| Phase 7: Testing & Quality | ⚠️ Partial | 2/5 tasks |
| Phase 8: WordPress Dev Tools | ✅ Complete | 7/7 tasks |
| Phase 9: Site Config & Dev | ⚠️ Partial | 3/6 tasks |
| Phase 10: Backup & Restore | 📋 Proposed | 0/3 tasks |
| Phase 11: Connect/Sync | ✅ Complete | 3/3 sub-phases |

**Current Release:** v0.0.3 (32 tools with Phase 11 complete)

---

## Phase 1: Core MCP Server ✅ Complete

**Goal:** Working MCP server with basic tools, auto-start with Local

### Task 1.1: Project Structure Setup ✅
**Files created:**
```
src/
├── main/
│   ├── index.ts                 # Addon entry with GraphQL + MCP
│   ├── mcp/
│   │   ├── McpServer.ts         # Main MCP server class (SSE)
│   │   ├── McpTransport.ts      # SSE transport implementation
│   │   ├── McpAuth.ts           # Token generation/validation
│   │   ├── McpTools.ts          # Tool registry
│   │   └── tools/
│   │       ├── index.ts         # Tool exports
│   │       ├── listSites.ts     # list_sites tool
│   │       ├── startSite.ts     # start_site tool
│   │       ├── stopSite.ts      # stop_site tool
│   │       ├── restartSite.ts   # restart_site tool
│   │       ├── getSite.ts       # get_site tool
│   │       ├── createSite.ts    # create_site tool
│   │       ├── deleteSite.ts    # delete_site tool
│   │       ├── wpCli.ts         # wp_cli tool
│   │       └── getLocalInfo.ts  # get_local_info tool
│   └── config/
│       └── ConnectionInfo.ts    # Connection info file management
├── common/
│   ├── constants.ts             # Shared constants
│   └── types.ts                 # TypeScript types
├── renderer/
│   └── components/              # Preferences UI components
└── bin/
    └── mcp-stdio.js             # stdio transport for Claude Code
```

**Status:** ✅ Complete

---

### Task 1.2: MCP Server Core ✅
**File:** `src/main/mcp/McpServer.ts`

- [x] Server starts on configured port
- [x] Server stops gracefully
- [x] Dynamic port selection if configured port unavailable
- [x] Logs startup/shutdown events
- [x] Token persistence across restarts

---

### Task 1.3: SSE Transport ✅
**File:** `src/main/mcp/McpTransport.ts`

- [x] SSE connection establishes correctly
- [x] Tool calls processed and responses returned
- [x] Health endpoint returns server status
- [x] CORS headers for cross-origin requests
- [x] Notifications/initialized handling
- [x] Ping handling

**Note:** SSE transport works but Claude Code uses stdio transport instead.

---

### Task 1.4: stdio Transport ✅
**File:** `bin/mcp-stdio.js`

- [x] Standalone Node.js script
- [x] Connects to Local's GraphQL API
- [x] Implements MCP protocol over stdio
- [x] Handles async operations correctly
- [x] Graceful shutdown
- [x] Node.js < 18 compatibility (uses http module, not fetch)

**This is the primary transport for Claude Code integration.**

---

### Task 1.5: Authentication ✅
**File:** `src/main/mcp/McpAuth.ts`

- [x] Token generated on first start
- [x] Token persisted across restarts
- [x] Invalid tokens rejected with 401
- [x] Non-localhost requests rejected with 403
- [x] Debug logging for troubleshooting

---

### Task 1.6: Connection Info Management ✅
**File:** `src/main/config/ConnectionInfo.ts`

- [x] Connection info saved on server start
- [x] Token persistence (not deleted on restart)
- [x] Correct path used per platform
- [x] File readable by external tools

---

### Task 1.7-1.10: Core Tools ✅

| Tool | Status | Notes |
|------|--------|-------|
| list_sites | ✅ | Filters by status |
| get_site | ✅ | Name or ID lookup |
| start_site | ✅ | Waits for completion |
| stop_site | ✅ | Waits for completion |
| restart_site | ✅ | Added to stdio transport |
| wp_cli | ✅ | Requires running site |

---

### Task 1.11: Addon Integration ✅
**File:** `src/main/index.ts`

- [x] MCP server starts when addon loads
- [x] MCP server stops when addon unloads
- [x] Errors logged but don't crash Local
- [x] Connection info file created on start
- [x] GraphQL mutations registered (createSite, deleteSite, wpCli)

---

### Task 1.12: Testing - Phase 1 ✅

- [x] Manual tests pass on macOS
- [ ] Manual tests pass on Windows (moved to Phase 7)
- [ ] Manual tests pass on Linux (moved to Phase 7)
- [x] Server survives malformed requests
- [x] Auth rejection works correctly

---

## Phase 2: Preferences UI ✅ Complete

**Goal:** User-facing configuration and status in Local preferences

### Task 2.1: Register Preferences Section ✅
**File:** `src/renderer/index.tsx`

- [x] "MCP Server" appears in preferences menu
- [x] Clicking navigates to MCP panel
- [x] Tabbed interface (Status & Controls / AI Tool Setup)

---

### Task 2.2: Status Display Component ✅

- [x] Shows current status with color indicator
- [x] Shows port number
- [x] Shows uptime
- [x] Updates when status changes

---

### Task 2.3: Port Configuration Component ✅
*Note: Deferred - using dynamic port selection instead*

- [x] Shows current port in connection info
- [x] Dynamic port selection handles conflicts automatically

---

### Task 2.4: Connection Info Component ✅

- [x] Shows formatted connection JSON
- [x] Copy button copies to clipboard
- [x] Shows stdio and SSE configurations
- [x] Shows available tools list

---

### Task 2.5: Server Controls Component ✅

- [x] Start/Stop button
- [x] Restart button
- [x] Test Connection button
- [x] Regenerate Token button (with confirmation)

---

### Task 2.6: AI Tool Setup Guides ✅

- [x] Claude Code setup instructions (stdio)
- [x] Claude.ai/ChatGPT setup instructions (SSE)
- [x] Example commands section
- [x] Copy configuration buttons

---

### Task 2.7: IPC Handlers for UI ✅
**File:** `src/main/index.ts`

| Handler | Status |
|---------|--------|
| mcp:getStatus | ✅ |
| mcp:getConnectionInfo | ✅ |
| mcp:start | ✅ |
| mcp:stop | ✅ |
| mcp:restart | ✅ |
| mcp:regenerateToken | ✅ |

---

## Phase 3: Full Features ✅ Complete

**Goal:** Complete tool set, polish, edge cases

### Task 3.1: Tool - get_site ✅
- [x] Returns comprehensive site details
- [x] Works with name or ID

---

### Task 3.2: Tool - create_site ✅
**Implementation:** GraphQL mutation using internal addSite service

- [x] Creates site with defaults
- [x] Respects custom configuration (PHP version)
- [x] Returns new site ID
- [x] Properly installs WordPress

---

### Task 3.3: Tool - delete_site ✅
- [x] Requires confirm=true
- [x] Rejects without confirmation with helpful message
- [x] Deletes site via GraphQL mutation
- [x] Handles trashFiles option

---

### Task 3.4: Tool - get_local_info ✅
- [x] Returns MCP server version
- [x] Returns platform info
- [x] Returns available tools list
- [x] Returns site count

---

### Task 3.5: Logging Improvements ✅
- [x] Uses Local's built-in logger
- [x] Consistent [MCP Server] prefix

---

### Task 3.6: Error Handling Polish ✅
- [x] Consistent error message format
- [x] Actionable suggestions in errors
- [x] Site not found includes available sites hint

---

## Phase 4: Documentation ✅ Complete

### Task 4.1: User Documentation ✅
**File:** `docs/USER-GUIDE.md`

- [x] What is MCP explanation
- [x] Claude Code setup instructions
- [x] Available commands documented
- [x] Claude.ai/ChatGPT setup (in preferences UI)
- [ ] Screenshots (optional - low priority)

---

### Task 4.2: Developer Documentation ✅
**File:** `docs/DEVELOPER-GUIDE.md`

- [x] Architecture overview
- [x] Dual transport explanation (stdio/SSE)
- [x] Adding new tools guide
- [x] Local Services API reference
- [x] Debugging tips
- [x] Development workflow

---

### Task 4.3: Troubleshooting Guide ✅
**File:** `docs/TROUBLESHOOTING.md`

- [x] Common issues documented
- [x] Solutions provided
- [x] How to get logs explained

---

### Task 4.4: RFC Documentation ✅
**File:** `docs/RFC-001-MCP-Server.md`

- [x] Complete specification
- [x] Updated with dual transport architecture

---

### Task 4.5: README ✅
**File:** `README.md`

- [x] Quick start guide
- [x] Feature list
- [x] Links to detailed docs

---

## Phase 5: Expanded Tools ✅ Complete

**Goal:** Additional tools for comprehensive site management

### Task 5.1: Tool - clone_site ✅
- [x] Clone existing site with new name
- [x] Handles database cloning (via Local's cloneSite service)
- [x] Handles file copying (via Local's cloneSite service)
- [x] Returns new site ID, name, and domain

---

### Task 5.2: Tool - export_site ✅
- [x] Export site to zip file
- [x] Default output to ~/Downloads
- [x] Custom output path support
- [x] Return export file path

---

### Task 5.3: Tool - import_site ❌ (Deferred)
- [ ] Import from zip file
- [ ] Import from blueprint
- [ ] Handle domain configuration

*Note: Import is complex due to multiple import types. Deferred to future phase.*

---

### Task 5.4: Tool - open_site ✅
- [x] Open site in default browser
- [x] Open wp-admin directly via path parameter
- [x] Support custom paths

---

### Task 5.5: Tool - site_shell ❌ (Deferred)
- [ ] Execute arbitrary shell commands in site environment
- [ ] Security considerations (confirmation required)
- [ ] Timeout handling

*Note: Security implications require careful design. Deferred to future phase.*

---

### Task 5.6: Blueprint Support ✅
- [x] list_blueprints tool
- [x] save_blueprint tool (save site as blueprint)
- [ ] create_site_from_blueprint tool (use create_site with blueprint param)

---

## Phase 6: Distribution ✅ Complete

**Goal:** Package and distribute addon via GitHub

### Task 6.1: Package Build ✅
- [x] Build script for production (`npm run build`)
- [x] Version 0.0.1 with semantic versioning
- [x] CHANGELOG.md with Keep a Changelog format
- [x] Cross-platform compatible (Node.js-based)

---

### Task 6.2: Code Quality & Validation ✅
- [x] ESLint configuration (`.eslintrc.json`)
- [x] Prettier configuration (`.prettierrc`)
- [x] TypeScript strict mode check (`npm run typecheck`)
- [x] Release validation script (`npm run validate-release`)

---

### Task 6.3: CI/CD Pipeline ✅
**Files:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`

- [x] CI workflow (lint, typecheck, test, build) on push/PR
- [x] Release workflow triggered on `v*` tags
- [x] Automated artifact creation
- [x] GitHub Release creation with changelog notes

---

### Task 6.4: Installation & Distribution ✅
**Files:** `scripts/install-addon.js`, `scripts/uninstall-addon.js`

- [x] npm-based installation (`npm run install-addon`)
- [x] npm-based uninstallation (`npm run uninstall-addon`)
- [x] Pre-built release downloads from GitHub Releases
- [x] README with canonical installation instructions (both methods)

---

## Phase 7: Testing & Quality ⚠️ Partial

**Goal:** Comprehensive testing and code quality

### Task 7.1: Cross-Platform Testing ❌

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Addon loads | ✅ | ❌ | ❌ |
| Server starts | ✅ | ❌ | ❌ |
| Connection info created | ✅ | ❌ | ❌ |
| All tools work | ✅ | ❌ | ❌ |
| Preferences UI works | ✅ | ❌ | ❌ |
| Claude Code integration | ✅ | ❌ | ❌ |

---

### Task 7.2: Unit Tests ⚠️ Partial
- [x] Jest configured with TypeScript support
- [x] Mock files for Local APIs (`tests/__mocks__/`)
- [x] Constants tests (`tests/constants.test.ts`)
- [x] MCP protocol tests (`tests/mcp-stdio.test.ts`)
- [ ] Tool handlers tested
- [ ] Auth logic tested
- [ ] Connection info management tested

---

### Task 7.3: Integration Tests ❌
- [ ] Full MCP protocol flow
- [ ] GraphQL mutations
- [ ] stdio transport end-to-end

---

### Task 7.4: TypeScript Improvements ❌
- [ ] Add types to SSE transport tools
- [ ] Refactor shared code between transports
- [ ] Strict mode compliance

---

### Task 7.5: Code Quality ✅
- [x] ESLint passing
- [x] TypeScript compiling
- [x] No runtime errors in happy path

---

## Phase 8: WordPress Development Tools ✅ Complete

**Goal:** High-value tools for WordPress development workflow

| Task | Tool | Priority | GraphQL Status | Status |
|------|------|----------|----------------|--------|
| 8.1 | `import_site` | High | As-is | ✅ |
| 8.2 | `export_database` | High | As-is (WP-CLI) | ✅ |
| 8.3 | `import_database` | High | As-is (WP-CLI) | ✅ |
| 8.4 | `open_adminer` | High | As-is | ✅ |
| 8.5 | `rename_site` | Medium | As-is | ✅ |
| 8.6 | `change_php_version` | Medium | As-is | ✅ |
| 8.7 | `trust_ssl` | Medium | As-is | ✅ |

---

## Phase 9: Site Configuration & Dev Tools ⚠️ Partial

**Goal:** Developer workflow enhancements

| Task | Tool | Priority | GraphQL Status | Status |
|------|------|----------|----------------|--------|
| 9.1 | `change_domain` | Medium | Needs work | ❌ |
| 9.2 | `toggle_xdebug` | Medium | As-is | ✅ |
| 9.3 | `get_site_logs` | Medium | As-is | ✅ |
| 9.4 | `open_in_editor` | Low | As-is | ❌ |
| 9.5 | `open_terminal` | Low | As-is | ❌ |
| 9.6 | `list_services` | Low | As-is | ✅ |

---

## Phase 10: Backup & Restore (Proposed)

**Goal:** Backup management (requires `localBackups` feature flag)

| Task | Tool | Priority | GraphQL Status | Status |
|------|------|----------|----------------|--------|
| 10.1 | `create_backup` | Medium | Needs work | ❌ |
| 10.2 | `list_backups` | Medium | Needs work | ❌ |
| 10.3 | `restore_backup` | Medium | Needs work | ❌ |

---

## Phase 11: WP Engine Connect/Sync ✅ Complete

**Goal:** WP Engine hosting integration with Magic Sync support
**Design Document:** [PHASE-11-WPE-CONNECT.md](./PHASE-11-WPE-CONNECT.md)
**Branch:** `feature/phase-11-wpe-connect`

### Phase 11a: Authentication & Discovery ✅

| Task | Tool | Priority | Status |
|------|------|----------|--------|
| 11a.1 | `wpe_status` | High | ✅ |
| 11a.2 | `wpe_authenticate` | High | ✅ |
| 11a.3 | `wpe_logout` | High | ✅ |
| 11a.4 | `list_wpe_sites` | High | ✅ |

### Phase 11b: Site Linking (Simplified) ✅

**Note:** Simplified to expose existing connection data. Link/unlink tools removed (connections created via Pull in Local UI).

| Task | Tool | Priority | Status |
|------|------|----------|--------|
| 11b.1 | Enhance `list_sites` with wpeConnection | High | ✅ |
| 11b.2 | `get_wpe_link` | High | ✅ |
| ~~11b.3~~ | ~~`link_to_wpe`~~ | ~~High~~ | ⏭️ Skipped |
| ~~11b.4~~ | ~~`unlink_from_wpe`~~ | ~~High~~ | ⏭️ Skipped |

### Phase 11c: Sync Operations ✅

| Task | Tool | Priority | Status |
|------|------|----------|--------|
| 11c.1 | `push_to_wpe` | High | ✅ |
| 11c.2 | `pull_from_wpe` | High | ✅ |
| 11c.3 | `get_sync_history` | Medium | ✅ |
| ~~11c.4~~ | ~~`preview_push`~~ | ~~High~~ | ⏭️ Skipped (requires manifest) |
| ~~11c.5~~ | ~~`get_sync_progress`~~ | ~~Medium~~ | ⏭️ Skipped (progress in Local UI) |

**Design Decisions:**
- WP Engine only (Flywheel deferred)
- `includeSql` defaults to `false` (safer)
- `push_to_wpe` requires `confirm=true`
- OAuth tokens stored in system keychain
- Sync operations start async, progress shown in Local UI

---

## Not Recommended for MCP

The following features are explicitly excluded:
- **Account management** - Security (OAuth tokens, credentials)
- **Cloud storage auth** - Security (Dropbox/GDrive OAuth)
- **Feature flag changes** - Admin-level, could break app
- **Addon management** - Complex lifecycle, user control preferred
- **Settings changes** - Global app settings, user preference
- **Hosts file edits** - Security risk
- **Router daemon control** - System-level, dangerous

---

## Next Steps (Recommended Priority)

### Immediate
1. **v0.0.1 Released** - ✅ Complete
2. **Test on Windows and Linux** - Verify cross-platform compatibility (Phase 7.1)
3. **End-to-end test all 14 tools** - Verify each tool works correctly

### Short-term (Phase 8 Quick Wins)
4. **Add `export_database`** - Use WP-CLI `db export` (no GraphQL changes)
5. **Add `import_database`** - Use WP-CLI `db import` (no GraphQL changes)
6. **Add `open_adminer`** - Browser URL open (no GraphQL changes)
7. **Add `open_in_editor`** - Shell command (no GraphQL changes)

### Medium-term
8. **Add `import_site`** - Import from zip (requires GraphQL work)
9. **Add `trust_ssl`** - Service exists (minimal work)
10. **Add `toggle_xdebug`** - Service exists (minimal work)

### Long-term
11. **Phase 10: Backup tools** - If feature flag enabled
12. **Phase 11: Connect tools** - If user demand exists
13. **Local Addon Marketplace** - Official distribution

---

## Dependencies

| Task | Depends On |
|------|------------|
| Marketplace submission | Package build, cross-platform testing |
| Import site | Export site format defined |
| Blueprint support | Understand Local's Blueprint API |

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| SSE transport issues | Implemented stdio as primary | ✅ Resolved |
| Cross-platform issues | Test on all platforms | ⏳ Pending |
| GraphQL addSite incomplete | Added custom createSite mutation | ✅ Resolved |
| Token regenerating | Added persistence | ✅ Resolved |
| Node.js version compatibility | Use http module instead of fetch | ✅ Resolved |

---

## Changelog

### 2026-01-29 (Update 10)
- Phase 11b: Site Linking (Simplified)
- Added get_wpe_link tool for detailed WPE connection info
- Enhanced list_sites to include wpeConnection for each site
- Removed link_to_wpe and unlink_from_wpe (connections created via Pull in Local UI)
- Total tools: 29

### 2026-01-29 (Update 9)
- Phase 11a: WP Engine Connect - Authentication & Discovery
- Added 4 new tools: wpe_status, wpe_authenticate, wpe_logout, list_wpe_sites
- Total tools: 28 (up from 24)
- Created Phase 11 design document (PHASE-11-WPE-CONNECT.md)
- Working in feature branch: `feature/phase-11-wpe-connect`
- Uses Local's WpeOAuthService and CAPIService for WPE integration

### 2026-01-28 (Update 8)
- **CRITICAL FIX**: Updated stdio transport (`bin/mcp-stdio.js`) with all 24 tools
- Previously, stdio transport only had 14 tools (Phase 1-5)
- Now both stdio and SSE transports have full 24-tool feature parity
- Added GraphQL types and resolvers for Phase 8-9 tools in main/index.ts
- This fix enables Claude Code to use all tools (toggle_xdebug, export_database, etc.)

### 2026-01-28 (Update 7)
- Phase 9 partial: 3 new Site Configuration & Dev Tools
- Added: toggle_xdebug, get_site_logs, list_services
- Total tools: 24 (up from 21)
- Added Phase 9 tests (11 new test cases)

### 2026-01-28 (Update 6)
- Phase 8 complete: 7 new WordPress Development Tools
- Added: export_database, import_database, open_adminer, trust_ssl, rename_site, change_php_version, import_site
- Total tools: 21 (up from 14)
- Added Phase 8 tests (17 new test cases)
- Updated USER-GUIDE with new tools documentation

### 2026-01-28 (Update 5)
- Added Phases 8-11 roadmap based on Local feature analysis
- Phase 8: WordPress Development Tools (import, DB ops, SSL, PHP version)
- Phase 9: Site Configuration & Dev Tools (domain, xdebug, logs, editor)
- Phase 10: Backup & Restore (feature flag dependent)
- Phase 11: Connect/Sync (conditional, deferred)
- Added "Not Recommended" section with excluded features
- Updated Next Steps with prioritized roadmap
- v0.0.1 released to GitHub

### 2026-01-28 (Update 4)
- Phase 6 marked complete (4/4 tasks)
- Added GitHub CI/CD workflows (ci.yml, release.yml)
- Added ESLint, Prettier, Jest configurations
- Added release validation script with sensitive data scanning
- Added install/uninstall scripts for Local addon development
- Created CHANGELOG.md, CONTRIBUTING.md, LICENSE files
- Created test infrastructure with mocks and initial tests
- Updated README with canonical installation instructions

### 2026-01-28 (Update 3)
- Phase 5 marked complete (5/6 tasks)
- Added tools: open_site, clone_site, export_site, list_blueprints, save_blueprint
- Added GraphQL mutations: openSite, cloneSite, exportSite, saveBlueprint
- Added GraphQL query: blueprints
- Deferred import_site and site_shell to future phase

### 2026-01-28 (Update 2)
- Phase 2 marked complete (server controls, regenerate token, AI setup guides)
- Phase 4 marked complete (DEVELOPER-GUIDE.md created)
- Added Phase 5: Expanded Tools (clone, export, import, open, shell, blueprints)
- Added Phase 6: Distribution (packaging, marketplace, releases)
- Added Phase 7: Testing & Quality (cross-platform, unit tests, integration tests)
- Fixed Node.js < 18 compatibility issue (fetch → http module)

### 2026-01-28 (Update 1)
- Renamed addon from cli-bridge to mcp-server
- Updated RFC with dual transport architecture
- Added stdio as primary transport for Claude Code
- Added restart_site tool
