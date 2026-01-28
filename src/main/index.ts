/**
 * CLI Bridge Addon - Main Process Entry Point
 *
 * This addon extends Local's capabilities:
 * - GraphQL mutations for deleteSite, wpCli (for local-cli)
 * - MCP Server for AI tool integration (Claude Code, ChatGPT, etc.)
 */

import * as LocalMain from '@getflywheel/local/main';
import { ipcMain } from 'electron';
import gql from 'graphql-tag';
import { McpServer } from './mcp/McpServer';
import { MCP_SERVER } from '../common/constants';
import { LocalServices } from '../common/types';

const ADDON_NAME = 'MCP Server';

let mcpServer: McpServer | null = null;

/**
 * GraphQL type definitions for CLI Bridge
 */
const typeDefs = gql`
  input DeleteSiteInput {
    "The site ID to delete"
    id: ID!
    "Whether to move site files to trash (true) or just remove from Local (false)"
    trashFiles: Boolean = true
    "Whether to update the hosts file"
    updateHosts: Boolean = true
  }

  type DeleteSiteResult {
    "Whether the deletion was successful"
    success: Boolean!
    "Error message if deletion failed"
    error: String
    "The ID of the deleted site"
    siteId: ID
  }

  input WpCliInput {
    "The site ID to run WP-CLI against"
    siteId: ID!
    "WP-CLI command and arguments (e.g., ['plugin', 'list', '--format=json'])"
    args: [String!]!
    "Skip loading plugins (default: true)"
    skipPlugins: Boolean = true
    "Skip loading themes (default: true)"
    skipThemes: Boolean = true
  }

  type WpCliResult {
    "Whether the command executed successfully"
    success: Boolean!
    "Command output (stdout)"
    output: String
    "Error message if command failed"
    error: String
  }

  input CreateSiteInput {
    "Site name (required)"
    name: String!
    "PHP version (e.g., '8.2.10'). Uses Local default if not specified."
    phpVersion: String
    "Web server type"
    webServer: String
    "Database type"
    database: String
    "WordPress admin username (default: admin)"
    wpAdminUsername: String
    "WordPress admin password (default: password)"
    wpAdminPassword: String
    "WordPress admin email (default: admin@local.test)"
    wpAdminEmail: String
  }

  type CreateSiteResult {
    "Whether site creation was initiated successfully"
    success: Boolean!
    "Error message if creation failed"
    error: String
    "The created site ID"
    siteId: ID
    "The site name"
    siteName: String
    "The site domain"
    siteDomain: String
  }

  input OpenSiteInput {
    "The site ID to open"
    siteId: ID!
    "Path to open (default: /, use /wp-admin for admin)"
    path: String = "/"
  }

  type OpenSiteResult {
    "Whether the site was opened successfully"
    success: Boolean!
    "Error message if failed"
    error: String
    "The URL that was opened"
    url: String
  }

  input CloneSiteInput {
    "The site ID to clone"
    siteId: ID!
    "Name for the cloned site"
    newName: String!
  }

  type CloneSiteResult {
    "Whether cloning was successful"
    success: Boolean!
    "Error message if failed"
    error: String
    "The new site ID"
    newSiteId: ID
    "The new site name"
    newSiteName: String
    "The new site domain"
    newSiteDomain: String
  }

  input ExportSiteInput {
    "The site ID to export"
    siteId: ID!
    "Output directory path (default: ~/Downloads)"
    outputPath: String
  }

  type ExportSiteResult {
    "Whether export was successful"
    success: Boolean!
    "Error message if failed"
    error: String
    "Path to the exported zip file"
    exportPath: String
  }

  type Blueprint {
    "Blueprint name"
    name: String!
    "Last modified date"
    lastModified: String
    "PHP version"
    phpVersion: String
    "Web server type"
    webServer: String
    "Database type"
    database: String
  }

  type BlueprintsResult {
    "Whether query was successful"
    success: Boolean!
    "Error message if failed"
    error: String
    "List of blueprints"
    blueprints: [Blueprint!]
  }

  input SaveBlueprintInput {
    "The site ID to save as blueprint"
    siteId: ID!
    "Name for the blueprint"
    name: String!
  }

  type SaveBlueprintResult {
    "Whether save was successful"
    success: Boolean!
    "Error message if failed"
    error: String
    "The blueprint name"
    blueprintName: String
  }

  extend type Mutation {
    "Create a new WordPress site with full WordPress installation"
    createSite(input: CreateSiteInput!): CreateSiteResult!

    "Delete a site from Local"
    deleteSite(input: DeleteSiteInput!): DeleteSiteResult!

    "Delete multiple sites from Local"
    deleteSites(ids: [ID!]!, trashFiles: Boolean = true): DeleteSiteResult!

    "Run a WP-CLI command against a site"
    wpCli(input: WpCliInput!): WpCliResult!

    "Open a site in the default browser"
    openSite(input: OpenSiteInput!): OpenSiteResult!

    "Clone an existing site"
    cloneSite(input: CloneSiteInput!): CloneSiteResult!

    "Export a site to a zip file"
    exportSite(input: ExportSiteInput!): ExportSiteResult!

    "Save a site as a blueprint"
    saveBlueprint(input: SaveBlueprintInput!): SaveBlueprintResult!
  }

  extend type Query {
    "Run a WP-CLI command against a site (read-only operations)"
    wpCliQuery(input: WpCliInput!): WpCliResult!

    "List all available blueprints"
    blueprints: BlueprintsResult!
  }
`;

