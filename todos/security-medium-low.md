# Security Medium and Low Priority Issues

## MEDIUM-1: Provider Validation

**File:** `bin/mcp-stdio.js`
**Locations:** All backup handlers

### Problem
Provider parameter is validated but error messages could leak valid provider names.

### Current
```javascript
if (!['dropbox', 'googleDrive'].includes(args.provider)) {
  return error(`Invalid provider: ${args.provider}`);
}
```

### Recommended
```javascript
if (!['dropbox', 'googleDrive'].includes(args.provider)) {
  return error('Invalid provider. Use list_backups to see available options.');
}
```

### Priority
MEDIUM - Minor information disclosure

---

## MEDIUM-2: Snapshot ID Format Validation

**File:** `bin/mcp-stdio.js`
**Locations:** `restore_backup`, `delete_backup`, `download_backup`

### Problem
Snapshot IDs are passed directly to Restic without format validation.

### Recommended Fix
Validate snapshot ID format (alphanumeric, reasonable length):
```javascript
if (!/^[a-f0-9]{8,64}$/i.test(args.snapshot_id)) {
  return error('Invalid snapshot ID format');
}
```

### Priority
MEDIUM - Prevents potential injection into Restic commands

---

## MEDIUM-3: Path Traversal in SQL Import

**File:** `bin/mcp-stdio.js`
**Location:** `import_database` handler

### Problem
The `sqlPath` parameter is used directly without validating it doesn't contain path traversal sequences.

### Recommended Fix
```javascript
const path = require('path');
const resolvedPath = path.resolve(args.sqlPath);
if (!fs.existsSync(resolvedPath) || !resolvedPath.endsWith('.sql')) {
  return error('Invalid SQL file path');
}
```

### Priority
MEDIUM - File exists check helps but explicit validation is better

---

## LOW-1: Rate Limiting

**Files:** Both transports

### Problem
No rate limiting on MCP requests. An AI agent in a loop could overwhelm Local.

### Recommended
Add basic rate limiting (e.g., 100 requests/minute per tool category).

### Priority
LOW - Unlikely in practice, localhost-only mitigates risk

---

## LOW-2: Audit Logging

**Files:** Both transports

### Problem
Destructive operations (delete_site, restore_backup, push_to_wpe) are not logged beyond Local's standard logging.

### Recommended
Add explicit audit log entries for destructive operations:
```javascript
services.localLogger?.info('[MCP-AUDIT] delete_site called', {
  site: site.name,
  timestamp: new Date().toISOString()
});
```

### Priority
LOW - Nice to have for forensics

---

## LOW-3: Token Rotation

**File:** `src/main/index.ts`

### Problem
Auth token is generated once at startup and never rotates.

### Recommended
Rotate token periodically (e.g., every 24 hours) or on user request.

### Priority
LOW - Localhost-only, token is per-session

---

## Status
- [ ] MEDIUM-1: Improve provider error messages
- [ ] MEDIUM-2: Add snapshot ID format validation
- [ ] MEDIUM-3: Add path traversal protection for SQL import
- [ ] LOW-1: Consider rate limiting (future)
- [ ] LOW-2: Add audit logging for destructive ops (future)
- [ ] LOW-3: Consider token rotation (future)
