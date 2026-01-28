/**
 * wp_cli Tool
 * Run WP-CLI commands against a site
 */

import { McpToolDefinition, McpToolResult, LocalServices } from '../../../common/types';
import { findSite } from './helpers';

export const wpCliDefinition: McpToolDefinition = {
  name: 'wp_cli',
  description: 'Run a WP-CLI command against a WordPress site. The site must be running.',
  inputSchema: {
    type: 'object',
    properties: {
      site: {
        type: 'string',
        description: 'Site name or ID (partial names work)',
      },
      command: {
        type: 'array',
        items: { type: 'string' },
        description: 'WP-CLI command and arguments as array, e.g. ["plugin", "list", "--format=json"]',
      },
    },
    required: ['site', 'command'],
  },
};

interface WpCliArgs {
  site: string;
  command: string[];
}

export async function wpCli(
  args: Record<string, unknown>,
  services: LocalServices
): Promise<McpToolResult> {
  const { site: siteQuery, command } = args as unknown as WpCliArgs;

  if (!siteQuery) {
    return {
      content: [{ type: 'text', text: 'Error: site parameter is required' }],
      isError: true,
    };
  }

  if (!command || !Array.isArray(command) || command.length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: command parameter is required and must be a non-empty array' }],
      isError: true,
    };
  }

  try {
    const site = findSite(siteQuery, services.siteData);

    if (!site) {
      const allSites = services.siteData.getSites();
      const siteNames = allSites.map((s: any) => s.name).join(', ');
      return {
        content: [{
          type: 'text',
          text: `Site not found: "${siteQuery}". Available sites: ${siteNames || 'none'}`,
        }],
        isError: true,
      };
    }

    const currentStatus = await services.siteProcessManager.getSiteStatus(site);

    if (currentStatus !== 'running') {
      return {
        content: [{
          type: 'text',
          text: `Site "${site.name}" is not running. Start it first with the start_site tool.`,
        }],
        isError: true,
      };
    }

    const output = await services.wpCli.run(site, command, {
      skipPlugins: true,
      skipThemes: true,
      ignoreErrors: false,
    });

    return {
      content: [{ type: 'text', text: output?.trim() || '(no output)' }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `WP-CLI error: ${error.message}` }],
      isError: true,
    };
  }
}