/**
 * Create GraphQL resolvers that use Local's internal services
 */
function createResolvers(services: any) {
  const {
    deleteSite: deleteSiteService,
    siteData,
    localLogger,
    wpCli,
    siteProcessManager,
    addSite: addSiteService,
    cloneSite: cloneSiteService,
    exportSite: exportSiteService,
    blueprints: blueprintsService,
    browserManager,
  } = services;

  // Shared WP-CLI execution logic
  const executeWpCli = async (
    _parent: any,
    args: { input: { siteId: string; args: string[]; skipPlugins?: boolean; skipThemes?: boolean } }
  ) => {
    const { siteId, args: wpArgs, skipPlugins = true, skipThemes = true } = args.input;

    try {
      localLogger.info(`[${ADDON_NAME}] Running WP-CLI: wp ${wpArgs.join(' ')}`);

      const site = siteData.getSite(siteId);
      if (!site) {
        return {
          success: false,
          output: null,
          error: `Site not found: ${siteId}`,
        };
      }

      const status = await siteProcessManager.getSiteStatus(site);
      if (status !== 'running') {
        return {
          success: false,
          output: null,
          error: `Site "${site.name}" is not running. Start it first with: local-cli start ${site.name}`,
        };
      }

      const output = await wpCli.run(site, wpArgs, {
        skipPlugins,
        skipThemes,
        ignoreErrors: false,
      });

      localLogger.info(`[${ADDON_NAME}] WP-CLI completed successfully`);

      return {
        success: true,
        output: output?.trim() || '',
        error: null,
      };
    } catch (error: any) {
      localLogger.error(`[${ADDON_NAME}] WP-CLI failed:`, error);
      return {
        success: false,
        output: null,
        error: error.message || 'Unknown error',
      };
    }
  };

  return {
    Query: {
      wpCliQuery: executeWpCli,

      blueprints: async () => {
        try {
          localLogger.info(`[${ADDON_NAME}] Fetching blueprints`);

          const blueprintsList = await blueprintsService.getBlueprints();

          return {
            success: true,
            error: null,
            blueprints: blueprintsList.map((bp: any) => ({
              name: bp.name,
              lastModified: bp.lastModified,
              // Handle nested objects - extract just the name/type string
              phpVersion:
                typeof bp.phpVersion === 'object'
                  ? bp.phpVersion?.name || bp.phpVersion?.version
                  : bp.phpVersion,
              webServer:
                typeof bp.webServer === 'object'
                  ? bp.webServer?.name || bp.webServer?.type
                  : bp.webServer,
              database:
                typeof bp.database === 'object'
                  ? bp.database?.name || bp.database?.type
                  : bp.database,
            })),
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to fetch blueprints:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            blueprints: [],
          };
        }
      },
    },
    Mutation: {
      wpCli: executeWpCli,

      createSite: async (
        _parent: any,
        args: {
          input: {
            name: string;
            phpVersion?: string;
            webServer?: string;
            database?: string;
            wpAdminUsername?: string;
            wpAdminPassword?: string;
            wpAdminEmail?: string;
          };
        }
      ) => {
        const {
          name,
          phpVersion,
          webServer = 'nginx',
          database = 'mysql',
          wpAdminUsername = 'admin',
          wpAdminPassword = 'password',
          wpAdminEmail = 'admin@local.test',
        } = args.input;

        try {
          localLogger.info(`[${ADDON_NAME}] Creating site: ${name}`);

          // Generate slug and domain from name
          const siteSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const siteDomain = `${siteSlug}.local`;

          // Use os.homedir() for the path
          const os = require('os');
          const path = require('path');
          const sitePath = path.join(os.homedir(), 'Local Sites', siteSlug);

          const newSiteInfo: any = {
            siteName: name,
            siteDomain: siteDomain,
            sitePath: sitePath,
            webServer: webServer,
            database: database,
          };

          if (phpVersion) {
            newSiteInfo.phpVersion = phpVersion;
          }

          const wpCredentials = {
            adminUsername: wpAdminUsername,
            adminPassword: wpAdminPassword,
            adminEmail: wpAdminEmail,
          };

          const site = await addSiteService.addSite({
            newSiteInfo,
            wpCredentials,
            goToSite: false,
          });

          localLogger.info(`[${ADDON_NAME}] Successfully created site: ${name} (${site.id})`);

          return {
            success: true,
            error: null,
            siteId: site.id,
            siteName: name,
            siteDomain: siteDomain,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to create site:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            siteId: null,
            siteName: name,
            siteDomain: null,
          };
        }
      },

      deleteSite: async (
        _parent: any,
        args: { input: { id: string; trashFiles?: boolean; updateHosts?: boolean } }
      ) => {
        const { id, trashFiles = true, updateHosts = true } = args.input;

        try {
          localLogger.info(`[${ADDON_NAME}] Deleting site: ${id}`);

          const site = siteData.getSite(id);
          if (!site) {
            return {
              success: false,
              error: `Site not found: ${id}`,
              siteId: id,
            };
          }

          await deleteSiteService.deleteSite({
            site,
            trashFiles,
            updateHosts,
          });

          localLogger.info(`[${ADDON_NAME}] Successfully deleted site: ${site.name}`);

          return {
            success: true,
            error: null,
            siteId: id,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to delete site:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            siteId: id,
          };
        }
      },

      deleteSites: async (_parent: any, args: { ids: string[]; trashFiles?: boolean }) => {
        const { ids, trashFiles = true } = args;

        try {
          localLogger.info(`[${ADDON_NAME}] Deleting ${ids.length} sites`);

          await deleteSiteService.deleteSites({
            siteIds: ids,
            trashFiles,
            updateHosts: true,
          });

          localLogger.info(`[${ADDON_NAME}] Successfully deleted ${ids.length} sites`);

          return {
            success: true,
            error: null,
            siteId: ids.join(','),
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to delete sites:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            siteId: ids.join(','),
          };
        }
      },

      openSite: async (_parent: any, args: { input: { siteId: string; path?: string } }) => {
        const { siteId, path = '/' } = args.input;

        try {
          const site = siteData.getSite(siteId);
          if (!site) {
            return {
              success: false,
              error: `Site not found: ${siteId}`,
              url: null,
            };
          }

          const protocol = site.isStarred ? 'https' : 'http';
          const url = `${protocol}://${site.domain}${path}`;

          localLogger.info(`[${ADDON_NAME}] Opening site in browser: ${url}`);

          if (browserManager) {
            await browserManager.openInBrowser(url);
          } else {
            // Fallback to shell.openExternal
            const { shell } = require('electron');
            await shell.openExternal(url);
          }

          return {
            success: true,
            error: null,
            url,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to open site:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            url: null,
          };
        }
      },

      cloneSite: async (_parent: any, args: { input: { siteId: string; newName: string } }) => {
        const { siteId, newName } = args.input;

        try {
          const site = siteData.getSite(siteId);
          if (!site) {
            return {
              success: false,
              error: `Site not found: ${siteId}`,
              newSiteId: null,
              newSiteName: null,
              newSiteDomain: null,
            };
          }

          localLogger.info(`[${ADDON_NAME}] Cloning site ${site.name} to ${newName}`);

          const newSite = await cloneSiteService.cloneSite({
            site,
            newSiteName: newName,
          });

          localLogger.info(
            `[${ADDON_NAME}] Successfully cloned site: ${newSite.name} (${newSite.id})`
          );

          return {
            success: true,
            error: null,
            newSiteId: newSite.id,
            newSiteName: newSite.name,
            newSiteDomain: newSite.domain,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to clone site:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            newSiteId: null,
            newSiteName: null,
            newSiteDomain: null,
          };
        }
      },

      exportSite: async (
        _parent: any,
        args: { input: { siteId: string; outputPath?: string } }
      ) => {
        const { siteId, outputPath } = args.input;
        const os = require('os');
        const path = require('path');

        try {
          const site = siteData.getSite(siteId);
          if (!site) {
            return {
              success: false,
              error: `Site not found: ${siteId}`,
              exportPath: null,
            };
          }

          // Default to Downloads folder
          const outputDir = outputPath || path.join(os.homedir(), 'Downloads');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const fileName = `${site.name}-${timestamp}.zip`;
          const fullPath = path.join(outputDir, fileName);

          localLogger.info(`[${ADDON_NAME}] Exporting site ${site.name} to ${fullPath}`);

          await exportSiteService.exportSite({
            site,
            outputPath: fullPath,
            filter: '',
          });

          localLogger.info(`[${ADDON_NAME}] Successfully exported site to: ${fullPath}`);

          return {
            success: true,
            error: null,
            exportPath: fullPath,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to export site:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            exportPath: null,
          };
        }
      },

      saveBlueprint: async (_parent: any, args: { input: { siteId: string; name: string } }) => {
        const { siteId, name } = args.input;

        try {
          const site = siteData.getSite(siteId);
          if (!site) {
            return {
              success: false,
              error: `Site not found: ${siteId}`,
              blueprintName: null,
            };
          }

          localLogger.info(`[${ADDON_NAME}] Saving site ${site.name} as blueprint: ${name}`);

          await blueprintsService.saveBlueprint({
            name,
            siteId,
            filter: '',
          });

          localLogger.info(`[${ADDON_NAME}] Successfully saved blueprint: ${name}`);

          return {
            success: true,
            error: null,
            blueprintName: name,
          };
        } catch (error: any) {
          localLogger.error(`[${ADDON_NAME}] Failed to save blueprint:`, error);
          return {
            success: false,
            error: error.message || 'Unknown error',
            blueprintName: null,
          };
        }
      },
    },
  };
}

