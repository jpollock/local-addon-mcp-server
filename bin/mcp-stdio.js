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
    description: 'Create a new WordPress site in Local. The site will be created and started automatically. Optionally create from an existing blueprint.',
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
        blueprint: {
          type: 'string',
          description: 'Blueprint name to create the site from. Use list_blueprints to see available blueprints.',
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
  // Phase 8: WordPress Development Tools
  {
    name: 'export_database',
    description: 'Export a site database to a SQL file',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        output_path: {
          type: 'string',
          description: 'Output file path (default: ~/Downloads/<site-name>.sql)',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'import_database',
    description: 'Import a SQL file into a site database',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        sql_path: {
          type: 'string',
          description: 'Path to the SQL file to import',
        },
      },
      required: ['site', 'sql_path'],
    },
  },
  {
    name: 'open_adminer',
    description: 'Open Adminer database management UI for a site',
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
    name: 'trust_ssl',
    description: 'Trust the SSL certificate for a site (may require admin password)',
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
    name: 'rename_site',
    description: 'Rename a WordPress site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Current site name or ID',
        },
        new_name: {
          type: 'string',
          description: 'New name for the site',
        },
      },
      required: ['site', 'new_name'],
    },
  },
  {
    name: 'change_php_version',
    description: 'Change the PHP version for a site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        php_version: {
          type: 'string',
          description: 'Target PHP version (e.g., "8.2.10", "8.1.27")',
        },
      },
      required: ['site', 'php_version'],
    },
  },
  {
    name: 'import_site',
    description: 'Import a WordPress site from a zip file',
    inputSchema: {
      type: 'object',
      properties: {
        zip_path: {
          type: 'string',
          description: 'Path to the zip file to import',
        },
        site_name: {
          type: 'string',
          description: 'Name for the imported site (optional)',
        },
      },
      required: ['zip_path'],
    },
  },
  // Phase 9: Site Configuration & Dev Tools
  {
    name: 'toggle_xdebug',
    description: 'Enable or disable Xdebug for a site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        enabled: {
          type: 'boolean',
          description: 'True to enable, false to disable',
        },
      },
      required: ['site', 'enabled'],
    },
  },
  {
    name: 'get_site_logs',
    description: 'Get log file contents for a site',
    inputSchema: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'Site name or ID',
        },
        log_type: {
          type: 'string',
          enum: ['php', 'nginx', 'mysql', 'all'],
          description: 'Type of logs to retrieve (default: php)',
        },
        lines: {
          type: 'number',
          description: 'Number of lines to return (default: 100)',
        },
      },
      required: ['site'],
    },
  },
  {
    name: 'list_services',
    description: 'List available service versions (PHP, MySQL, Nginx)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['php', 'database', 'webserver', 'all'],
          description: 'Filter by service type (default: all)',
        },
      },
    },
  },
  // Phase 11: WP Engine Connect
  {
    name: 'wpe_status',
    description: 'Check WP Engine authentication status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'wpe_authenticate',
    description: 'Authenticate with WP Engine. Opens browser for OAuth login.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'wpe_logout',
    description: 'Logout from WP Engine and clear stored credentials',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_wpe_sites',
    description: 'List all sites from your WP Engine account. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: 'Filter by specific WP Engine account ID (optional)',
        },
      },
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

      if (args.blueprint) {
        input.blueprint = args.blueprint;
      }

      // Debug: log the input being sent
      console.error('[MCP stdio] create_site input:', JSON.stringify(input));
      console.error('[MCP stdio] args.blueprint value:', args.blueprint);

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

      const fromBlueprint = args.blueprint ? ` (from blueprint: ${args.blueprint})` : '';
      return {
        content: [{
          type: 'text',
          text: `Created site: ${result.siteName}${fromBlueprint}\nDomain: ${result.siteDomain}\nID: ${result.siteId}\nAdmin: admin / password\n\nThe site is being provisioned and will start automatically.`,
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

    // Phase 8: WordPress Development Tools
    case 'export_database': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ExportDatabaseInput!) {
          exportDatabase(input: $input) {
            success
            error
            outputPath
          }
        }
      `, {
        input: {
          siteId: site.id,
          outputPath: args.output_path || null,
        },
      });

      const result = data.exportDatabase;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to export database: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Exported database for ${site.name} to:\n${result.outputPath}`,
        }],
      };
    }

    case 'import_database': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      if (!args.sql_path) {
        return {
          content: [{ type: 'text', text: 'Error: sql_path is required' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ImportDatabaseInput!) {
          importDatabase(input: $input) {
            success
            error
          }
        }
      `, {
        input: {
          siteId: site.id,
          sqlPath: args.sql_path,
        },
      });

      const result = data.importDatabase;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to import database: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully imported database into ${site.name} from:\n${args.sql_path}`,
        }],
      };
    }

    case 'open_adminer': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: OpenAdminerInput!) {
          openAdminer(input: $input) {
            success
            error
          }
        }
      `, {
        input: {
          siteId: site.id,
        },
      });

      const result = data.openAdminer;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to open Adminer: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Opened Adminer for ${site.name}`,
        }],
      };
    }

    case 'trust_ssl': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: TrustSslInput!) {
          trustSsl(input: $input) {
            success
            error
          }
        }
      `, {
        input: {
          siteId: site.id,
        },
      });

      const result = data.trustSsl;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to trust SSL: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Trusted SSL certificate for ${site.name}`,
        }],
      };
    }

    case 'rename_site': {
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
        mutation($input: McpRenameSiteInput!) {
          mcpRenameSite(input: $input) {
            success
            error
            newName
          }
        }
      `, {
        input: {
          siteId: site.id,
          newName: args.new_name,
        },
      });

      const result = data.mcpRenameSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to rename site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Renamed ${site.name} to ${result.newName}`,
        }],
      };
    }

    case 'change_php_version': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      if (!args.php_version) {
        return {
          content: [{ type: 'text', text: 'Error: php_version is required' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ChangePhpVersionInput!) {
          changePhpVersion(input: $input) {
            success
            error
            phpVersion
          }
        }
      `, {
        input: {
          siteId: site.id,
          phpVersion: args.php_version,
        },
      });

      const result = data.changePhpVersion;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to change PHP version: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Changed PHP version for ${site.name} to ${result.phpVersion}`,
        }],
      };
    }

    case 'import_site': {
      if (!args.zip_path) {
        return {
          content: [{ type: 'text', text: 'Error: zip_path is required' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ImportSiteInput!) {
          importSite(input: $input) {
            success
            error
            siteId
            siteName
          }
        }
      `, {
        input: {
          zipPath: args.zip_path,
          siteName: args.site_name || null,
        },
      });

      const result = data.importSite;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to import site: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Imported site: ${result.siteName}\nSite ID: ${result.siteId}`,
        }],
      };
    }

    // Phase 9: Site Configuration & Dev Tools
    case 'toggle_xdebug': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      if (typeof args.enabled !== 'boolean') {
        return {
          content: [{ type: 'text', text: 'Error: enabled must be true or false' }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: ToggleXdebugInput!) {
          toggleXdebug(input: $input) {
            success
            error
            enabled
          }
        }
      `, {
        input: {
          siteId: site.id,
          enabled: args.enabled,
        },
      });

      const result = data.toggleXdebug;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to toggle Xdebug: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Xdebug ${result.enabled ? 'enabled' : 'disabled'} for ${site.name}`,
        }],
      };
    }

    case 'get_site_logs': {
      const site = await findSite(args.site);
      if (!site) {
        return {
          content: [{ type: 'text', text: `Site not found: ${args.site}` }],
          isError: true,
        };
      }

      const data = await graphqlRequest(`
        mutation($input: GetSiteLogsInput!) {
          getSiteLogs(input: $input) {
            success
            error
            logs {
              type
              content
              path
            }
          }
        }
      `, {
        input: {
          siteId: site.id,
          logType: args.log_type || 'php',
          lines: args.lines || 100,
        },
      });

      const result = data.getSiteLogs;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to get logs: ${result.error}` }],
          isError: true,
        };
      }

      let output = `Logs for ${site.name}:\n`;
      for (const log of result.logs) {
        output += `\n=== ${log.type.toUpperCase()} (${log.path}) ===\n${log.content}\n`;
      }

      return {
        content: [{ type: 'text', text: output }],
      };
    }

    case 'list_services': {
      const data = await graphqlRequest(`
        query($type: String) {
          listServices(type: $type) {
            success
            error
            services {
              role
              name
              version
            }
          }
        }
      `, {
        type: args.type || 'all',
      });

      const result = data.listServices;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to list services: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ services: result.services, count: result.services.length }, null, 2),
        }],
      };
    }

    // Phase 11: WP Engine Connect
    case 'wpe_status': {
      const data = await graphqlRequest(`
        query {
          wpeStatus {
            authenticated
            email
            accountId
            accountName
            tokenExpiry
            error
          }
        }
      `);

      const result = data.wpeStatus;
      if (result.error && !result.authenticated) {
        return {
          content: [{ type: 'text', text: `WP Engine status check failed: ${result.error}` }],
          isError: true,
        };
      }

      if (!result.authenticated) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              authenticated: false,
              message: 'Not authenticated with WP Engine. Use wpe_authenticate to login.',
            }, null, 2),
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            authenticated: true,
            email: result.email,
            accountId: result.accountId,
            accountName: result.accountName,
            tokenExpiry: result.tokenExpiry,
          }, null, 2),
        }],
      };
    }

    case 'wpe_authenticate': {
      const data = await graphqlRequest(`
        mutation {
          wpeAuthenticate {
            success
            email
            message
            error
          }
        }
      `);

      const result = data.wpeAuthenticate;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `WP Engine authentication failed: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            email: result.email,
            message: result.message || 'Authentication initiated. Please complete the login in your browser.',
          }, null, 2),
        }],
      };
    }

    case 'wpe_logout': {
      const data = await graphqlRequest(`
        mutation {
          wpeLogout {
            success
            message
            error
          }
        }
      `);

      const result = data.wpeLogout;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `WP Engine logout failed: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: result.message || 'Logged out from WP Engine',
          }, null, 2),
        }],
      };
    }

    case 'list_wpe_sites': {
      const data = await graphqlRequest(`
        query($accountId: String) {
          listWpeSites(accountId: $accountId) {
            success
            error
            sites {
              id
              name
              environment
              phpVersion
              primaryDomain
              accountId
              accountName
              sftpHost
              sftpUser
            }
            count
          }
        }
      `, {
        accountId: args.account_id || null,
      });

      const result = data.listWpeSites;
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Failed to list WP Engine sites: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ sites: result.sites, count: result.count }, null, 2),
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
