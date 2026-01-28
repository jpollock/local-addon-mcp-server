# MCP Server Implementation Plan

**Based on:** RFC-001-MCP-Server.md
**Target:** local-addon-mcp-server (formerly local-addon-cli-bridge)
**Last Updated:** 2026-01-28

---

## Status Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Core MCP Server | ✅ Complete | 12/12 tasks |
| Phase 2: Preferences UI | ⚠️ Partial | 3/7 tasks |
| Phase 3: Full Features | ✅ Complete | 6/6 tasks |
| Phase 4: Documentation | ⚠️ Partial | 3/5 tasks |

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

### Task 1.4: stdio Transport ✅ (Added)
**File:** `bin/mcp-stdio.js`

- [x] Standalone Node.js script
- [x] Connects to Local's GraphQL API
- [x] Implements MCP protocol over stdio
- [x] Handles async operations correctly
- [x] Graceful shutdown

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
- [ ] Manual tests pass on Windows (needs testing)
- [ ] Manual tests pass on Linux (needs testing)
- [x] Server survives malformed requests
- [x] Auth rejection works correctly

---

## Phase 2: Preferences UI ⚠️ Partial

**Goal:** User-facing configuration and status in Local preferences

### Task 2.1: Register Preferences Section ✅
**File:** `src/renderer/index.tsx`

- [x] "MCP Server" appears in preferences menu
- [x] Clicking navigates to MCP panel

---

### Task 2.2: Status Display Component ✅
**File:** `src/renderer/components/McpStatusDisplay.tsx`

- [x] Shows current status with color indicator
- [x] Shows port number
- [x] Updates when status changes

---

### Task 2.3: Port Configuration Component ❌ Not Started
**File:** `src/renderer/components/McpPortConfig.tsx`

- [ ] Shows current port
- [ ] Validates port number (1024-65535)
- [ ] Apply button restarts server on new port
- [ ] Error shown if port unavailable

---

### Task 2.4: Connection Info Component ✅
**File:** `src/renderer/components/McpConnectionInfo.tsx`

- [x] Shows formatted connection JSON
- [x] Copy button copies to clipboard
- [x] Shows success toast on copy

---

### Task 2.5: Server Controls Component ❌ Not Started
**File:** `src/renderer/components/McpServerControls.tsx`

- [ ] Start/Stop button
- [ ] Test Connection button
- [ ] Regenerate Token button (with confirmation)
- [ ] View Logs link

---

### Task 2.6: Main Preferences Panel ✅
**File:** `src/renderer/components/McpPreferencesPanel.tsx`

- [x] Status section renders
- [x] Connection info section renders
- [x] Tools list renders
- [ ] Port configuration (not implemented)
- [ ] Server controls (not implemented)

---

### Task 2.7: IPC Handlers for UI ⚠️ Partial
**File:** `src/main/index.ts`

| Handler | Status |
|---------|--------|
| mcp:getStatus | ✅ |
| mcp:getConnectionInfo | ✅ |
| mcp:start | ❌ |
| mcp:stop | ❌ |
| mcp:setPort | ❌ |
| mcp:regenerateToken | ❌ |
| mcp:testConnection | ❌ |

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
- [x] Returns Local version
- [x] Returns platform info
- [x] Returns available tools list

---

### Task 3.5: Logging Improvements ⚠️ Partial
- [x] Uses Local's built-in logger
- [ ] Separate MCP log file
- [ ] Configurable log levels in preferences

---

### Task 3.6: Error Handling Polish ✅
- [x] Consistent error message format
- [x] Actionable suggestions in errors
- [x] Site not found includes available sites hint

---

## Phase 4: Documentation & Release ⚠️ Partial

### Task 4.1: User Documentation ✅
**File:** `docs/USER-GUIDE.md`

- [x] What is MCP explanation
- [x] Claude Code setup instructions
- [x] Available commands documented
- [ ] Claude.ai setup
- [ ] ChatGPT setup
- [ ] Screenshots

---

### Task 4.2: Developer Documentation ❌ Not Started
**File:** `docs/DEVELOPER-GUIDE.md`

- [ ] Architecture overview
- [ ] Adding new tools
- [ ] Testing guide
- [ ] Contributing guidelines

---

### Task 4.3: Troubleshooting Guide ✅
**File:** `docs/TROUBLESHOOTING.md`

- [x] Common issues documented
- [x] Solutions provided
- [x] How to get logs explained

---

### Task 4.4: Cross-Platform Testing ❌ Not Started

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Addon loads | ✅ | ❌ | ❌ |
| Server starts | ✅ | ❌ | ❌ |
| Connection info created | ✅ | ❌ | ❌ |
| All tools work | ✅ | ❌ | ❌ |
| Preferences UI works | ✅ | ❌ | ❌ |
| Claude Code integration | ✅ | ❌ | ❌ |

---

### Task 4.5: Release Preparation ❌ Not Started
- [ ] Version bump
- [ ] Changelog updated
- [x] README exists
- [ ] Package built for all platforms
- [ ] Tested on fresh installs
- [ ] PR created/reviewed

---

## Next Steps (Recommended Priority)

### High Priority
1. **Test on Windows and Linux** - Verify cross-platform compatibility
2. **End-to-end test create_site** - Verify WordPress installs correctly

### Medium Priority
3. **Complete Preferences UI** - Add port config, start/stop controls, regenerate token
4. **Create DEVELOPER-GUIDE.md** - Document architecture for contributors
5. **Build distributable package** - Prepare for release

### Low Priority
6. **Add separate MCP log file** - Better observability
7. **Add Claude.ai/ChatGPT setup guides** - Expand AI tool support
8. **Add screenshots to USER-GUIDE.md** - Better UX

---

## Dependencies

| Task | Depends On |
|------|------------|
| Port Configuration | IPC handlers (mcp:setPort) |
| Server Controls | IPC handlers (mcp:start, mcp:stop, etc.) |
| Release | Cross-platform testing |

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| SSE transport issues | Implemented stdio as primary | ✅ Resolved |
| Cross-platform issues | Test on all platforms | ⏳ Pending |
| GraphQL addSite incomplete | Added custom createSite mutation | ✅ Resolved |
| Token regenerating | Added persistence | ✅ Resolved |
