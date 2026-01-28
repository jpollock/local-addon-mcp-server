---
layout: default
title: Developer Guide
---

# MCP Server Developer Guide

This guide explains the architecture and implementation of the MCP Server addon for Local by WP Engine.

## Architecture Overview

```
local-addon-mcp-server/
├── bin/
│   └── mcp-stdio.js              # stdio MCP transport (spawned by Claude Code)
├── src/
│   ├── common/                   # Shared code between main and renderer
│   │   ├── constants.ts          # Server constants (ports, names, etc.)
│   │   └── types.ts              # TypeScript interfaces
│   ├── main/                     # Main process (Node.js)
│   │   ├── index.ts              # Addon entry point + GraphQL mutations
│   │   ├── config/
│   │   │   └── ConnectionInfo.ts # Connection info file management
│   │   └── mcp/
│   │       ├── McpServer.ts      # HTTP/SSE server implementation
│   │       ├── McpAuth.ts        # Token authentication
│   │       └── tools/            # MCP tool implementations
│   │           ├── index.ts      # Tool registry
│   │           ├── listSites.ts
│   │           ├── startSite.ts
│   │           ├── stopSite.ts
│   │           ├── restartSite.ts
│   │           ├── wpCli.ts
│   │           ├── getSite.ts
│   │           ├── createSite.ts
│   │           ├── deleteSite.ts
│   │           └── getLocalInfo.ts
│   └── renderer/                 # Renderer process (React)
│       ├── index.tsx             # Renderer entry point
│       └── components/           # Preferences UI components
├── docs/
│   ├── RFC-001-MCP-Server.md
│   ├── IMPLEMENTATION-PLAN.md
│   ├── USER-GUIDE.md
│   ├── DEVELOPER-GUIDE.md
│   └── TROUBLESHOOTING.md
└── lib/                          # Compiled output
```

## Dual Transport Architecture

The addon supports two MCP transports:

### 1. stdio Transport (Primary)

**File:** `bin/mcp-stdio.js`

The stdio transport is a standalone Node.js script that Claude Code spawns directly. It communicates with Local via Local's GraphQL API.

```
Claude Code ──stdio──> mcp-stdio.js ──GraphQL──> Local
```

**Advantages:**
- Works reliably with Claude Code
- No complex SSE connection handling
- Self-contained, no Local process dependencies during tool execution

**How it works:**
```javascript
// mcp-stdio.js connects to Local's GraphQL
const info = getGraphQLConnectionInfo(); // Reads from connection info file
const response = await fetch(info.url, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${info.authToken}` },
  body: JSON.stringify({ query, variables }),
});
```

### 2. SSE Transport (Secondary)

**File:** `src/main/mcp/McpServer.ts`

The SSE transport runs inside Local's Electron process and has direct access to Local's service container.

```
MCP Client ──HTTP/SSE──> Local (McpServer) ──direct──> Local Services
```

**Used for:**
- Health checks (`/health` endpoint)
- Future browser-based AI tools
- Tools that need instant access to Local services

## Core Components

### McpServer (src/main/mcp/McpServer.ts)

The HTTP server that implements the MCP protocol over SSE.

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
- Token persisted across restarts

### GraphQL Extensions (src/main/index.ts)

The addon extends Local's GraphQL API with mutations that the stdio transport uses:

```typescript
graphql.registerGraphQLService('mcp-server', typeDefs, resolvers);
```

**Custom Mutations:**
- `createSite` - Creates site with proper WordPress installation
- `deleteSite` - Deletes site with file handling options
- `wpCli` - Executes WP-CLI commands

### Tool Registry (src/main/mcp/tools/index.ts)

Central registry for all available MCP tools.

**Functions:**
- `registerTools()` - Register all tools at startup
- `getToolDefinitions()` - Get MCP tool schemas
- `getToolNames()` - Get list of tool names
- `executeTool(name, args, services)` - Execute a tool
- `hasTool(name)` - Check if tool exists

## Adding a New Tool

### Step 1: Add to stdio Transport

Edit `bin/mcp-stdio.js`:

```javascript
// Add tool definition to the tools array
const tools = [
  // ... existing tools
  {
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
  },
];

