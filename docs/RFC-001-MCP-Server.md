# RFC-001: MCP Server for Local

**Status:** Draft
**Author:** Jeremy Pollock
**Created:** 2026-01-28
**Last Updated:** 2026-01-28

## Summary

Add Model Context Protocol (MCP) server capabilities to Local by WP Engine via an addon, enabling AI assistants (Claude Code, Claude.ai, ChatGPT, Gemini) to programmatically manage WordPress development sites.

## Motivation

AI-assisted development workflows are becoming standard. Developers using AI tools currently cannot directly interact with their Local WordPress sites without:
1. Manually running CLI commands
2. Opening new terminal windows with environment setup
3. Copy-pasting between AI chat and terminal

An MCP server embedded in Local would allow AI tools to:
- List, start, stop, and manage sites directly
- Run WP-CLI commands without terminal setup
- Create and delete development sites
- Query site status and configuration

## Requirements

### Functional Requirements

#### FR-1: Server Lifecycle
| ID | Requirement |
|----|-------------|
| FR-1.1 | MCP server starts automatically when addon is activated and Local launches |
| FR-1.2 | MCP server stops gracefully when Local quits |
| FR-1.3 | MCP server starts on configured port; if unavailable, selects next available port |
| FR-1.4 | If server fails to start, user receives actionable error message |
| FR-1.5 | Server waits for Local core services before accepting connections |
| FR-1.6 | Connection info persisted to discoverable file location |

#### FR-2: User Configuration
| ID | Requirement |
|----|-------------|
| FR-2.1 | Preferences UI shows MCP server status (Running/Stopped/Error) |
| FR-2.2 | Preferences UI displays connection info for AI tool configuration |
| FR-2.3 | User can start/stop MCP server from Preferences |
| FR-2.4 | User can change port from Preferences (requires restart) |
| FR-2.5 | User can copy connection config to clipboard |
| FR-2.6 | User can test connection from Preferences |
| FR-2.7 | User can view/access log file location |
| FR-2.8 | User can reset to default settings |
| FR-2.9 | User can regenerate authentication token |

#### FR-3: MCP Tools
| ID | Requirement |
|----|-------------|
| FR-3.1 | `list_sites` - List all sites with name, ID, status, domain |
| FR-3.2 | `get_site` - Get detailed site information by name or ID |
| FR-3.3 | `start_site` - Start a stopped site |
| FR-3.4 | `stop_site` - Stop a running site |
| FR-3.5 | `restart_site` - Restart a site |
| FR-3.6 | `create_site` - Create new WordPress site with configuration |
| FR-3.7 | `delete_site` - Delete a site (with confirmation parameter) |
| FR-3.8 | `wp_cli` - Execute WP-CLI command against a site |
| FR-3.9 | `get_local_info` - Get Local version and status |

#### FR-4: Security
| ID | Requirement |
|----|-------------|
| FR-4.1 | Server accepts connections only from localhost (127.0.0.1, ::1) |
| FR-4.2 | Authentication token required for all requests |
| FR-4.3 | Token generated on first start, stored securely |
| FR-4.4 | Destructive operations (delete) require explicit confirmation parameter |
| FR-4.5 | No credentials or secrets exposed via MCP tools |

#### FR-5: Cross-Platform
| ID | Requirement |
|----|-------------|
| FR-5.1 | Addon works on macOS (Intel and Apple Silicon) |
| FR-5.2 | Addon works on Windows (x64) |
| FR-5.3 | Addon works on Linux (x64) |
| FR-5.4 | File paths and port handling work correctly on all platforms |

### Non-Functional Requirements

#### NFR-1: Performance
| ID | Requirement |
|----|-------------|
| NFR-1.1 | Server handles at least 10 concurrent connections |
| NFR-1.2 | Tool responses return within 30 seconds (except long-running operations) |
| NFR-1.3 | Server startup adds < 500ms to Local launch time |

