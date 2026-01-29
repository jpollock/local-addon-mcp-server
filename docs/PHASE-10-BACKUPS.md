# Phase 10: Backup & Restore

**Status:** Complete
**Branch:** `feature/phase-10-backups`
**Last Updated:** 2026-01-29

---

## Overview

Phase 10 adds cloud backup integration to the MCP server, enabling AI tools to:
- Create backups of local sites to Dropbox or Google Drive
- List available backups for a site
- Restore sites from cloud backups
- Download backups as ZIP files

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cloud providers | Dropbox + Google Drive | These are the only providers supported by Local's backup system |
| Feature flag check | Required | Backups are feature-flagged in Local; tool must gracefully handle disabled state |
| Restore confirmation | Required (`confirm=true`) | Prevents accidental data loss |
| Delete confirmation | Required (`confirm=true`) | Prevents accidental backup deletion |

---

## Architecture

### Core Services Used

| Service | Purpose | Location |
|---------|---------|----------|
| `BackupService` | All backup operations | `app/main/backup/` |
| `DropboxService` | Dropbox OAuth & storage | `app/main/cloudStorage/` |
| `GoogleDriveService` | Google Drive OAuth & storage | `app/main/cloudStorage/` |
| `featureFlags` | Check if backups enabled | `app/main/featureFlags/` |

### Backup Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCP Tool                                 │
│                     (create_backup)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BackupService                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ createBackup│    │ listBackups │    │restoreBackup│         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                   │                │
│         └─────────────────┬┴──────────────────┘                │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │                       Restic                              │  │
│  │  - Snapshot-based backups                                 │  │
│  │  - Deduplication                                          │  │
│  │  - Encryption (password: 'localwp')                       │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │                       Rclone                              │  │
│  │  - Cloud storage abstraction                              │  │
│  │  - Dropbox / Google Drive                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Cloud Provider Integration

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  MCP Tool   │────▶│ CloudService │────▶│  OAuth API  │
│ backup_status│     │ (Dropbox/GD) │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Token Store  │
                    │ (Encrypted)  │
                    └──────────────┘
```

---

## Phase 10a: Status & Discovery

### Tools

#### `backup_status`
Check if cloud backup is available and authenticated.

**Input:** None

**Output (available):**
```json
{
  "available": true,
  "featureEnabled": true,
  "providers": {
    "dropbox": {
      "authenticated": true,
      "accountId": "dbid:abc123",
      "email": "user@example.com"
    },
    "googleDrive": {
      "authenticated": false,
      "accountId": null,
      "email": null
    }
  }
}
```

**Output (unavailable):**
```json
{
  "available": false,
  "featureEnabled": false,
  "message": "Cloud Backups feature is not enabled in Local"
}
```

#### `list_backups`
List all backups for a site.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox"
}
```

**Output:**
```json
{
  "siteName": "my-local-site",
  "provider": "dropbox",
  "backups": [
    {
      "snapshotId": "abc123def456",
      "timestamp": "2026-01-28T10:30:00Z",
      "note": "Before major update",
      "siteDomain": "my-local-site.local",
      "services": {
        "php": "8.2.10",
        "mysql": "8.0.16"
      }
    }
  ],
  "count": 1
}
```

**Notes:**
- Returns empty array if site has no backups
- Returns error if provider not authenticated

---

## Phase 10b: Backup Operations

### Tools

#### `create_backup`
Create a new backup of a site to cloud storage.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox",
  "note": "Before updating plugins"
}
```

**Output:**
```json
{
  "success": true,
  "snapshotId": "abc123def456",
  "timestamp": "2026-01-29T14:30:00Z",
  "message": "Backup created successfully",
  "provider": "dropbox"
}
```

**Notes:**
- Site must be running (database dump required)
- Progress shown in Local UI
- Operation is asynchronous; returns when complete

#### `restore_backup`
Restore a site from a cloud backup.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox",
  "snapshotId": "abc123def456",
  "confirm": true
}
```

**Output:**
```json
{
  "success": true,
  "message": "Site restored from backup",
  "restoredFrom": {
    "snapshotId": "abc123def456",
    "timestamp": "2026-01-28T10:30:00Z"
  }
}
```

**Notes:**
- Requires `confirm: true` to prevent accidents
- Overwrites current site files and database
- Preserves `conf/` and `logs/` directories

#### `delete_backup`
Delete a backup from cloud storage.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox",
  "snapshotId": "abc123def456",
  "confirm": true
}
```

**Output:**
```json
{
  "success": true,
  "message": "Backup deleted",
  "deletedSnapshotId": "abc123def456"
}
```

#### `download_backup`
Download a backup as a ZIP file.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox",
  "snapshotId": "abc123def456"
}
```

**Output:**
```json
{
  "success": true,
  "filePath": "/Users/user/Downloads/my-local-site-backup-2026-01-28.zip",
  "message": "Backup downloaded to Downloads folder"
}
```

