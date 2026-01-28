/**
 * CLI Bridge Addon - Renderer Entry Point
 * Adds MCP Server preferences panel to Local
 */

import React, { useState, useEffect } from 'react';

// MCP Preferences Panel Component
const McpPreferencesPanel: React.FC<{ electron: any }> = ({ electron }) => {
  const [status, setStatus] = useState<{
    running: boolean;
    port: number;
    uptime: number;
    error?: string;
  } | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{
    url: string;
    authToken: string;
    port: number;
    version: string;
    tools: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch MCP status
  const fetchStatus = async () => {
    try {
      const result = await electron?.ipcRenderer?.invoke('mcp:getStatus');
      if (result) {
        setStatus(result);
      }
    } catch (error) {
      console.error('Failed to fetch MCP status:', error);
    }
  };

  // Fetch connection info
  const fetchConnectionInfo = async () => {
    try {
      const result = await electron?.ipcRenderer?.invoke('mcp:getConnectionInfo');
      if (result) {
        setConnectionInfo(result);
      }
    } catch (error) {
      console.error('Failed to fetch connection info:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchConnectionInfo()]);
      setLoading(false);
    };
    init();

    // Refresh status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [electron]);

  const handleCopyConfig = () => {
    if (connectionInfo) {
      const config = {
        mcpServers: {
          local: {
            url: `${connectionInfo.url}/mcp/sse`,
            transport: 'sse',
            headers: {
              Authorization: `Bearer ${connectionInfo.authToken}`,
            },
          },
        },
      };
      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${connectionInfo?.port}/health`);
      const data = await response.json();
      if (data.status === 'ok') {
        alert('Connection successful! MCP server is healthy.');
      } else {
        alert('Connection failed: Server returned unexpected response');
      }
    } catch (error: any) {
      alert(`Connection failed: ${error.message}`);
    }
  };

  const getStatusColor = () => {
    if (!status) return '#666';
    if (status.running) return '#28a745';
    return '#dc3545';
  };

  const getStatusText = () => {
    if (loading) return 'Loading...';
    if (!status) return 'Unknown';
    if (status.running) return 'Running';
    return 'Stopped';
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        MCP Server
      </h2>

      <p style={{ color: '#666', marginBottom: '24px' }}>
        The MCP (Model Context Protocol) server enables AI tools like Claude Code to control your Local sites.
      </p>

      {/* Status Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Server Status
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px'
        }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
          }} />
          <span style={{ fontWeight: 500 }}>{getStatusText()}</span>
          {status?.running && (
            <>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#666' }}>Port: {status.port}</span>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#666' }}>Uptime: {formatUptime(status.uptime)}</span>
            </>
          )}
        </div>
      </div>

      {/* Connection Info Section */}
      {connectionInfo && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            Connection Info
          </h3>
          <div style={{
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>URL:</strong> {connectionInfo.url}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>SSE Endpoint:</strong> {connectionInfo.url}/mcp/sse
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Version:</strong> {connectionInfo.version}
            </div>
            <div>
              <strong>Tools:</strong> {connectionInfo.tools.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopyConfig}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {copied ? 'Copied!' : 'Copy Config for Claude Code'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={!status?.running}
            style={{
              padding: '8px 16px',
              backgroundColor: status?.running ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: status?.running ? 'pointer' : 'not-allowed',
              fontSize: '13px',
            }}
          >
            Test Connection
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div style={{
        padding: '16px',
        backgroundColor: '#e7f3ff',
        borderRadius: '6px',
        border: '1px solid #b3d9ff',
      }}>
        <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px' }}>
          Getting Started
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#333' }}>
          <li>Click "Copy Config for Claude Code" above</li>
          <li>Add the config to your Claude Code MCP settings</li>
          <li>Start using natural language to control your Local sites!</li>
        </ol>
      </div>
    </div>
  );
};

// Export as a constructor function that Local can instantiate
module.exports = function CliBridgeRenderer(context: any) {
  const { hooks, electron } = context;

  console.log('[CLI Bridge] Renderer loading...');

  // Add MCP Server to preferences menu
  hooks.addFilter('preferencesMenuItems', (menuItems: any[]) => {
    console.log('[CLI Bridge] Adding MCP Server to preferences');

    menuItems.push({
      path: 'mcp-server',
      displayName: 'MCP Server',
      sections: () => <McpPreferencesPanel electron={electron} />,
      onApply: () => {
        // No apply action needed for read-only display
      },
    });

    return menuItems;
  });

  console.log('[CLI Bridge] Renderer setup complete');
};
