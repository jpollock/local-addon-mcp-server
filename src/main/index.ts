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

const ADDON_NAME = 'CLI Bridge';

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

  extend type Mutation {
    "Delete a site from Local"
    deleteSite(input: DeleteSiteInput!): DeleteSiteResult!

    "Delete multiple sites from Local"
    deleteSites(ids: [ID!]!, trashFiles: Boolean = true): DeleteSiteResult!

    "Run a WP-CLI command against a site"
    wpCli(input: WpCliInput!): WpCliResult!
  }

  extend type Query {
    "Run a WP-CLI command against a site (read-only operations)"
    wpCliQuery(input: WpCliInput!): WpCliResult!
  }
`;

/**
 * Create GraphQL resolvers that use Local's internal services
 */
function createResolvers(services: any) {
  const { deleteSite: deleteSiteService, siteData, localLogger, wpCli, siteProcessManager } = services;

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
    },
    Mutation: {
      wpCli: executeWpCli,

      deleteSite: async (_parent: any, args: { input: { id: string; trashFiles?: boolean; updateHosts?: boolean } }) => {
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
    mcpServer = new McpServer(
      { port: MCP_SERVER.DEFAULT_PORT },
      services,
      logger
    );

    await mcpServer.start();

    const info = mcpServer.getConnectionInfo();
    logger.info(`[${ADDON_NAME}] MCP server started on port ${info.port}`);
    logger.info(`[${ADDON_NAME}] MCP connection info saved to: ~/Library/Application Support/Local/mcp-connection-info.json`);
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
function registerIpcHandlers(logger: any): void {
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

  logger.info(`[${ADDON_NAME}] Registered IPC handlers: mcp:getStatus, mcp:getConnectionInfo`);
}

/**
 * Main addon initialization function
 */
export default function (context: LocalMain.AddonMainContext): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger, graphql } = services;

  try {
    localLogger.info(`[${ADDON_NAME}] Initializing...`);

    // Register GraphQL extensions (for local-cli)
    const resolvers = createResolvers(services);
    graphql.registerGraphQLService('cli-bridge', typeDefs, resolvers);
    localLogger.info(`[${ADDON_NAME}] Registered GraphQL: deleteSite, deleteSites, wpCli, wpCliQuery`);

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
    registerIpcHandlers(localLogger);

    localLogger.info(`[${ADDON_NAME}] Successfully initialized`);
  } catch (error: any) {
    localLogger.error(`[${ADDON_NAME}] Failed to initialize:`, error);
  }
}
