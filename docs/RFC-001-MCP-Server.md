# RFC-001: MCP Server for Local

**Status:** Approved
**Author:** Jeremy Pollock
**Created:** 2026-01-28
**Last Updated:** 2026-01-29

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
| ID | Requirement | Status |
|----|-------------|--------|
| FR-1.1 | MCP server starts automatically when addon is activated and Local launches | ✅ Done |
| FR-1.2 | MCP server stops gracefully when Local quits | ✅ Done |
| FR-1.3 | MCP server starts on configured port; if unavailable, selects next available port | ✅ Done |
| FR-1.4 | If server fails to start, user receives actionable error message | ✅ Done |
| FR-1.5 | Server waits for Local core services before accepting connections | ✅ Done |
| FR-1.6 | Connection info persisted to discoverable file location | ✅ Done |

#### FR-2: User Configuration
| ID | Requirement | Status |
|----|-------------|--------|
| FR-2.1 | Preferences UI shows MCP server status (Running/Stopped/Error) | ✅ Done |
| FR-2.2 | Preferences UI displays connection info for AI tool configuration | ✅ Done |
| FR-2.3 | User can start/stop MCP server from Preferences | ⏳ Planned |
| FR-2.4 | User can change port from Preferences (requires restart) | ⏳ Planned |
| FR-2.5 | User can copy connection config to clipboard | ✅ Done |
| FR-2.6 | User can test connection from Preferences | ⏳ Planned |
| FR-2.7 | User can view/access log file location | ⏳ Planned |
| FR-2.8 | User can reset to default settings | ⏳ Planned |
| FR-2.9 | User can regenerate authentication token | ⏳ Planned |

#### FR-3: MCP Tools
| ID | Requirement | Status |
|----|-------------|--------|
| FR-3.1 | `list_sites` - List all sites with name, ID, status, domain | ✅ Done |
| FR-3.2 | `get_site` - Get detailed site information by name or ID | ✅ Done |
| FR-3.3 | `start_site` - Start a stopped site | ✅ Done |
| FR-3.4 | `stop_site` - Stop a running site | ✅ Done |
| FR-3.5 | `restart_site` - Restart a site | ✅ Done |
| FR-3.6 | `create_site` - Create new WordPress site with configuration | ✅ Done |
| FR-3.7 | `delete_site` - Delete a site (with confirmation parameter) | ✅ Done |
| FR-3.8 | `wp_cli` - Execute WP-CLI command against a site | ✅ Done |
| FR-3.9 | `get_local_info` - Get Local version and status | ✅ Done |

#### FR-4: Security
| ID | Requirement | Status |
|----|-------------|--------|
| FR-4.1 | Server accepts connections only from localhost (127.0.0.1, ::1) | ✅ Done |
| FR-4.2 | Authentication token required for all requests | ✅ Done |
| FR-4.3 | Token generated on first start, stored securely | ✅ Done |
| FR-4.4 | Destructive operations (delete) require explicit confirmation parameter | ✅ Done |
| FR-4.5 | No credentials or secrets exposed via MCP tools | ✅ Done |

#### FR-5: Cross-Platform
| ID | Requirement | Status |
|----|-------------|--------|
| FR-5.1 | Addon works on macOS (Intel and Apple Silicon) | ✅ Done |
| FR-5.2 | Addon works on Windows (x64) | ⏳ Needs Testing |
| FR-5.3 | Addon works on Linux (x64) | ⏳ Needs Testing |
| FR-5.4 | File paths and port handling work correctly on all platforms | ✅ Done |

### Non-Functional Requirements

#### NFR-1: Performance
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-1.1 | Server handles at least 10 concurrent connections | ✅ Done |
| NFR-1.2 | Tool responses return within 30 seconds (except long-running operations) | ✅ Done |
| NFR-1.3 | Server startup adds < 500ms to Local launch time | ✅ Done |

#### NFR-2: Reliability
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-2.1 | Server recovers gracefully from individual request failures | ✅ Done |
| NFR-2.2 | Malformed requests don't crash the server | ✅ Done |
| NFR-2.3 | Server handles Local service unavailability gracefully | ✅ Done |

#### NFR-3: Observability
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-3.1 | All operations logged with configurable verbosity | ⏳ Partial |
| NFR-3.2 | Errors include actionable context | ✅ Done |
| NFR-3.3 | Health check endpoint available for monitoring | ✅ Done |

## Technical Design

### Transport Protocol

**Decision: Dual Transport (stdio primary, SSE secondary)**

| Transport | Use Case | Status |
|-----------|----------|--------|
| **stdio** | Claude Code and other MCP clients | ✅ Primary |
| **SSE/HTTP** | Health checks, future browser-based tools | ✅ Secondary |

**Rationale:** While SSE was initially chosen as the primary transport, testing revealed that Claude Code works more reliably with stdio transport. The addon now provides both:

1. **stdio transport** (`bin/mcp-stdio.js`) - A standalone Node.js script that Claude Code spawns directly. It connects to Local's GraphQL API to execute operations.

