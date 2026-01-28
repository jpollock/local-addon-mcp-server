/**
 * MCP Server Addon - Renderer Entry Point
 * Adds MCP Server preferences panel to Local
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getThemeColors, onThemeChange, ThemeColors } from '../common/theme';

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
  const [colors, setColors] = useState<ThemeColors>(getThemeColors());

  // Fetch MCP status
  const fetchStatus = useCallback(async () => {
    try {
      const result = await electron?.ipcRenderer?.invoke('mcp:getStatus');
      if (result) {
        setStatus(result);
      }
    } catch (error) {
      console.error('Failed to fetch MCP status:', error);
    }
  }, [electron]);

  // Fetch connection info
  const fetchConnectionInfo = useCallback(async () => {
    try {
      const result = await electron?.ipcRenderer?.invoke('mcp:getConnectionInfo');
      if (result) {
        setConnectionInfo(result);
      }
    } catch (error) {
      console.error('Failed to fetch connection info:', error);
    }
  }, [electron]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchConnectionInfo()]);
      setLoading(false);
    };
    init();

    // Refresh status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    // Subscribe to theme changes
    const cleanup = onThemeChange(() => {
      setColors(getThemeColors());
    });

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [electron, fetchStatus, fetchConnectionInfo]);

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
    if (
      !confirm(
        'Regenerate authentication token? You will need to update your AI tool configuration.'
      )
    ) {
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
    if (!status) return colors.textMuted;
    if (status.running) return colors.successText;
    return colors.errorText;
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

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? colors.primary : colors.textSecondary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 400,
  });

  const buttonStyle = (bgColor: string, disabled?: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    backgroundColor: bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ padding: '20px', color: colors.textPrimary }}>
      <h2
        style={{
          marginBottom: '20px',
          fontSize: '18px',
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        MCP Server
      </h2>

      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        The MCP (Model Context Protocol) server enables AI tools like Claude Code to control your
        Local sites.
      </p>

      {/* Tab Navigation */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: '24px' }}>
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
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
              Server Status
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: colors.panelBgSecondary,
                borderRadius: '6px',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(),
                }}
              />
              <span style={{ fontWeight: 500, color: colors.textPrimary }}>{getStatusText()}</span>
              {status?.running && (
                <>
                  <span style={{ color: colors.textSecondary }}>|</span>
                  <span style={{ color: colors.textSecondary }}>Port: {status.port}</span>
                  <span style={{ color: colors.textSecondary }}>|</span>
                  <span style={{ color: colors.textSecondary }}>
                    Uptime: {formatUptime(status.uptime)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Server Controls */}
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
              Server Controls
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartStop}
                disabled={actionInProgress}
                style={buttonStyle(
                  status?.running ? colors.errorText : colors.successText,
                  actionInProgress
                )}
              >
                {status?.running ? 'Stop Server' : 'Start Server'}
              </button>
              <button
                onClick={handleRestart}
                disabled={actionInProgress || !status?.running}
                style={buttonStyle('#6c757d', actionInProgress || !status?.running)}
              >
                Restart Server
              </button>
              <button
                onClick={handleTestConnection}
                disabled={!status?.running}
                style={buttonStyle(
                  status?.running ? '#17a2b8' : colors.textMuted,
                  !status?.running
                )}
              >
                Test Connection
              </button>
            </div>
          </div>

          {/* Connection Info Section */}
          {connectionInfo && (
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: colors.textPrimary,
                }}
              >
                Connection Info
              </h3>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: colors.panelBgSecondary,
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: colors.textPrimary,
                }}
              >
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
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
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
                  cursor: actionInProgress || !status?.running ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: actionInProgress || !status?.running ? 0.5 : 1,
                }}
              >
                Regenerate Token
              </button>
            </div>
            <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
              Regenerating the token will require you to update your AI tool configuration.
            </p>
          </div>
        </>
      )}

      {activeTab === 'setup' && (
        <>
          {/* Claude Code Setup */}
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
              Claude Code (Recommended)
            </h3>
            <div
              style={{
                padding: '16px',
                backgroundColor: colors.panelBgSecondary,
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textPrimary }}>
                Add the following to your{' '}
                <code
                  style={{
                    backgroundColor: colors.panelBgCode,
                    padding: '2px 4px',
                    borderRadius: '3px',
                    color: '#f8f8f2',
                  }}
                >
                  ~/.claude.json
                </code>{' '}
                file:
              </p>
              <pre
                style={{
                  backgroundColor: colors.panelBgCode,
                  color: '#f8f8f2',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                  margin: '0 0 12px 0',
                }}
              >
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
              <button onClick={handleCopyStdioConfig} style={buttonStyle(colors.primary)}>
                {copied ? 'Copied!' : 'Copy Config'}
              </button>
            </div>
          </div>

          {/* Claude.ai / ChatGPT Setup */}
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
              Claude.ai / ChatGPT / Other AI Tools
            </h3>
            <div
              style={{
                padding: '16px',
                backgroundColor: colors.panelBgSecondary,
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textPrimary }}>
                For tools that support SSE transport, use this configuration:
              </p>
              <pre
                style={{
                  backgroundColor: colors.panelBgCode,
                  color: '#f8f8f2',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                  margin: '0 0 12px 0',
                }}
              >
                {connectionInfo
                  ? `{
  "mcpServers": {
    "local": {
      "url": "${connectionInfo.url}/mcp/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer ${connectionInfo.authToken.substring(0, 20)}..."
      }
    }
  }
}`
                  : 'Server not running'}
              </pre>
              <button
                onClick={handleCopySseConfig}
                disabled={!connectionInfo}
                style={buttonStyle(
                  connectionInfo ? colors.primary : colors.textMuted,
                  !connectionInfo
                )}
              >
                {copied ? 'Copied!' : 'Copy SSE Config'}
              </button>
            </div>
          </div>

          {/* Available Commands */}
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: colors.textPrimary,
              }}
            >
              Example Commands
            </h3>
            <div
              style={{
                padding: '16px',
                backgroundColor: colors.infoBg,
                borderRadius: '6px',
                border: `1px solid ${colors.infoBorder}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.infoText,
                }}
              >
                Try saying to your AI assistant:
              </p>
              <ul
                style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: colors.infoText }}
              >
                <li>&quot;List my Local sites&quot;</li>
                <li>&quot;Start the blog site&quot;</li>
                <li>&quot;Create a new site called test-project&quot;</li>
                <li>&quot;Run wp plugin list on my-site&quot;</li>
                <li>&quot;Stop all running sites&quot;</li>
                <li>&quot;What plugins are installed on my-site?&quot;</li>
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
