# MCP Server Implementation Plan

**Based on:** RFC-001-MCP-Server.md
**Target:** local-addon-cli-bridge

---

## Phase 1: Core MCP Server

**Goal:** Working MCP server with basic tools, auto-start with Local

### Task 1.1: Project Structure Setup
**Files to create/modify:**
```
src/
├── main/
│   ├── index.ts                 # Addon entry (existing, modify)
│   ├── mcp/
│   │   ├── McpServer.ts         # Main MCP server class
│   │   ├── McpTransport.ts      # SSE transport implementation
│   │   ├── McpAuth.ts           # Token generation/validation
│   │   ├── McpTools.ts          # Tool registry
│   │   └── tools/
│   │       ├── index.ts         # Tool exports
│   │       ├── listSites.ts     # list_sites tool
│   │       ├── startSite.ts     # start_site tool
│   │       ├── stopSite.ts      # stop_site tool
│   │       ├── restartSite.ts   # restart_site tool
│   │       └── wpCli.ts         # wp_cli tool
│   └── config/
│       ├── McpConfig.ts         # Configuration management
│       └── ConnectionInfo.ts    # Connection info file management
├── common/
│   ├── constants.ts             # Shared constants
│   └── types.ts                 # TypeScript types
└── renderer/
    └── (Phase 2)
```

**Acceptance Criteria:**
- [ ] Directory structure created
- [ ] TypeScript compiles without errors
- [ ] Constants defined (default port, file paths, etc.)

---

### Task 1.2: MCP Server Core
**File:** `src/main/mcp/McpServer.ts`

**Implementation:**
```typescript
class McpServer {
  private server: http.Server | null = null;
  private port: number;
  private authToken: string;

  constructor(config: McpConfig) {}

  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  isRunning(): boolean {}
  getConnectionInfo(): ConnectionInfo {}
}
```

**Acceptance Criteria:**
- [ ] Server starts on configured port
- [ ] Server stops gracefully (pending requests complete)
- [ ] Dynamic port selection if configured port unavailable
- [ ] Logs startup/shutdown events

---

### Task 1.3: SSE Transport
**File:** `src/main/mcp/McpTransport.ts`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | GET | SSE connection for MCP protocol |
| `/mcp` | POST | Tool invocation |
| `/health` | GET | Health check |

**Implementation:**
```typescript
class McpTransport {
  handleSSE(req: Request, res: Response): void {}
  handleToolCall(req: Request, res: Response): Promise<void> {}
  handleHealth(req: Request, res: Response): void {}
}
```

**MCP Protocol Messages:**
```typescript
// Client -> Server (POST /mcp)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_sites",
    "arguments": {}
  }
}

// Server -> Client (SSE)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "..." }]
  }
}
```

**Acceptance Criteria:**
- [ ] SSE connection establishes correctly
- [ ] Tool calls processed and responses returned
- [ ] Health endpoint returns server status
- [ ] Proper SSE headers (Content-Type, Cache-Control, Connection)

---

### Task 1.4: Authentication
**File:** `src/main/mcp/McpAuth.ts`

**Implementation:**
```typescript
class McpAuth {
  generateToken(): string {}              // 128-char base64
  validateToken(provided: string): boolean {}
  regenerateToken(): string {}
}
```

**Security:**
- Tokens stored in Local's userData
- IP whitelist: 127.0.0.1, ::1, ::ffff:127.0.0.1
- Bearer token in Authorization header

**Acceptance Criteria:**
- [ ] Token generated on first start
- [ ] Token persisted across restarts
- [ ] Invalid tokens rejected with 401
- [ ] Non-localhost requests rejected with 403

---

### Task 1.5: Connection Info Management
**File:** `src/main/config/ConnectionInfo.ts`

**Implementation:**
```typescript
interface ConnectionInfo {
  url: string;
  authToken: string;
  port: number;
  version: string;
  tools: string[];
}

class ConnectionInfoManager {
  save(info: ConnectionInfo): void {}
  load(): ConnectionInfo | null {}
  getFilePath(): string {}  // Platform-specific
  delete(): void {}
}
```

**File Locations:**
- macOS: `~/Library/Application Support/Local/mcp-connection-info.json`
- Windows: `%APPDATA%\Local\mcp-connection-info.json`
- Linux: `~/.config/Local/mcp-connection-info.json`

