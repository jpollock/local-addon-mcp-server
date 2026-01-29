# Code Duplication Reduction

## Overview
The code review identified significant duplication that could reduce LOC by ~30%.

## Issue 1: Backup Validation Pattern (5x duplication)

**File:** `bin/mcp-stdio.js`
**Lines:** ~1727-2040

The same ~30-line validation block is repeated in all 5 backup operations:
- `list_backups`
- `create_backup`
- `restore_backup`
- `delete_backup`
- `download_backup`

### Pattern
```javascript
// Check feature flag
if (!services.featureFlags?.isFeatureEnabled('localBackups')) { ... }

// Validate provider
if (!['dropbox', 'googleDrive'].includes(args.provider)) { ... }

// Check provider authentication
const providerService = args.provider === 'dropbox' ? services.dropbox : services.googleDrive;
if (!await providerService?.isAuthenticated()) { ... }

// Get account info
const accounts = await providerService.getAccounts();
// ... etc
```

### Fix
Extract to a helper function:
```javascript
async function validateBackupRequest(services, args, requireSite = true) {
  // All validation in one place
  // Returns { error } or { site, providerService, account }
}
```

---

## Issue 2: WPE Install Lookup (4x duplication)

**File:** `bin/mcp-stdio.js`
**Lines:** ~1600-1700

The same WPE install lookup logic is repeated in:
- `get_wpe_link`
- `push_to_wpe`
- `pull_from_wpe`
- `get_site_changes`

### Pattern
```javascript
const token = await services.wpeOAuth?.getAccessToken();
if (!token) { ... }

const installs = await services.capi?.getInstallList();
const link = site.wpeConnectData?.find(...);
const install = installs?.find(...);
```

### Fix
Extract to a helper function:
```javascript
async function getWpeInstallForSite(services, site) {
  // Returns { error } or { install, link, token }
}
```

---

## Issue 3: Site Not Found Pattern (30+ occurrences)

**File:** `bin/mcp-stdio.js`

The same error response for site not found:
```javascript
if (!site) {
  return {
    content: [{ type: 'text', text: JSON.stringify({
      error: `Site '${args.site}' not found`,
      hint: 'Use list_sites to see available sites'
    }) }],
    isError: true
  };
}
```

### Fix
Extract to a helper:
```javascript
function siteNotFoundError(siteName) {
  return {
    content: [{ type: 'text', text: JSON.stringify({
      error: `Site '${siteName}' not found`,
      hint: 'Use list_sites to see available sites'
    }) }],
    isError: true
  };
}
```

---

## Issue 4: Transport Code Duplication

**Files:** `bin/mcp-stdio.js` vs `src/main/index.ts`

The same tool definitions and handlers exist in both files with slight variations.

### Long-term Fix
Create a shared tools module that both transports import:
```
src/tools/
  definitions.ts    # Tool definitions
  handlers.ts       # Tool handlers
  helpers.ts        # Shared helpers
```

---

## Priority
LOW - Code works correctly, this is maintenance/readability improvement

## Status
- [ ] Extract validateBackupRequest helper
- [ ] Extract getWpeInstallForSite helper
- [ ] Extract siteNotFoundError helper
- [ ] Consider shared tools module (future)
