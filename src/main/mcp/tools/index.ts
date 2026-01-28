/**
 * MCP Tools Registry
 * Central registry for all available MCP tools
 */

import { McpToolDefinition, McpToolResult, LocalServices } from '../../../common/types';
import { listSites, listSitesDefinition } from './listSites';
import { startSite, startSiteDefinition } from './startSite';
import { stopSite, stopSiteDefinition } from './stopSite';
import { restartSite, restartSiteDefinition } from './restartSite';
import { wpCli, wpCliDefinition } from './wpCli';

export type ToolHandler = (
  args: Record<string, unknown>,
  services: LocalServices
) => Promise<McpToolResult>;

interface ToolRegistration {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

const tools: Map<string, ToolRegistration> = new Map();

/**
 * Register all available tools
 */
export function registerTools(): void {
  tools.set('list_sites', { definition: listSitesDefinition, handler: listSites });
  tools.set('start_site', { definition: startSiteDefinition, handler: startSite });
  tools.set('stop_site', { definition: stopSiteDefinition, handler: stopSite });
  tools.set('restart_site', { definition: restartSiteDefinition, handler: restartSite });
  tools.set('wp_cli', { definition: wpCliDefinition, handler: wpCli });
}

/**
 * Get all tool definitions (for MCP tools/list response)
 */
export function getToolDefinitions(): McpToolDefinition[] {
  return Array.from(tools.values()).map((t) => t.definition);
}

/**
 * Get tool names
 */
export function getToolNames(): string[] {
  return Array.from(tools.keys());
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  services: LocalServices
): Promise<McpToolResult> {
  const tool = tools.get(name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args, services);
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Tool error: ${error.message}` }],
      isError: true,
    };
  }
}

/**
 * Check if a tool exists
 */
export function hasTool(name: string): boolean {
  return tools.has(name);
}
