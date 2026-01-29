# Phase 11: WP Engine Connect/Sync

**Status:** In Development
**Branch:** `feature/phase-11-wpe-connect`
**Last Updated:** 2026-01-29

---

## Overview

Phase 11 adds WP Engine hosting integration to the MCP server, enabling AI tools to:
- Authenticate with WP Engine accounts
- List remote sites from WP Engine
- Link local sites to remote WP Engine environments
- Push and pull changes using Magic Sync

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider support | WPE only | Simplifies implementation; Flywheel can be added later |
| Sync progress tool | Yes (`get_sync_progress`) | Essential for monitoring long-running operations |
| Database sync default | `false` | Safer default; tool will prompt user to confirm |
| Push confirmation | Required (`confirm=true`) | Prevents accidental overwrites of production |

---

## Architecture

### Core Services Used

| Service | Purpose | Location |
|---------|---------|----------|
| `WpeOAuthService` | OAuth 2.0 + PKCE authentication | `app/main/wpeOAuth/` |
| `CAPIService` | WP Engine Content API for remote sites | `app/main/capi/` |
| `MagicSyncService` | Intelligent sync with mtime comparison | `app/main/magicSync/` |
| `PushService` | Push local → remote | `app/main/push/` |
| `PullService` | Pull remote → local | `app/main/pull/` |

### Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  MCP Tool   │────▶│ WpeOAuthSvc  │────▶│   WPE API   │
│ wpe_auth    │     │ (PKCE Flow)  │     │  (OAuth)    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Token Store  │
                    │ (Keychain)   │
                    └──────────────┘
```

### Sync Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  MCP Tool   │────▶│ MagicSyncSvc │────▶│   rsync     │
│ push_to_wpe │     │ (Manifest)   │     │ (files)     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  MySQL dump  │
                    │ (if inclSql) │
                    └──────────────┘
```

---

## Phase 11a: Authentication & Discovery

### Tools

#### `wpe_status`
Check WP Engine authentication status.

**Input:** None

**Output:**
```json
{
  "authenticated": true,
  "email": "user@example.com",
  "accountId": "abc123",
  "tokenExpiry": "2026-01-30T12:00:00Z"
}
```

#### `wpe_authenticate`
Trigger OAuth authentication flow with WP Engine.

**Input:** None (opens browser for OAuth)

**Output:**
```json
{
  "success": true,
  "email": "user@example.com",
  "message": "Successfully authenticated with WP Engine"
}
```

**Notes:**
- Opens system browser for OAuth consent
- Uses PKCE for security
- Token stored in system keychain

#### `wpe_logout`
Clear WP Engine authentication.

**Input:** None

**Output:**
```json
{
  "success": true,
  "message": "Logged out from WP Engine"
}
```

#### `list_wpe_sites`
List all sites from WP Engine account.

**Input:**
```json
{
  "accountId": "optional-filter"
}
```

**Output:**
```json
{
  "sites": [
    {
      "id": "install-123",
      "name": "mysite",
      "environment": "production",
      "phpVersion": "8.2",
      "primaryDomain": "mysite.wpengine.com",
      "accountId": "abc123",
      "accountName": "My Account"
    }
  ],
  "count": 1
}
```

---

## Phase 11b: Site Linking (Simplified)

**Status:** ✅ Completed

**Note:** WP Engine site connections are created implicitly when pulling a site from WPE using Connect in Local. There is no explicit "link" UI or API in Local. Phase 11b focuses on exposing existing connection data.

### Tools

#### Enhanced `list_sites`

The existing `list_sites` tool now includes WPE connection info for each site:

**Output:**
```json
{
  "sites": [
    {
      "id": "abc123",
      "name": "my-local-site",
      "status": "running",
      "domain": "my-local-site.local",
      "wpeConnection": {
        "remoteSiteId": "4120c932-...",
        "environment": "production",
        "canPushPull": true
      }
    }
  ],
  "count": 1
}
```

**Notes:**
- `wpeConnection` is `null` if site has no WPE link
- `canPushPull: true` indicates the site can Push/Pull with WP Engine
- For full details (install name, portal URL, capabilities), use `get_wpe_link`

#### `get_wpe_link`
Get detailed WP Engine connection information for a local site.

**Input:**
```json
{
  "site": "my-local-site"
}
```

**Output (linked):**
```json
{
  "linked": true,
  "siteName": "my-local-site",
  "connections": [
    {
      "remoteInstallId": "4120c932-...",
      "installName": "mysite",
      "environment": "production",
      "accountId": "abc123",
      "portalUrl": "https://my.wpengine.com/installs/mysite",
      "primaryDomain": "mysite.wpengine.com"
    }
  ],
  "connectionCount": 1,
  "capabilities": {
    "canPush": true,
    "canPull": true,
    "syncModes": ["all_files", "select_files", "database_only"],
    "magicSyncAvailable": true,
    "databaseSyncAvailable": true
  }
}
```

**Output (not linked):**
```json
{
  "linked": false,
  "siteName": "my-local-site",
  "message": "Site is not linked to any WP Engine environment. Use Connect in Local to pull a site from WPE."
}
```

---

## Phase 11c: Sync Operations

### Tools

#### `preview_push`
Preview what would be pushed without making changes.

**Input:**
```json
{
  "localSiteId": "abc123",
  "remoteInstallId": "install-456",
  "syncMode": "magic",
  "includeSql": false
}
```