**Acceptance Criteria:**
- [ ] Connection info saved on server start
- [ ] Connection info deleted on server stop
- [ ] Correct path used per platform
- [ ] File readable by external tools (CLI, AI assistants)

---

### Task 1.6: Tool - list_sites
**File:** `src/main/mcp/tools/listSites.ts`

**Schema:**
```typescript
{
  name: "list_sites",
  description: "List all WordPress sites in Local with their status",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["all", "running", "stopped"],
        default: "all",
        description: "Filter by site status"
      }
    }
  }
}
```

**Implementation:**
```typescript
async function listSites(args: { status?: string }, services: LocalServices): Promise<ToolResult> {
  const sites = services.siteData.getSites();
  // Filter by status if provided
  // Format response
  return { content: [{ type: "text", text: JSON.stringify(sites) }] };
}
```

**Acceptance Criteria:**
- [ ] Returns all sites with name, ID, status, domain
- [ ] Filters by status correctly
- [ ] Handles empty site list
- [ ] Returns proper MCP response format

---

### Task 1.7: Tool - start_site
**File:** `src/main/mcp/tools/startSite.ts`

**Schema:**
```typescript
{
  name: "start_site",
  description: "Start a WordPress site",
  inputSchema: {
    type: "object",
    properties: {
      site: {
        type: "string",
        description: "Site name or ID"
      }
    },
    required: ["site"]
  }
}
```

**Implementation:**
```typescript
async function startSite(args: { site: string }, services: LocalServices): Promise<ToolResult> {
  const site = findSite(args.site, services.siteData);
  if (!site) return errorResult(`Site not found: ${args.site}`);

  const status = await services.siteProcessManager.getSiteStatus(site);
  if (status === 'running') return successResult(`Site "${site.name}" is already running`);

  await services.siteProcessManager.start(site);
  return successResult(`Site "${site.name}" started`);
}
```

**Acceptance Criteria:**
- [ ] Finds site by name (case-insensitive, partial match)
- [ ] Finds site by ID
- [ ] Handles "already running" gracefully
- [ ] Handles "site not found" with helpful message
- [ ] Waits for site to start before responding

---

### Task 1.8: Tool - stop_site
**File:** `src/main/mcp/tools/stopSite.ts`

**Similar to start_site, inverse logic**

**Acceptance Criteria:**
- [ ] Stops running site
- [ ] Handles "already stopped" gracefully
- [ ] Handles "site not found" with helpful message

---

### Task 1.9: Tool - restart_site
**File:** `src/main/mcp/tools/restartSite.ts`

**Acceptance Criteria:**
- [ ] Restarts running site
- [ ] Starts stopped site (restart = start if stopped)
- [ ] Handles "site not found" with helpful message

---

### Task 1.10: Tool - wp_cli
**File:** `src/main/mcp/tools/wpCli.ts`

**Schema:**
```typescript
{
  name: "wp_cli",
  description: "Run a WP-CLI command against a site. Site must be running.",
  inputSchema: {
    type: "object",
    properties: {
      site: {
        type: "string",
        description: "Site name or ID"
      },
      command: {
        type: "array",
        items: { type: "string" },
        description: "WP-CLI command and arguments, e.g. ['plugin', 'list', '--format=json']"
      }
    },
    required: ["site", "command"]
  }
}
```

**Implementation:**
```typescript
async function wpCli(args: { site: string; command: string[] }, services: LocalServices): Promise<ToolResult> {
  const site = findSite(args.site, services.siteData);
  if (!site) return errorResult(`Site not found: ${args.site}`);

  const status = await services.siteProcessManager.getSiteStatus(site);
  if (status !== 'running') {
    return errorResult(`Site "${site.name}" is not running. Start it first.`);
  }

  const output = await services.wpCli.run(site, args.command);
  return successResult(output);
}
```

**Acceptance Criteria:**
- [ ] Executes WP-CLI command
- [ ] Returns command output
- [ ] Errors if site not running
- [ ] Handles command failures gracefully
- [ ] Timeout for long-running commands (30s default)

---

### Task 1.11: Addon Integration
**File:** `src/main/index.ts` (modify existing)

