# MCP Server Developer Guide

This guide explains the architecture and implementation of the MCP Server addon for Local by WP Engine.

## Architecture Overview

```
local-addon-cli-bridge/
├── src/
│   ├── common/                    # Shared code between main and renderer
│   │   ├── constants.ts           # Server constants (ports, names, etc.)
│   │   └── types.ts               # TypeScript interfaces
│   ├── main/                      # Main process (Node.js)
│   │   ├── index.ts               # Addon entry point
│   │   ├── config/
│   │   │   └── ConnectionInfo.ts  # Connection info file management
│   │   └── mcp/
│   │       ├── McpServer.ts       # HTTP server implementation
│   │       ├── McpAuth.ts         # Token authentication
│   │       └── tools/             # MCP tool implementations
│   │           ├── index.ts       # Tool registry
│   │           ├── listSites.ts
│   │           ├── startSite.ts
│   │           ├── stopSite.ts
│   │           ├── restartSite.ts
│   │           ├── wpCli.ts
│   │           ├── getSite.ts
│   │           ├── createSite.ts
│   │           ├── deleteSite.ts
│   │           └── getLocalInfo.ts
│   └── renderer/                  # Renderer process (React)
│       └── index.tsx              # Preferences UI
├── docs/
│   ├── RFC-001-MCP-Server.md
│   ├── IMPLEMENTATION-PLAN.md
│   ├── USER-GUIDE.md
│   ├── DEVELOPER-GUIDE.md
│   └── TROUBLESHOOTING.md
└── lib/                           # Compiled output
```

## Core Components

### McpServer (src/main/mcp/McpServer.ts)

The main HTTP server that implements the MCP protocol over SSE (Server-Sent Events).

**Key Features:**
- Dynamic port selection if preferred port is unavailable
- Localhost-only binding for security
- Token-based authentication
- SSE transport for real-time communication

**Endpoints:**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/mcp/sse` | GET | Yes | SSE connection for MCP |
| `/mcp/messages` | POST | Yes | Tool invocation |

### McpAuth (src/main/mcp/McpAuth.ts)

Handles authentication token generation and validation.

**Security measures:**
- 128-character base64 tokens
- IP whitelist (localhost only)
- Bearer token in Authorization header

### Tool Registry (src/main/mcp/tools/index.ts)

Central registry for all available MCP tools.

**Functions:**
- `registerTools()` - Register all tools at startup
- `getToolDefinitions()` - Get MCP tool schemas
- `getToolNames()` - Get list of tool names
- `executeTool(name, args, services)` - Execute a tool
- `hasTool(name)` - Check if tool exists

## Adding a New Tool

### Step 1: Create the Tool File

Create a new file in `src/main/mcp/tools/`:

```typescript
// src/main/mcp/tools/myNewTool.ts

import { McpToolDefinition, McpToolResult, LocalServices } from '../../../common/types';

export const myNewToolDefinition: McpToolDefinition = {
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1',
      },
    },
    required: ['param1'],
  },
};

interface MyNewToolArgs {
  param1: string;
}

export async function myNewTool(
  args: Record<string, unknown>,
  services: LocalServices
): Promise<McpToolResult> {
  const { param1 } = args as unknown as MyNewToolArgs;

  if (!param1) {
    return {
      content: [{ type: 'text', text: 'Error: param1 is required' }],
      isError: true,
    };
  }

  try {
    // Your tool logic here
    const result = { success: true, data: 'your data' };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}
```

### Step 2: Register the Tool

Add imports and registration in `src/main/mcp/tools/index.ts`:

```typescript
import { myNewTool, myNewToolDefinition } from './myNewTool';

export function registerTools(): void {
  // ... existing tools
  tools.set('my_new_tool', { definition: myNewToolDefinition, handler: myNewTool });
}
```

### Step 3: Build and Test

```bash
npm run build
# Restart Local
# Test the new tool via curl or your AI tool
```

## Local Services API

The `LocalServices` interface provides access to Local's internal services:

```typescript
interface LocalServices {
  siteData: {
    getSites(): Record<string, any>;      // Get all sites (key-value map)
    getSite(id: string): any | undefined; // Get site by ID
  };
  siteProcessManager: {
    start(site: any): Promise<void>;
    stop(site: any): Promise<void>;
    restart(site: any): Promise<void>;
    getSiteStatus(site: any): Promise<string>; // 'running' | 'halted' | etc.
  };
  wpCli: {
    run(site: any, args: string[], opts?: any): Promise<string | null>;
  };
  deleteSite: {
    deleteSite(opts: { site: any; trashFiles: boolean; updateHosts: boolean }): Promise<void>;
  };
  addSite: {
    addSite(opts: {
      newSiteInfo: { siteName: string; siteDomain: string; sitePath: string; ... };
      wpCredentials?: { adminUsername?: string; adminPassword?: string; adminEmail?: string };
      goToSite?: boolean;
    }): Promise<any>;
  };
  localLogger: {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  };
}
```

## MCP Protocol

The server implements MCP protocol version `2024-11-05`.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_sites",
    "arguments": {}
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ \"sites\": [...] }"
      }
    ]
  }
}
```

### Supported Methods

| Method | Description |
|--------|-------------|
| `initialize` | Initialize MCP session |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |

## Error Handling

Tools should return errors in a consistent format:

```typescript
return {
  content: [{
    type: 'text',
    text: 'Error: Descriptive error message with suggestion'
  }],
  isError: true,
};
```

**Best practices:**
- Always include helpful error messages
- Suggest next steps when possible
- Log errors to `services.localLogger`

## Testing

### Manual Testing

```bash
# Health check
curl http://127.0.0.1:10789/health

# List tools
TOKEN="your-auth-token"
curl -X POST http://127.0.0.1:10789/mcp/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call a tool
curl -X POST http://127.0.0.1:10789/mcp/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_sites","arguments":{}}}'
```

### Integration Testing

Test with Claude Code or another MCP client to verify real-world behavior.

## Logging

Use `services.localLogger` for consistent logging:

```typescript
services.localLogger.info('[MCP] Tool executed successfully');
services.localLogger.warn('[MCP] Site not found');
services.localLogger.error('[MCP] Tool failed:', error);
```

Logs appear in Local's application logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Resources

- [MCP Specification](https://modelcontextprotocol.io/spec)
- [Local Addon Development](https://localwp.com/docs)
- [Local by WP Engine](https://localwp.com)