#### NFR-2: Reliability
| ID | Requirement |
|----|-------------|
| NFR-2.1 | Server recovers gracefully from individual request failures |
| NFR-2.2 | Malformed requests don't crash the server |
| NFR-2.3 | Server handles Local service unavailability gracefully |

#### NFR-3: Observability
| ID | Requirement |
|----|-------------|
| NFR-3.1 | All operations logged with configurable verbosity |
| NFR-3.2 | Errors include actionable context |
| NFR-3.3 | Health check endpoint available for monitoring |

## Technical Design

### Transport Protocol

**Decision: HTTP with Server-Sent Events (SSE)**

| Option | Pros | Cons |
|--------|------|------|
| **stdio** | Simple, widely supported | Requires spawning process; Local already running |
| **SSE/HTTP** | Server already running in Local; no process management | Port discovery needed |
| **WebSocket** | Bidirectional | More complex; not needed for request/response |

**Rationale:** Since Local must be running for the MCP server to function, SSE is the natural choice. The server runs inside Local's addon, and AI tools connect to it. This matches how Local's existing GraphQL server operates.

**stdio Bridge (Future):** For AI tools that only support stdio, we can provide a small bridge CLI that:
1. Reads connection info from file
2. Connects to SSE server
3. Translates stdio ↔ SSE

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Local App (Electron)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  CLI Bridge Addon                            │ │
│  │  ┌─────────────────┐   ┌─────────────────────────────────┐  │ │
│  │  │   MCP Server    │   │     Local Service Access        │  │ │
│  │  │  (HTTP + SSE)   │──▶│  - siteData                     │  │ │
│  │  │                 │   │  - siteProcessManager           │  │ │
│  │  │  /mcp (SSE)     │   │  - wpCli                        │  │ │
│  │  │  /health        │   │  - deleteSite                   │  │ │
│  │  │                 │   │  - addSite                      │  │ │
│  │  └────────┬────────┘   └─────────────────────────────────┘  │ │
│  │           │                                                  │ │
│  │  ┌────────▼────────┐   ┌─────────────────────────────────┐  │ │
│  │  │  Auth Manager   │   │     Preferences UI (React)      │  │ │
│  │  │  (Token-based)  │   │  - Status display               │  │ │
│  │  └─────────────────┘   │  - Port configuration           │  │ │
│  │                        │  - Connection info              │  │ │
│  │                        │  - Start/Stop controls          │  │ │
│  │                        └─────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ HTTP + SSE (localhost only)
         │
┌────────┴────────┐  ┌─────────────┐  ┌─────────────┐
│   Claude Code   │  │  Claude.ai  │  │   Gemini    │
└─────────────────┘  └─────────────┘  └─────────────┘
```

### Connection Discovery

Connection info stored at platform-specific location:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Local/mcp-connection-info.json` |
| Windows | `%APPDATA%\Local\mcp-connection-info.json` |
| Linux | `~/.config/Local/mcp-connection-info.json` |

**File Format:**
```json
{
  "url": "http://127.0.0.1:10789/mcp",
  "authToken": "base64-encoded-token",
  "port": 10789,
  "version": "1.0.0",
  "tools": ["list_sites", "start_site", "stop_site", "..."]
}
```

### MCP Tool Definitions

#### list_sites
```json
{
  "name": "list_sites",
  "description": "List all WordPress sites in Local",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["all", "running", "stopped"],
        "default": "all"
      }
    }
  }
}
```

#### start_site
```json
{
  "name": "start_site",
  "description": "Start a WordPress site",
  "inputSchema": {
    "type": "object",
    "properties": {
      "site": {
        "type": "string",
        "description": "Site name or ID"
      }
    },
    "required": ["site"]
  }
}
```