/**
 * Start the MCP server
 */
async function startMcpServer(services: LocalServices, logger: any): Promise<void> {
  if (mcpServer) {
    logger.warn(`[${ADDON_NAME}] MCP server already running`);
    return;
  }

  try {
    mcpServer = new McpServer({ port: MCP_SERVER.DEFAULT_PORT }, services, logger);

    await mcpServer.start();

    const info = mcpServer.getConnectionInfo();
    logger.info(`[${ADDON_NAME}] MCP server started on port ${info.port}`);
    logger.info(
      `[${ADDON_NAME}] MCP connection info saved to: ~/Library/Application Support/Local/mcp-connection-info.json`
    );
    logger.info(`[${ADDON_NAME}] Available tools: ${info.tools.join(', ')}`);
  } catch (error: any) {
    logger.error(`[${ADDON_NAME}] Failed to start MCP server:`, error);
  }
}

/**
 * Stop the MCP server
 */
async function stopMcpServer(logger: any): Promise<void> {
  if (mcpServer) {
    await mcpServer.stop();
    mcpServer = null;
    logger.info(`[${ADDON_NAME}] MCP server stopped`);
  }
}

/**
 * Register IPC handlers for renderer communication
 */
function registerIpcHandlers(services: LocalServices, logger: any): void {
  // Get MCP server status
  ipcMain.handle('mcp:getStatus', async () => {
    if (!mcpServer) {
      return { running: false, port: 0, uptime: 0 };
    }
    return mcpServer.getStatus();
  });

  // Get connection info
  ipcMain.handle('mcp:getConnectionInfo', async () => {
    if (!mcpServer) {
      return null;
    }
    return mcpServer.getConnectionInfo();
  });

  // Start MCP server
  ipcMain.handle('mcp:start', async () => {
    try {
      await startMcpServer(services, logger);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Stop MCP server
  ipcMain.handle('mcp:stop', async () => {
    try {
      await stopMcpServer(logger);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Restart MCP server
  ipcMain.handle('mcp:restart', async () => {
    try {
      await stopMcpServer(logger);
      await startMcpServer(services, logger);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Regenerate auth token
  ipcMain.handle('mcp:regenerateToken', async () => {
    if (!mcpServer) {
      return { success: false, error: 'MCP server not running' };
    }
    try {
      const newToken = await mcpServer.regenerateToken();
      return { success: true, token: newToken };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  logger.info(
    `[${ADDON_NAME}] Registered IPC handlers: mcp:getStatus, mcp:getConnectionInfo, mcp:start, mcp:stop, mcp:restart, mcp:regenerateToken`
  );
}

/**
 * Main addon initialization function
 */
export default function (_context: LocalMain.AddonMainContext): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger, graphql } = services;

  try {
    localLogger.info(`[${ADDON_NAME}] Initializing...`);

    // Register GraphQL extensions (for local-cli and MCP)
    const resolvers = createResolvers(services);
    graphql.registerGraphQLService('mcp-server', typeDefs, resolvers);
    localLogger.info(
      `[${ADDON_NAME}] Registered GraphQL: createSite, deleteSite, wpCli, openSite, cloneSite, exportSite, blueprints, saveBlueprint`
    );

    // Start MCP server (for AI tools)
    const localServices: LocalServices = {
      siteData: services.siteData,
      siteProcessManager: services.siteProcessManager,
      wpCli: services.wpCli,
      deleteSite: services.deleteSite,
      addSite: services.addSite,
      localLogger: services.localLogger,
    };

    startMcpServer(localServices, localLogger);

    // Register IPC handlers for renderer
    registerIpcHandlers(localServices, localLogger);

    localLogger.info(`[${ADDON_NAME}] Successfully initialized`);
  } catch (error: any) {
    localLogger.error(`[${ADDON_NAME}] Failed to initialize:`, error);
  }
}