#### `edit_backup_note`
Update the description/note for a backup.

**Input:**
```json
{
  "site": "my-local-site",
  "provider": "dropbox",
  "snapshotId": "abc123def456",
  "note": "Updated description"
}
```

**Output:**
```json
{
  "success": true,
  "snapshotId": "abc123def456",
  "note": "Updated description"
}
```

---

## Implementation Plan

### Phase 10a: Status & Discovery
**Tools: 2 (backup_status, list_backups)**

1. Add LocalServices interfaces for BackupService
2. Add feature flag check utility
3. Implement backup_status tool
4. Implement list_backups tool
5. Add to both SSE and stdio transports

### Phase 10b: Backup Operations
**Tools: 4 (create_backup, restore_backup, delete_backup, download_backup, edit_backup_note)**

1. Implement create_backup tool
2. Implement restore_backup tool with confirmation
3. Implement delete_backup tool with confirmation
4. Implement download_backup tool
5. Implement edit_backup_note tool
6. Add to both SSE and stdio transports

---

## Error Handling

| Error | Response |
|-------|----------|
| Feature disabled | `{ error: "Cloud Backups feature is not enabled in Local. Enable it in Local settings." }` |
| Provider not authenticated | `{ error: "Not authenticated with Dropbox. Authenticate in Local's Cloud Backups settings." }` |
| Site not found | `{ error: "Site 'xyz' not found. Use list_sites to see available sites." }` |
| Site not running | `{ error: "Site must be running to create a backup. Use start_site first." }` |
| Backup not found | `{ error: "Backup 'abc123' not found. Use list_backups to see available backups." }` |
| No restic repo | `{ error: "Site has no backup repository. Create a backup first." }` |
| Restore without confirm | `{ error: "Restore requires confirm=true to prevent accidental data loss." }` |
| Delete without confirm | `{ error: "Delete requires confirm=true to prevent accidental deletion." }` |
| Cloud storage error | `{ error: "Cloud storage error: {details}. Check your internet connection." }` |

---

## Security Considerations

1. **OAuth Tokens**: Managed by Local's CloudStorage services, stored encrypted
2. **Restore Confirmation**: Required `confirm=true` prevents accidental data loss
3. **Delete Confirmation**: Required `confirm=true` prevents accidental deletion
4. **Localhost Only**: MCP server only accepts connections from localhost
5. **Feature Flag**: Operations only available when feature enabled in Local

---

## LocalServices Interface Additions

```typescript
// Add to LocalServices in src/common/types.ts
export interface LocalServices {
  // ... existing services

  // Phase 10: Backup services
  backup?: {
    createBackup(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
      note?: string;
    }): Promise<{ snapshotId: string; timestamp: string }>;

    listBackups(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
    }): Promise<Array<{
      snapshotId: string;
      timestamp: string;
      note?: string;
      siteDomain: string;
      services: Record<string, string>;
    }>>;

    restoreBackup(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
      snapshotId: string;
    }): Promise<void>;

    deleteBackup(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
      snapshotId: string;
    }): Promise<void>;

    downloadZip(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
      snapshotId: string;
    }): Promise<string>;  // Returns file path

    editBackupDescription(args: {
      site: any;
      provider: 'dropbox' | 'googleDrive';
      accountId: string;
      snapshotId: string;
      newDescription: string;
    }): Promise<void>;
  };

  dropbox?: {
    isAuthenticated(accountId?: string): Promise<boolean>;
    getAccount(accountId: string): Promise<{ id: string; email: string } | undefined>;
    getAccounts(): Promise<Array<{ id: string; email: string }>>;
  };

  googleDrive?: {
    isAuthenticated(accountId?: string): Promise<boolean>;
    getAccount(accountId: string): Promise<{ id: string; email: string } | undefined>;
    getAccounts(): Promise<Array<{ id: string; email: string }>>;
  };

  featureFlags?: {
    isFeatureEnabled(flag: string): boolean;
  };
}
```

---

## Tool Summary

| Tool | Phase | Description |
|------|-------|-------------|
| `backup_status` | 10a | Check if backups available & authenticated |
| `list_backups` | 10a | List all backups for a site |
| `create_backup` | 10b | Create new backup to cloud |
| `restore_backup` | 10b | Restore site from backup |
| `delete_backup` | 10b | Delete a backup |
| `download_backup` | 10b | Download backup as ZIP |
| `edit_backup_note` | 10b | Update backup description |

**Total: 7 tools**

---

## Future Enhancements

- Automatic backup scheduling via MCP
- Cross-site backup discovery (list all backed-up sites)
- Backup comparison (diff between snapshots)
- Selective restore (files only, database only)

---

## Changelog

### 2026-01-29
- Initial design document created
- Defined 7 tools across 2 sub-phases
- Documented BackupService integration requirements
- Established confirmation requirements for destructive operations
