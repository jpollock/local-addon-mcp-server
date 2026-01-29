/**
 * MCP Server Types
 */

export interface McpConnectionInfo {
  url: string;
  authToken: string;
  port: number;
  version: string;
  tools: string[];
}

export interface McpServerConfig {
  port: number;
  authToken?: string;
}

export interface McpServerStatus {
  running: boolean;
  port: number;
  uptime: number;
  error?: string;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface LocalServices {
  siteData: {
    getSites(): any[];
    getSite(id: string): any | undefined;
    updateSite?(siteID: string, site: Partial<{ name: string; xdebugEnabled: boolean }>): void;
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
      newSiteInfo: {
        siteName: string;
        siteDomain: string;
        sitePath?: string;
        multiSite?: 'no' | 'ms-subdir' | 'ms-subdomain';
        phpVersion?: string;
        webServer?: 'nginx' | 'apache';
        database?: 'mysql' | 'mariadb';
      };
      wpCredentials?: {
        adminUsername?: string;
        adminPassword?: string;
        adminEmail?: string;
      };
      goToSite?: boolean;
    }): Promise<any>;
  };
  localLogger: {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  };
  // Optional services for extended functionality
  browserManager?: {
    openURL(url: string): Promise<void>;
  };
  cloneSite?: (site: any, newName: string) => Promise<any>;
  exportSite?: (site: any, outputPath: string) => Promise<void>;
  blueprints?: {
    getBlueprints(): Promise<any[]>;
    saveBlueprint(site: any, options: { name: string; description?: string }): Promise<any>;
  };
  // Phase 8 services
  adminer?: {
    open(site: any): Promise<void>;
  };
  x509Cert?: {
    trustCert(site: any): Promise<void>;
  };
  siteProvisioner?: {
    swapService(
      site: any,
      role: string,
      serviceName: string,
      serviceBinVersion: string,
      restartRouter?: boolean
    ): Promise<void>;
  };
  importSite?: {
    run(settings: { importType?: string; zipPath: string; siteName: string }): Promise<any>;
  };
  // Phase 9 services
  lightningServices?: {
    getRegisteredServices(role?: string): Record<string, Record<string, any>>;
    getServices(role?: string): Promise<Record<string, Record<string, any>>>;
  };
  // Phase 11: WP Engine Connect services
  wpeOAuth?: {
    isAuthenticated(): Promise<boolean>;
    authenticate(): Promise<{ email?: string } | null>;
    logout(): Promise<void>;
    getCredentials(): Promise<{
      email?: string;
      accountId?: string;
      accountName?: string;
      expiresAt?: number;
    } | null>;
  };
  capi?: {
    getInstalls(accountId?: string): Promise<any[]>;
    getAccounts(): Promise<any[]>;
  };
}