**Changes:**
```typescript
import { McpServer } from './mcp/McpServer';

let mcpServer: McpServer | null = null;

export default function (context: LocalMain.AddonMainContext): void {
  // ... existing GraphQL registration ...

  // Start MCP server
  mcpServer = new McpServer(config);
  mcpServer.start().then(() => {
    localLogger.info('[CLI Bridge] MCP server started');
  }).catch((err) => {
    localLogger.error('[CLI Bridge] Failed to start MCP server:', err);
  });

  // Register shutdown hook
  context.hooks.addAction('addonUnloaded', async () => {
    if (mcpServer) {
      await mcpServer.stop();
    }
  });
}
```

**Acceptance Criteria:**
- [ ] MCP server starts when addon loads
- [ ] MCP server stops when addon unloads
- [ ] Errors logged but don't crash Local
- [ ] Connection info file created on start, deleted on stop

---

### Task 1.12: Testing - Phase 1
**Manual Tests:**
```bash
# After Local starts:
curl http://127.0.0.1:10789/health
# Expected: {"status":"ok","version":"1.0.0"}

# List sites:
curl -X POST http://127.0.0.1:10789/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_sites","arguments":{}}}'

# Start site:
curl -X POST http://127.0.0.1:10789/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"start_site","arguments":{"site":"my-site"}}}'
```

**Acceptance Criteria:**
- [ ] All manual tests pass on macOS
- [ ] All manual tests pass on Windows
- [ ] All manual tests pass on Linux
- [ ] Server survives malformed requests
- [ ] Auth rejection works correctly

---

## Phase 2: Preferences UI

**Goal:** User-facing configuration and status in Local preferences

### Task 2.1: Register Preferences Section
**File:** `src/renderer/index.tsx`

**Implementation:**
```typescript
export default function (context: LocalRenderer.AddonRendererContext): void {
  context.hooks.addFilter('preferencesMenuItems', (menu) => {
    return [
      ...menu,
      {
        path: 'mcp-server',
        menuItem: 'MCP Server',
        component: McpPreferencesPanel
      }
    ];
  });
}
```

**Acceptance Criteria:**
- [ ] "MCP Server" appears in preferences menu
- [ ] Clicking navigates to MCP panel

---

### Task 2.2: Status Display Component
**File:** `src/renderer/components/McpStatusDisplay.tsx`

**Implementation:**
```typescript
class McpStatusDisplay extends React.Component<Props, State> {
  state = { status: 'unknown', port: 0, uptime: 0 };

  async componentDidMount() {
    // Fetch status via IPC
  }

  render() {
    // Status indicator: Running (green) / Stopped (red) / Error (yellow)
    // Port display
    // Uptime display
  }
}
```

**Acceptance Criteria:**
- [ ] Shows current status with color indicator
- [ ] Shows port number
- [ ] Updates when status changes
- [ ] Shows error message if server failed

---

### Task 2.3: Port Configuration Component
**File:** `src/renderer/components/McpPortConfig.tsx`

**Implementation:**
```typescript
class McpPortConfig extends React.Component<Props, State> {
  state = { port: 10789, isDirty: false };

  handleChange = (e) => { /* update state */ };
  handleApply = async () => { /* save and restart server */ };

  render() {
    // Port input field
    // Apply button (disabled if not dirty)
    // Note: "Requires server restart"
  }
}
```

**Acceptance Criteria:**
- [ ] Shows current port
- [ ] Validates port number (1024-65535)
- [ ] Apply button restarts server on new port
- [ ] Error shown if port unavailable

---

### Task 2.4: Connection Info Component
**File:** `src/renderer/components/McpConnectionInfo.tsx`

**Implementation:**
```typescript
class McpConnectionInfo extends React.Component<Props, State> {
  handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(connectionInfo, null, 2));
  };

  render() {
    // Read-only textarea with JSON config
    // Copy to Clipboard button
    // Format for easy pasting into Claude Code config
  }
}
```

**Acceptance Criteria:**
- [ ] Shows formatted connection JSON
- [ ] Copy button copies to clipboard
- [ ] Shows success toast on copy

---

### Task 2.5: Server Controls Component
**File:** `src/renderer/components/McpServerControls.tsx`

