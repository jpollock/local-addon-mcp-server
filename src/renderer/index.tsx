/**
 * MCP Server Addon - Renderer Entry Point
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
  const [actionInProgress, setActionInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'setup'>('status');

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

  const handleCopyStdioConfig = () => {
    const config = {
      mcpServers: {
        local: {
          type: 'stdio',
          command: 'node',
          args: ['/path/to/local-addon-mcp-server/bin/mcp-stdio.js'],
        },
      },
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySseConfig = () => {
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

  const handleStartStop = async () => {
    setActionInProgress(true);
    try {
      if (status?.running) {
        await electron?.ipcRenderer?.invoke('mcp:stop');
      } else {
        await electron?.ipcRenderer?.invoke('mcp:start');
      }
      await fetchStatus();
      await fetchConnectionInfo();
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRestart = async () => {
    setActionInProgress(true);
    try {
      await electron?.ipcRenderer?.invoke('mcp:restart');
      await fetchStatus();
      await fetchConnectionInfo();
    } catch (error: any) {
      alert(`Restart failed: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate authentication token? You will need to update your AI tool configuration.')) {
      return;
    }
    setActionInProgress(true);
    try {
      const result = await electron?.ipcRenderer?.invoke('mcp:regenerateToken');
      if (result?.success) {
        await fetchConnectionInfo();
        alert('Token regenerated successfully. Please update your AI tool configuration.');
      } else {
        alert(`Failed to regenerate token: ${result?.error}`);
      }
    } catch (error: any) {
      alert(`Failed to regenerate token: ${error.message}`);
    } finally {
      setActionInProgress(false);
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

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? '#007bff' : '#666',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        MCP Server
      </h2>

      <p style={{ color: '#666', marginBottom: '24px' }}>
        The MCP (Model Context Protocol) server enables AI tools like Claude Code to control your Local sites.
      </p>

      {/* Tab Navigation */}
      <div style={{ borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
        <button style={tabStyle(activeTab === 'status')} onClick={() => setActiveTab('status')}>
          Status & Controls
        </button>
        <button style={tabStyle(activeTab === 'setup')} onClick={() => setActiveTab('setup')}>
          AI Tool Setup
        </button>
      </div>

      {activeTab === 'status' && (
        <>
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

          {/* Server Controls */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Server Controls
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartStop}
                disabled={actionInProgress}
                style={{
                  padding: '8px 16px',
                  backgroundColor: status?.running ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: actionInProgress ? 'wait' : 'pointer',
                  fontSize: '13px',
                  opacity: actionInProgress ? 0.7 : 1,
                }}
              >
                {status?.running ? 'Stop Server' : 'Start Server'}
              </button>
              <button
                onClick={handleRestart}
                disabled={actionInProgress || !status?.running}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (actionInProgress || !status?.running) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: (actionInProgress || !status?.running) ? 0.5 : 1,
                }}
              >
                Restart Server
              </button>
              <button
                onClick={handleTestConnection}
                disabled={!status?.running}
                style={{
                  padding: '8px 16px',
                  backgroundColor: status?.running ? '#17a2b8' : '#ccc',
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
                  <strong>stdio script:</strong> bin/mcp-stdio.js
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

          {/* Security Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Security
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleRegenerateToken}
                disabled={actionInProgress || !status?.running}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (actionInProgress || !status?.running) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: (actionInProgress || !status?.running) ? 0.5 : 1,
                }}
              >
                Regenerate Token
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Regenerating the token will require you to update your AI tool configuration.
            </p>
          </div>
        </>
      )}

      {activeTab === 'setup' && (
        <>
          {/* Claude Code Setup */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Claude Code (Recommended)
            </h3>
            <div style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
                Add the following to your <code>~/.claude.json</code> file:
              </p>
              <pre style={{
                backgroundColor: '#2d2d2d',
                color: '#f8f8f2',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: '0 0 12px 0',
              }}>
{`{
  "mcpServers": {
    "local": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/local-addon-mcp-server/bin/mcp-stdio.js"]
    }
  }
}`}
              </pre>
              <button
                onClick={handleCopyStdioConfig}
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
                {copied ? 'Copied!' : 'Copy Config'}
              </button>
            </div>
          </div>

          {/* Claude.ai / ChatGPT Setup */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Claude.ai / ChatGPT / Other AI Tools
            </h3>
            <div style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
                For tools that support SSE transport, use this configuration:
              </p>
              <pre style={{
                backgroundColor: '#2d2d2d',
                color: '#f8f8f2',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: '0 0 12px 0',
              }}>
{connectionInfo ? `{
  "mcpServers": {
    "local": {
      "url": "${connectionInfo.url}/mcp/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer ${connectionInfo.authToken.substring(0, 20)}..."
      }
    }
  }
}` : 'Server not running'}
              </pre>
              <button
                onClick={handleCopySseConfig}
                disabled={!connectionInfo}
                style={{
                  padding: '8px 16px',
                  backgroundColor: connectionInfo ? '#007bff' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connectionInfo ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                }}
              >
                {copied ? 'Copied!' : 'Copy SSE Config'}
              </button>
            </div>
          </div>

          {/* Available Commands */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Example Commands
            </h3>
            <div style={{
              padding: '16px',
              backgroundColor: '#e7f3ff',
              borderRadius: '6px',
              border: '1px solid #b3d9ff',
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 500 }}>
                Try saying to your AI assistant:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#333' }}>
                <li>"List my Local sites"</li>
                <li>"Start the blog site"</li>
                <li>"Create a new site called test-project"</li>
                <li>"Run wp plugin list on my-site"</li>
                <li>"Stop all running sites"</li>
                <li>"What plugins are installed on my-site?"</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Export as a constructor function that Local can instantiate
module.exports = function McpServerRenderer(context: any) {
  const { hooks, electron } = context;

  console.log('[MCP Server] Renderer loading...');

  // Add MCP Server to preferences menu
  hooks.addFilter('preferencesMenuItems', (menuItems: any[]) => {
    console.log('[MCP Server] Adding MCP Server to preferences');

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

  console.log('[MCP Server] Renderer setup complete');
};