**Output:**
```json
{
  "filesChanged": 42,
  "filesAdded": 5,
  "filesDeleted": 2,
  "totalSize": "15.2 MB",
  "databaseIncluded": false,
  "estimatedTime": "2-3 minutes"
}
```

#### `push_to_wpe`
Push local changes to WP Engine.

**Input:**
```json
{
  "localSiteId": "abc123",
  "remoteInstallId": "install-456",
  "syncMode": "magic",
  "includeSql": false,
  "confirm": true
}
```

**syncMode options:**
- `magic` (default): Smart sync using mtime comparison, only changed files
- `full`: Full rsync of all files
- `files`: Only sync files, skip plugins/themes

**Output:**
```json
{
  "success": true,
  "syncId": "sync-789",
  "message": "Push started. Use get_sync_progress to monitor.",
  "filesQueued": 42
}
```

**Notes:**
- Requires `confirm: true` to prevent accidents
- Returns immediately; sync runs in background
- Use `get_sync_progress` to monitor

#### `pull_from_wpe`
Pull changes from WP Engine to local.

**Input:**
```json
{
  "localSiteId": "abc123",
  "remoteInstallId": "install-456",
  "syncMode": "magic",
  "includeSql": false
}
```

**Output:**
```json
{
  "success": true,
  "syncId": "sync-790",
  "message": "Pull started. Use get_sync_progress to monitor."
}
```

#### `get_sync_progress`
Get progress of an ongoing sync operation.

**Input:**
```json
{
  "syncId": "sync-789"
}
```

**Output:**
```json
{
  "syncId": "sync-789",
  "status": "in_progress",
  "progress": 65,
  "filesCompleted": 27,
  "filesTotal": 42,
  "currentFile": "wp-content/uploads/2026/01/image.jpg",
  "bytesTransferred": "9.8 MB",
  "estimatedRemaining": "45 seconds"
}
```

**Status values:**
- `queued`: Waiting to start
- `in_progress`: Currently syncing
- `completed`: Successfully finished
- `failed`: Error occurred
- `cancelled`: User cancelled

#### `get_sync_history`
Get recent sync operations for a site.

**Input:**
```json
{
  "localSiteId": "abc123",
  "limit": 10
}
```

**Output:**
```json
{
  "history": [
    {
      "syncId": "sync-789",
      "type": "push",
      "remoteInstall": "mysite",
      "environment": "production",
      "status": "completed",
      "filesTransferred": 42,
      "startedAt": "2026-01-28T10:30:00Z",
      "completedAt": "2026-01-28T10:32:15Z"
    }
  ]
}
```

---

## Implementation Plan

### Phase 11a: Authentication & Discovery ✅
**Tools: 4 (wpe_status, wpe_authenticate, wpe_logout, list_wpe_sites)**

1. ✅ Add GraphQL types for WPE auth status
2. ✅ Add GraphQL mutations for authenticate/logout
3. ✅ Add GraphQL query for remote sites
4. ✅ Implement stdio transport handlers
5. ✅ Test OAuth flow end-to-end

### Phase 11b: Site Linking (Simplified) ✅
**Tools: 2 (enhanced list_sites, get_wpe_link)**

1. ✅ Enhanced list_sites to include wpeConnection info
2. ✅ Added get_wpe_link tool for detailed connection info
3. ⏭️ Skipped link/unlink tools (connections created via Pull in Local UI)

### Phase 11c: Sync Operations
**Planned: 5 tools**

1. Add GraphQL types for sync status/progress
2. Add GraphQL mutations for push/pull
3. Add GraphQL queries for progress/history
4. Implement background sync tracking
5. Implement stdio transport handlers
6. Test full sync flow

---

## Error Handling

| Error | Response |
|-------|----------|
| Not authenticated | `{ error: "Not authenticated with WP Engine. Use wpe_authenticate first." }` |
| Site not linked | `{ error: "Site not linked to WP Engine. Use link_to_wpe first." }` |
| Remote site not found | `{ error: "Remote install 'xyz' not found. Use list_wpe_sites to see available installs." }` |
| Sync in progress | `{ error: "Sync already in progress. Use get_sync_progress to monitor." }` |
| Push without confirm | `{ error: "Push requires confirm=true to prevent accidental overwrites." }` |
| Token expired | `{ error: "WP Engine session expired. Use wpe_authenticate to re-authenticate." }` |

---

## Security Considerations

1. **OAuth Tokens**: Stored in system keychain, not in plain text files
2. **Push Confirmation**: Required `confirm=true` prevents accidental production changes
3. **Database Sync**: Defaults to `false` to prevent accidental data loss
4. **Localhost Only**: MCP server only accepts connections from localhost
5. **Token Validation**: All WPE operations validate token before proceeding

---

## Future Enhancements

- Flywheel hosting support
- Selective file/folder sync
- Scheduled syncs
- Conflict resolution UI
- Multi-environment comparison

---

## Changelog

### 2026-01-29
- Initial design document created
- Defined 12 tools across 3 sub-phases
- Established design decisions (WPE-only, confirm required, includeSql default false)
- Implemented Phase 11a: 4 WPE authentication/discovery tools
- Fixed API mismatch (isAuthenticated → getAccessToken, logout → clearTokens)
- Simplified Phase 11b: removed link/unlink tools (connections created via Pull UI)
- Implemented Phase 11b: enhanced list_sites + get_wpe_link tool
