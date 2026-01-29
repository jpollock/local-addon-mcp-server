# Architecture: Transport Parity Issue

## Problem
Phase 10 (Backup) and Phase 11 (WPE Connect) tools are only registered in:
- `bin/mcp-stdio.js` (stdio transport)
- `src/main/index.ts` (GraphQL/SSE transport)

However, the SSE transport tool registration in `index.ts` only includes Phase 1-9 tools. The Phase 10/11 tools are in GraphQL but NOT in the MCP tool list for SSE.

## Impact
- Claude Code using SSE transport cannot access backup or WPE Connect tools
- Only stdio transport users have full tool access
- This creates an inconsistent experience

## Files Affected
- `src/main/index.ts` - SSE transport MCP tool definitions (lines ~150-400)

## Fix Required
Add Phase 10 and Phase 11 tool definitions to the `tools` array in `index.ts` that serves the SSE transport.

### Phase 10 Tools to Add
1. `backup_status`
2. `list_backups`
3. `create_backup`
4. `restore_backup`
5. `delete_backup`
6. `download_backup`
7. `edit_backup_note`

### Phase 11 Tools to Add
1. `wpe_status`
2. `wpe_authenticate`
3. `wpe_logout`
4. `list_wpe_sites`
5. `get_wpe_link`
6. `push_to_wpe`
7. `pull_from_wpe`
8. `get_sync_history`
9. `get_site_changes`

## Priority
MEDIUM - Affects SSE transport users but stdio works correctly

## Status
- [ ] Add Phase 10 tool definitions to SSE transport
- [ ] Add Phase 11 tool definitions to SSE transport
- [ ] Add corresponding handlers in handleToolCall
