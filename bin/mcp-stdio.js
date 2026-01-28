#!/usr/bin/env node
/**
 * Local MCP Server - stdio transport
 *
 * This script acts as an MCP server using stdio transport,
 * bridging to Local's GraphQL API for site management.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Get Local's GraphQL connection info
function getGraphQLConnectionInfo() {
  const platform = os.platform();
  let configPath;

  switch (platform) {
    case 'darwin':
      configPath = path.join(os.homedir(), 'Library', 'Application Support', 'Local', 'graphql-connection-info.json');
      break;
    case 'win32':
      configPath = path.join(process.env.APPDATA || '', 'Local', 'graphql-connection-info.json');
      break;
    default:
      configPath = path.join(os.homedir(), '.config', 'Local', 'graphql-connection-info.json');
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

// Make GraphQL request to Local (compatible with Node.js < 18)
async function graphqlRequest(query, variables = {}) {
  const info = getGraphQLConnectionInfo();
  if (!info) {
    throw new Error('Local is not running or GraphQL connection info not found');
  }

  const body = JSON.stringify({ query, variables });
  const url = new URL(info.url);
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = httpModule.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${info.authToken}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`GraphQL request failed: ${res.statusCode}`));
          return;
        }
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            reject(new Error(result.errors[0].message));
            return;
          }
          resolve(result.data);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Tool definitions
const tools = [
  {
    name: 'list_sites',
    description: 'List all WordPress sites in Local with their name, ID, status, and domain',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'running', 'stopped'],
          description: 'Filter sites by status (default: all)',
        },
      },
    },
  },
  {
    name: 'get_site',
    description: 'Get detailed information about a WordPress site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'start_site',
    description: 'Start a WordPress site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'stop_site',
    description: 'Stop a running WordPress site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'restart_site',
    description: 'Restart a WordPress site (stops then starts it)',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'wp_cli',
    description: 'Run a WP-CLI command against a WordPress site. The site must be running.',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        command: {
          type: 'array',
          items: { type: 'string' },
          description: 'WP-CLI command as array, e.g. ["plugin", "list", "--format=json"]',
        },
      },
      required: ['site', 'command'],
    },
  },
  {
    name: 'create_site',
    description: 'Create a new WordPress site in Local. The site will be created and started automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Site name (required)',
        },
        php_version: {
          type: 'string',
          description: 'PHP version (e.g., "8.2.10"). Uses Local default if not specified.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_site',
    description: 'Delete a WordPress site. Requires confirm=true as a safety measure.',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion',
        },
      },
      required: ['site', 'confirm'],
    },
  },
  {
    name: 'get_local_info',
    description: 'Get information about Local installation including version, platform, and available tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'open_site',
    description: 'Open a WordPress site in the default browser',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        path: {
          type: 'string',
          description: 'Path to open (default: /, use /wp-admin for admin panel)',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'clone_site',
    description: 'Clone an existing WordPress site to create a copy with a new name',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID to clone',
        },
        new_name: {
          type: 'string',
          description: 'Name for the cloned site',
        },
      },
      required: ['site', 'new_name'],
    },
  },
  {
    name: 'export_site',
    description: 'Export a WordPress site to a zip file',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID to export',
        },
        output_path: {
          type: 'string',
          description: 'Output directory path (default: ~/Downloads)',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'list_blueprints',
    description: 'List all available site blueprints (templates)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'save_blueprint',
    description: 'Save a site as a blueprint (template) for creating new sites',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID to save as blueprint',
        },
        name: {
          type: 'string',
          description: 'Name for the blueprint',
        },
      },
      required: ['site', 'name'],
    },
  },
];

// Find site by name or ID
async function findSite(siteIdentifier) {
  const data = await graphqlRequest(`
    query {
      sites {
        id
        name
        status
        domain
      }
    }
  `);

  const sites = data.sites || [];
  const searchLower = siteIdentifier.toLowerCase();

  // Try exact ID match first
  let site = sites.find(s => s.id === siteIdentifier);
  if (site) return site;

  // Try exact name match
  site = sites.find(s => s.name.toLowerCase() === searchLower);
  if (site) return site;

  // Try partial name match
  site = sites.find(s => s.name.toLowerCase().includes(searchLower));
  if (site) return site;

  return null;
}

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case 'list_sites': {
      const data = await graphqlRequest(`
        query {
          sites {
            id
            name
            status
            domain
          }
        }
      `);

      let sites = data.sites || [];

      if (args.status === 'running') {
        sites = sites.filter(s => s.status === 'running');
      } else if (args.status === 'stopped') {
        sites = sites.filter(s => s.status !== 'running');
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ sites, count: sites.length }, null, 2),
        }],
      };
    }

    case 'get_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(site, null, 2) }],
      };
    }

    case 'start_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      await graphqlRequest(`
        mutation($id: ID!) {
          startSite(id: $id) {
            id
            status
          }
        }
      `, { id: site.id });

      return {
        content: [{ type: 'text', text: `Started site: ${site.name}` }],
      };
    }

    case 'stop_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      await graphqlRequest(`
        mutation($id: ID!) {
          stopSite(id: $id) {
            id
            status
          }
        }
      `, { id: site.id });

      return {
        content: [{ type: 'text', text: `Stopped site: ${site.name}` }],
      };
    }

    case 'restart_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      await graphqlRequest(`
        mutation($id: ID!) {
          restartSite(id: $id) {
            id
            status
          }
        }
      `, { id: site.id });

      return {
        content: [{ type: 'text', text: `Restarted site: ${site.name}` }],
      };
    }

    case 'wp_cli': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: WpCliInput!) {
          wpCli(input: $input) {
            success
            output
            error
          }
        }
      `, {
        input: {
          siteId: site.id,
          args: args.command,
        },
      });

      const result = data.wpCli;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `WP-CLI error: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: result.output || 'Command completed successfully' }],
      };
    }

    case 'create_site': {
      if (!args.name) {
        return {
          content: [{ type: 'text', text: 'Error: name is required' }],
          isError: true,
        };
      }

      const input = {
        name: args.name,
      };

      if (args.php_version) {
        input.phpVersion = args.php_version;
      }

      const data = await graphqlRequest(`
        mutation($input: CreateSiteInput!) {
          createSite(input: $input) {
            success
            error
            siteId
            siteName
            siteDomain
          }
        }
      `, { input });

      const result = data.createSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to create site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Created site: ${result.siteName}\nDomain: ${result.siteDomain}\nID: ${result.siteId}\nAdmin: admin / password\n\nThe site is being provisioned and will start automatically.`,
        }],
      };
    }

    case 'delete_site': {
      if (!args.confirm) {
        return {
          content: [{ type: 'text', text: 'Deletion not confirmed. Set confirm=true to delete the site.' }],
          isError: true,
        };
      }

      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      await graphqlRequest(`
        mutation($input: DeleteSiteInput!) {
          deleteSite(input: $input) {
            success
            error
          }
        }
      `, {
        input: {
          id: site.id,
          trashFiles: true,
        },
      });

      return {
        content: [{ type: 'text', text: `Deleted site: ${site.name}` }],
      };
    }

    case 'get_local_info': {
      const data = await graphqlRequest(`
        query {
          sites {
            id
          }
        }
      `);

      const siteCount = data.sites?.length || 0;
      const platform = os.platform();
      const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';

      const info = {
        mcpServerVersion: '1.0.0',
        platform: platformName,
        arch: os.arch(),
        siteCount: siteCount,
        availableTools: tools.map(t => t.name),
        transport: 'stdio',
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    }

    case 'open_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const sitePath = args.path || '/';
      const data = await graphqlRequest(`
        mutation($input: OpenSiteInput!) {
          openSite(input: $input) {
            success
            error
            url
          }
        }
      `, {
        input: {
          siteId: site.id,
          path: sitePath,
        },
      });

      const result = data.openSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to open site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: `Opened ${site.name} in browser: ${result.url}` }],
      };
    }

    case 'clone_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      if (!args.new_name) {
        return {
          content: [{ type: 'text', text: 'Error: new_name is required' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: CloneSiteInput!) {
          cloneSite(input: $input) {
            success
            error
            newSiteId
            newSiteName
            newSiteDomain
          }
        }
      `, {
        input: {
          siteId: site.id,
          newName: args.new_name,
        },
      });

      const result = data.cloneSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to clone site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Cloned ${site.name} to ${result.newSiteName}\nNew site ID: ${result.newSiteId}\nNew domain: ${result.newSiteDomain}`,
        }],
      };
    }

    case 'export_site': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ExportSiteInput!) {
          exportSite(input: $input) {
            success
            error
            exportPath
          }
        }
      `, {
        input: {
          siteId: site.id,
          outputPath: args.output_path || null,
        },
      });

      const result = data.exportSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to export site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Exported ${site.name} to:\n${result.exportPath}`,
        }],
      };
    }

    case 'list_blueprints': {
      const data = await graphqlRequest(`
        query {
          blueprints {
            success
            error
            blueprints {
              name
              lastModified
              phpVersion
              webServer
              database
            }
          }
        }
      `);

      const result = data.blueprints;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to list blueprints: ${result.error}` }],
          isError: true,
        };
      }

      if (!result.blueprints || result.blueprints.length === 0) {
        return {
          content: [{ type: 'text', text: 'No blueprints found. Use save_blueprint to create one from an existing site.' }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ blueprints: result.blueprints, count: result.blueprints.length }, null, 2),
        }],
      };
    }

    case 'save_blueprint': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      if (!args.name) {
        return {
          content: [{ type: 'text', text: 'Error: name is required' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: SaveBlueprintInput!) {
          saveBlueprint(input: $input) {
            success
            error
            blueprintName
          }
        }
      `, {
        input: {
          siteId: site.id,
          name: args.name,
        },
      });

      const result = data.saveBlueprint;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to save blueprint: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Saved ${site.name} as blueprint: ${result.blueprintName}\n\nYou can now create new sites from this blueprint.`,
        }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

// Process MCP messages
async function processMessage(message) {
  const { id, method, params } = message;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'local-mcp',
            version: '1.0.0',
          },
        },
      };

    case 'notifications/initialized':
      return null; // No response for notifications

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools },
      };

    case 'tools/call':
      try {
        const result = await handleTool(params.name, params.arguments || {});
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        };
      }

    case 'ping':
      return {
        jsonrpc: '2.0',
        id,
        result: {},
      };

    default:
      if (method?.startsWith('notifications/')) {
        return null;
      }
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Unknown method: ${method}`,
        },
      };
  }
}

// Main loop
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

let pendingRequests = 0;
let closing = false;

function checkExit() {
  if (closing && pendingRequests === 0) {
    process.exit(0);
  }
}

rl.on('line', async (line) => {
  pendingRequests++;
  try {
    const message = JSON.parse(line);
    const response = await processMessage(message);

    if (response) {
      console.log(JSON.stringify(response));
    }
  } catch (err) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: `Parse error: ${err.message}`,
      },
    }));
  } finally {
    pendingRequests--;
    checkExit();
  }
});

rl.on('close', () => {
  closing = true;
  checkExit();
});