2. **SSE transport** (embedded in addon) - HTTP server running on localhost for health checks and tools that support SSE.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Local App (Electron)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     MCP Server Addon                         │ │
│  │  ┌─────────────────┐   ┌─────────────────────────────────┐  │ │
│  │  │   SSE Server    │   │     GraphQL Extensions          │  │ │
│  │  │  (HTTP/SSE)     │   │  - createSite mutation          │  │ │
│  │  │                 │   │  - deleteSite mutation          │  │ │
│  │  │  /health        │   │  - wpCli mutation               │  │ │
│  │  │  /mcp           │   │                                 │  │ │
│  │  └────────┬────────┘   └─────────────────────────────────┘  │ │
│  │           │                         ▲                        │ │
│  │           │            ┌────────────┘                        │ │
│  │  ┌────────▼────────┐   │   ┌─────────────────────────────┐  │ │
│  │  │  Auth Manager   │   │   │     Preferences UI (React)  │  │ │
│  │  │  (Token-based)  │   │   │  - Status display           │  │ │
│  │  └─────────────────┘   │   │  - Connection info          │  │ │
│  │                        │   └─────────────────────────────┘  │ │
│  └────────────────────────┼────────────────────────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────────┐ │
│  │              Local Services (via GraphQL)                    │ │
│  │  - siteData        - siteProcessManager    - wpCli          │ │
│  │  - deleteSite      - addSite               - localLogger    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ HTTP (localhost)             │ GraphQL (localhost)
         │                              │
┌────────┴────────┐            ┌────────┴────────┐
│  Health Checks  │            │  bin/mcp-stdio  │ ◀── stdio ── Claude Code
└─────────────────┘            └─────────────────┘
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
  "url": "http://127.0.0.1:10789",
  "authToken": "base64-encoded-token",
  "port": 10789,
  "version": "1.0.0",
  "tools": ["list_sites", "start_site", "stop_site", "restart_site", "wp_cli", "get_site", "create_site", "delete_site", "get_local_info", "wpe_status", "wpe_authenticate", "list_wpe_sites", "..."]
}
```

### Claude Code Configuration

For stdio transport, configure Claude Code with:

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

#### restart_site
```json
{
  "name": "restart_site",
  "description": "Restart a WordPress site",
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

#### create_site
```json
{
  "name": "create_site",
  "description": "Create a new WordPress site",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Site name (required)"
      },
      "php_version": {
        "type": "string",
        "description": "PHP version (e.g., '8.2.10')"
      }
    },
    "required": ["name"]
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

## Resolved Questions

1. **Token storage:** File storage chosen for simplicity (not keychain)
2. **Rate limiting:** Not implemented for v1.0
3. **Timeout handling:** 30 second default timeout for tool execution
4. **Streaming output:** Not implemented; commands wait for completion

## Future Phases (Proposed)

Based on analysis of Local's full feature set, the following phases are proposed for future development:

### Phase 8: WordPress Development Tools
| ID | Requirement | Priority | GraphQL Status |
|----|-------------|----------|----------------|
| FR-8.1 | `import_site` - Import site from zip file | High | Needs work |
| FR-8.2 | `export_database` - Export database to SQL file | High | As-is (WP-CLI) |
| FR-8.3 | `import_database` - Import SQL file to database | High | As-is (WP-CLI) |
| FR-8.4 | `open_adminer` - Open database admin UI | High | As-is |
| FR-8.5 | `rename_site` - Rename a site | Medium | Needs work |
| FR-8.6 | `change_php_version` - Change site PHP version | Medium | Needs work |
| FR-8.7 | `trust_ssl` - Trust site SSL certificate | Medium | As-is |

### Phase 9: Site Configuration & Dev Tools
| ID | Requirement | Priority | GraphQL Status |
|----|-------------|----------|----------------|
| FR-9.1 | `change_domain` - Change site domain | Medium | Needs work |
| FR-9.2 | `toggle_xdebug` - Enable/disable Xdebug | Medium | As-is |
| FR-9.3 | `get_site_logs` - Retrieve site log files | Medium | As-is |
| FR-9.4 | `open_in_editor` - Open site in VS Code | Low | As-is |
| FR-9.5 | `open_terminal` - Open terminal at site path | Low | As-is |
| FR-9.6 | `list_services` - List available PHP/MySQL/Nginx versions | Low | As-is |

### Phase 10: Backup & Restore (Feature Flag Dependent)
| ID | Requirement | Priority | GraphQL Status |
|----|-------------|----------|----------------|
| FR-10.1 | `create_backup` - Create site backup | Medium | Needs work |
| FR-10.2 | `list_backups` - List available backups | Medium | Needs work |
| FR-10.3 | `restore_backup` - Restore from backup | Medium | Needs work |

### Phase 11: WP Engine Connect/Sync ✅ Complete
| ID | Requirement | Status |
|----|-------------|--------|
| FR-11.1 | `wpe_status` - Check WP Engine authentication status | ✅ Done |
| FR-11.2 | `wpe_authenticate` - Trigger OAuth flow with WP Engine | ✅ Done |
| FR-11.3 | `wpe_logout` - Clear WP Engine authentication | ✅ Done |
| FR-11.4 | `list_wpe_sites` - List all sites from WP Engine account | ✅ Done |
| FR-11.5 | `get_wpe_link` - Get detailed WPE connection info for a local site | ✅ Done |
| FR-11.6 | `push_to_wpe` - Push local changes to WP Engine | ✅ Done |
| FR-11.7 | `pull_from_wpe` - Pull changes from WP Engine to local | ✅ Done |
| FR-11.8 | `get_sync_history` - Get recent sync operations for a site | ✅ Done |
| FR-11.9 | `get_site_changes` - Preview file changes between local and WPE | ✅ Done |

**Note:** See [PHASE-11-WPE-CONNECT.md](./PHASE-11-WPE-CONNECT.md) for detailed documentation.

### Not Recommended for MCP
The following features are explicitly excluded due to security or complexity concerns:
- Account/OAuth management
- Cloud storage authentication
- Feature flag modifications
- Addon lifecycle management
- System-level operations (hosts file, router daemon)

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Local Addon Development](https://localwp.com/docs/addons)