// Add handler in the handleTool switch statement
case 'my_new_tool': {
  const data = await graphqlRequest(`
    query {
      // Your GraphQL query here
    }
  `);

  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
```

### Step 2: Add GraphQL Mutation (if needed)

If your tool needs functionality not exposed in Local's GraphQL API, add a mutation in `src/main/index.ts`:

```typescript
const typeDefs = gql`
  input MyToolInput {
    param1: String!
  }

  type MyToolResult {
    success: Boolean!
    data: String
    error: String
  }

  extend type Mutation {
    myToolMutation(input: MyToolInput!): MyToolResult!
  }
`;

const resolvers = {
  Mutation: {
    myToolMutation: async (_parent, args) => {
      const { param1 } = args.input;
      // Use internal services
      return { success: true, data: 'result' };
    },
  },
};
```

### Step 3: Add to SSE Transport (optional)

Create `src/main/mcp/tools/myNewTool.ts`:

```typescript
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

export async function myNewTool(
  args: Record<string, unknown>,
  services: LocalServices
): Promise<McpToolResult> {
  const { param1 } = args as { param1: string };

  try {
    // Direct service access
    const result = { success: true };
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

Register in `src/main/mcp/tools/index.ts`.

### Step 4: Build and Test

```bash
npm run build
# Restart Local (for SSE transport changes)
# Test the new tool via Claude Code
```

## Local Services API

The `LocalServices` interface provides access to Local's internal services:

```typescript
interface LocalServices {
  siteData: {
    getSites(): Record<string, any>;      // Get all sites
    getSite(id: string): any | undefined; // Get site by ID
  };
  siteProcessManager: {
    start(site: any): Promise<void>;
    stop(site: any): Promise<void>;
    restart(site: any): Promise<void>;
    getSiteStatus(site: any): Promise<string>;
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
| `notifications/initialized` | Client ready notification |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
| `ping` | Health check |

## Error Handling

Tools should return errors in a consistent format:

```typescript
return {
  content: [{
    type: 'text',
    text: 'Error: Descriptive error message. Suggestion for next steps.'
  }],
  isError: true,
};
```

**Best practices:**
- Always include helpful error messages
- Suggest next steps when possible (e.g., "Start the site first")
- Log errors to `services.localLogger`

## Testing

### Testing stdio Transport

```bash
# Test directly with JSON-RPC
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node bin/mcp-stdio.js

# Test tool execution
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_sites","arguments":{}}}' | node bin/mcp-stdio.js
```

### Testing SSE Transport

```bash
# Health check
curl http://127.0.0.1:10789/health

# List tools
TOKEN="your-auth-token"
curl -X POST http://127.0.0.1:10789/mcp/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Integration Testing

Test with Claude Code to verify real-world behavior.

## Debugging

### Logs

Check Local's logs for addon output:
- macOS: `~/Library/Logs/Local/local.log`
- Windows: `%LOCALAPPDATA%\Local\logs\local.log`

The addon logs with `[MCP Server]` prefix:
```
[MCP Server] MCP server started on port 10789
[MCP Server] Running WP-CLI: wp plugin list
```

### stdio Transport Debugging

Add debug output to stderr (doesn't interfere with MCP protocol):
```javascript
console.error('[DEBUG] Processing request:', method);
```

### Common Issues

1. **GraphQL connection failed** - Local not running or connection info file missing
2. **Tool not found** - Check tool is added to both definition array and switch statement
3. **TypeScript errors** - Run `npm run build` to see compile errors
4. **Token mismatch** - Token regenerates on Local restart; update Claude config

## Development Workflow

```bash
# Install dependencies
npm install

# Development build with watch
npm run watch

# Create symlink (first time only)
ln -sf "$(pwd)" "$HOME/Library/Application Support/Local/addons/local-addon-mcp-server"

# After changes:
# - stdio changes: No restart needed
# - Main process changes: Restart Local
# - Renderer changes: Cmd+R in Local (with dev menu enabled)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on macOS (and Windows/Linux if possible)
5. Submit a pull request

### Commit Messages

Follow conventional commits:
```
feat: Add new tool for site export
fix: Handle missing site gracefully
docs: Update troubleshooting guide
refactor: Simplify tool registration
```

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Local Addon Development](https://localwp.com/docs/addons)
- [Local by WP Engine](https://localwp.com)
- [Electron Documentation](https://www.electronjs.org/docs)