#### wp_cli
```json
{
  "name": "wp_cli",
  "description": "Run a WP-CLI command against a site",
  "inputSchema": {
    "type": "object",
    "properties": {
      "site": {
        "type": "string",
        "description": "Site name or ID"
      },
      "command": {
        "type": "array",
        "items": { "type": "string" },
        "description": "WP-CLI command and arguments"
      }
    },
    "required": ["site", "command"]
  }
}
```

#### delete_site
```json
{
  "name": "delete_site",
  "description": "Delete a WordPress site",
  "inputSchema": {
    "type": "object",
    "properties": {
      "site": {
        "type": "string",
        "description": "Site name or ID"
      },
      "confirm": {
        "type": "boolean",
        "description": "Must be true to confirm deletion"
      },
      "trashFiles": {
        "type": "boolean",
        "default": true,
        "description": "Move files to trash vs just remove from Local"
      }
    },
    "required": ["site", "confirm"]
  }
}
```

### Preferences UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Server                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: ● Running                     [Stop Server]        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Port: [10789    ]  [Apply]                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Connection Info (for AI tools):                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                    │   │
│  │   "url": "http://127.0.0.1:10789/mcp",              │   │
│  │   "authToken": "abc123..."                          │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                         [Copy to Clipboard] │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Test Connection]    [Regenerate Token]    [View Logs]     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Available Tools:                                           │
│  • list_sites    • start_site    • stop_site               │
│  • restart_site  • create_site   • delete_site             │
│  • wp_cli        • get_site      • get_local_info          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling

| Scenario | User Message | Action |
|----------|--------------|--------|
| Port in use | "Port 10789 is in use. Trying 10790..." | Auto-select next port |
| Port in use (all tried) | "Could not find available port. Please configure manually." | Show preferences |
| Local services not ready | "Waiting for Local services..." | Retry with backoff |
| Auth token invalid | "Invalid authentication token" | 401 response |
| Site not found | "Site 'xyz' not found. Available sites: a, b, c" | Include suggestions |
| Site not running (for wp_cli) | "Site 'xyz' is not running. Start it first." | Include remedy |

## Implementation Plan

### Phase 1: MVP (Week 1-2)
- [ ] MCP server with SSE transport
- [ ] Auto-start/stop with Local
- [ ] Dynamic port selection
- [ ] Localhost + token auth
- [ ] Core tools: list_sites, start_site, stop_site, restart_site, wp_cli
- [ ] Connection info file
- [ ] Basic logging

### Phase 2: Preferences UI (Week 3)
- [ ] Status display
- [ ] Port configuration
- [ ] Connection info display with copy
- [ ] Start/stop controls
- [ ] View logs link

### Phase 3: Full Features (Week 4)
- [ ] All MCP tools (create, delete, get_site, get_local_info)
- [ ] Test connection button
- [ ] Regenerate token
- [ ] Reset to defaults
- [ ] Cross-platform testing

### Phase 4: Documentation & Polish (Week 5)
- [ ] User documentation (setup guides for each AI tool)
- [ ] Developer documentation (architecture, extending)
- [ ] Troubleshooting guide
- [ ] Release preparation

## Testing Strategy

### Unit Tests
- Tool input validation
- Auth token generation/validation
- Port selection logic
- Error message formatting

### Integration Tests
- Server startup/shutdown
- Tool execution against real Local services
- Concurrent request handling
- Cross-platform file path handling

### Manual Test Plan
- [ ] Fresh install on macOS
- [ ] Fresh install on Windows
- [ ] Fresh install on Linux
- [ ] Upgrade from previous version
- [ ] Claude Code integration
- [ ] Claude.ai integration
- [ ] Port conflict handling
- [ ] Local quit/restart cycle

## Open Questions

1. **Token storage:** Should token be stored in system keychain (more secure) or file (simpler)?
2. **Rate limiting:** Should we rate limit requests to prevent abuse?
3. **Timeout handling:** What's the max execution time for wp_cli commands?
4. **Streaming output:** Should long-running commands stream output or wait for completion?

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Local Addon Development](https://localwp.com/docs/addons)