**Implementation:**
```typescript
class McpServerControls extends React.Component<Props, State> {
  handleStart = async () => { /* IPC call */ };
  handleStop = async () => { /* IPC call */ };
  handleTestConnection = async () => { /* HTTP request to /health */ };
  handleRegenerateToken = async () => { /* IPC call, confirm first */ };
  handleViewLogs = () => { /* Open log file location */ };

  render() {
    // Start/Stop button (based on status)
    // Test Connection button
    // Regenerate Token button (with confirmation)
    // View Logs link
  }
}
```

**Acceptance Criteria:**
- [ ] Start button starts server
- [ ] Stop button stops server
- [ ] Buttons disabled during transitions
- [ ] Test Connection shows success/failure
- [ ] Regenerate Token requires confirmation
- [ ] View Logs opens correct platform location

---

### Task 2.6: Main Preferences Panel
**File:** `src/renderer/components/McpPreferencesPanel.tsx`

**Combines all components from Tasks 2.2-2.5**

**Layout:** (matches mockup in RFC)
```
┌─────────────────────────────────────────┐
│ Status Display                          │
├─────────────────────────────────────────┤
│ Port Configuration                      │
├─────────────────────────────────────────┤
│ Connection Info                         │
├─────────────────────────────────────────┤
│ Server Controls                         │
├─────────────────────────────────────────┤
│ Available Tools List                    │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] All sections render correctly
- [ ] Responsive layout
- [ ] Matches Local's design system
- [ ] Dark mode support

---

### Task 2.7: IPC Handlers for UI
**File:** `src/main/mcp/McpIpcHandlers.ts`

**Handlers:**
```typescript
ipcMain.handle('mcp:getStatus', async () => { ... });
ipcMain.handle('mcp:start', async () => { ... });
ipcMain.handle('mcp:stop', async () => { ... });
ipcMain.handle('mcp:getConfig', async () => { ... });
ipcMain.handle('mcp:setPort', async (_, port) => { ... });
ipcMain.handle('mcp:regenerateToken', async () => { ... });
ipcMain.handle('mcp:testConnection', async () => { ... });
```

**Acceptance Criteria:**
- [ ] All IPC handlers registered
- [ ] Proper error handling
- [ ] Returns structured responses

---

## Phase 3: Full Features

**Goal:** Complete tool set, polish, edge cases

### Task 3.1: Tool - get_site
**File:** `src/main/mcp/tools/getSite.ts`

**Returns detailed site info:**
- ID, name, domain, path
- Status
- PHP version, web server, database
- WordPress version
- Services configuration

**Acceptance Criteria:**
- [ ] Returns comprehensive site details
- [ ] Works with name or ID

---

### Task 3.2: Tool - create_site
**File:** `src/main/mcp/tools/createSite.ts`

**Schema:**
```typescript
{
  name: "create_site",
  description: "Create a new WordPress site",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Site name" },
      domain: { type: "string", description: "Site domain (default: name.local)" },
      phpVersion: { type: "string", description: "PHP version" },
      webServer: { type: "string", enum: ["nginx", "apache"] },
      wpAdmin: {
        type: "object",
        properties: {
          username: { type: "string", default: "admin" },
          password: { type: "string", default: "password" },
          email: { type: "string", default: "admin@local.test" }
        }
      }
    },
    required: ["name"]
  }
}
```

**Acceptance Criteria:**
- [ ] Creates site with defaults
- [ ] Respects custom configuration
- [ ] Returns new site ID
- [ ] Waits for creation to complete

---

### Task 3.3: Tool - delete_site
**File:** `src/main/mcp/tools/deleteSite.ts`

**Schema:**
```typescript
{
  name: "delete_site",
  description: "Delete a WordPress site. Requires confirm=true.",
  inputSchema: {
    type: "object",
    properties: {
      site: { type: "string", description: "Site name or ID" },
      confirm: { type: "boolean", description: "Must be true to confirm deletion" },
      trashFiles: { type: "boolean", default: true, description: "Move files to trash" }
    },
    required: ["site", "confirm"]
  }
}
```

**Acceptance Criteria:**
- [ ] Requires confirm=true
- [ ] Rejects without confirmation with helpful message
- [ ] Deletes site
- [ ] Handles trashFiles option

---

### Task 3.4: Tool - get_local_info
**File:** `src/main/mcp/tools/getLocalInfo.ts`

**Returns:**
- Local version
- Platform (macOS/Windows/Linux)
- MCP server version
- Available tools list
- Site count

**Acceptance Criteria:**
- [ ] Returns accurate Local info
- [ ] Useful for AI context

---

### Task 3.5: Logging Improvements
**File:** `src/main/mcp/McpLogger.ts`

**Features:**
- Configurable log levels (debug, info, warn, error)
- Separate MCP log file
- Request/response logging (debug level)
- Performance timing

**Acceptance Criteria:**
- [ ] Log file created in Local's logs directory
- [ ] Log level configurable in preferences
- [ ] Logs rotated/managed

---

### Task 3.6: Error Handling Polish
**All tool files**

**Improvements:**
- Consistent error message format
- Actionable suggestions in errors
- Error codes for programmatic handling

**Example:**
```typescript
{
  error: {
    code: "SITE_NOT_RUNNING",
    message: "Site 'my-site' is not running",
    suggestion: "Start the site first with the start_site tool"
  }
}
```

**Acceptance Criteria:**
- [ ] All errors have consistent format
- [ ] Errors include suggestions
- [ ] Errors are helpful, not cryptic

---

## Phase 4: Documentation & Release

### Task 4.1: User Documentation
**File:** `docs/USER-GUIDE.md`

**Sections:**
1. What is MCP?
2. Enabling the MCP Server
3. Configuring Your AI Tool
   - Claude Code setup
   - Claude.ai setup
   - ChatGPT setup
   - Gemini setup
4. Available Commands
5. Troubleshooting

**Acceptance Criteria:**
- [ ] Step-by-step setup guides with screenshots
- [ ] Tested with each AI tool
- [ ] Common issues documented

---

### Task 4.2: Developer Documentation
**File:** `docs/DEVELOPER-GUIDE.md`

**Sections:**
1. Architecture Overview
2. Adding New Tools
3. Modifying Existing Tools
4. Testing
5. Debugging
6. Contributing

**Acceptance Criteria:**
- [ ] Clear architecture explanation
- [ ] Example of adding new tool
- [ ] Contribution guidelines

---

### Task 4.3: Troubleshooting Guide
**File:** `docs/TROUBLESHOOTING.md`

**Common Issues:**
- Port already in use
- Connection refused
- Authentication failed
- Tool not found
- Site not found
- WP-CLI errors

**Acceptance Criteria:**
- [ ] Covers common issues
- [ ] Provides solutions
- [ ] Explains how to get logs

---

### Task 4.4: Cross-Platform Testing
**Manual test on each platform:**

| Test | macOS | Windows | Linux |
|------|-------|---------|-------|
| Addon loads | [ ] | [ ] | [ ] |
| Server starts | [ ] | [ ] | [ ] |
| Connection info created | [ ] | [ ] | [ ] |
| All tools work | [ ] | [ ] | [ ] |
| Preferences UI works | [ ] | [ ] | [ ] |
| Claude Code integration | [ ] | [ ] | [ ] |

---

### Task 4.5: Release Preparation
- [ ] Version bump
- [ ] Changelog updated
- [ ] README updated
- [ ] Package built for all platforms
- [ ] Tested on fresh installs
- [ ] PR created/reviewed

---

## Milestones

| Milestone | Tasks | Target |
|-----------|-------|--------|
| **M1: Core Server** | 1.1 - 1.12 | Week 1-2 |
| **M2: Preferences UI** | 2.1 - 2.7 | Week 3 |
| **M3: Full Features** | 3.1 - 3.6 | Week 4 |
| **M4: Release** | 4.1 - 4.5 | Week 5 |

---

## Dependencies

| Task | Depends On |
|------|------------|
| 1.3 (Transport) | 1.2 (Server Core) |
| 1.6-1.10 (Tools) | 1.3 (Transport), 1.4 (Auth) |
| 1.11 (Integration) | 1.2-1.10 |
| 2.* (UI) | 1.11 (Integration), 2.7 (IPC Handlers) |
| 3.* (Full Features) | 2.* (UI) |
| 4.* (Docs) | 3.* (Full Features) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| MCP SDK complexity | Start with raw HTTP/SSE, adopt SDK later if needed |
| Cross-platform issues | Test early on all platforms (Task 1.12) |
| Port conflicts | Implement dynamic port selection early (Task 1.2) |
| AI tool compatibility | Test with Claude Code first, expand later |
| Performance issues | Add timing logs, optimize if needed in Phase 3 |
