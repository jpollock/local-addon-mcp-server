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
| Phase 6: Distribution | ❌ Not Started | 0/4 tasks |
| Phase 7: Testing & Quality | ⚠️ Partial | 1/5 tasks |

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

## Phase 6: Distribution ❌ Not Started

**Goal:** Package and distribute addon

### Task 6.1: Package Build ❌
- [ ] Build script for production
- [ ] Version bumping
- [ ] Changelog generation
- [ ] Package all platforms (macOS, Windows, Linux)

---

### Task 6.2: Local Addon Marketplace ❌
- [ ] Prepare marketplace submission
- [ ] Icon and branding assets
- [ ] Marketplace description
- [ ] Category selection

---

### Task 6.3: Release Process ❌
- [ ] GitHub releases
- [ ] Semantic versioning
- [ ] Release notes template
- [ ] CI/CD pipeline for builds

---

### Task 6.4: Update Mechanism ❌
- [ ] Check for updates
- [ ] Auto-update support
- [ ] Version notification in UI

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

### Task 7.2: Unit Tests ❌
- [ ] Tool handlers tested
- [ ] Auth logic tested
- [ ] Connection info management tested
- [ ] Error handling tested

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

## Next Steps (Recommended Priority)

### High Priority
1. **Test on Windows and Linux** - Verify cross-platform compatibility (Phase 7.1)
2. **End-to-end test all tools** - Verify each tool works correctly

### Medium Priority
3. **Add clone_site tool** - Common use case (Phase 5.1)
4. **Add open_site tool** - Quick browser access (Phase 5.4)
5. **Build distributable package** - Prepare for release (Phase 6.1)

### Low Priority
6. **Add export/import tools** - Advanced features (Phase 5.2, 5.3)
7. **Add Blueprint support** - Template system (Phase 5.6)
8. **Write unit tests** - Code quality (Phase 7.2)
9. **Local Addon Marketplace submission** - Distribution (Phase 6.2)

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
