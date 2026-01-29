# Performance Improvements

## Issue 1: N+1 Query Pattern in getWpeLink

**File:** `bin/mcp-stdio.js`
**Location:** `get_wpe_link` handler

### Problem
When looking up WPE install details, the code calls `getInstallList()` which returns all installs, then iterates to find the match. If multiple sites are queried, this results in repeated full-list fetches.

### Current Pattern
```javascript
const installs = await services.capi?.getInstallList();
const install = installs?.find(i => i.id === link.wpeInstallId);
```

### Recommended Fix
Use `getInstall(installId)` for single lookups:
```javascript
const install = await services.capi?.getInstall(link.wpeInstallId);
```

### Priority
LOW - Only affects WPE tools, impact is minimal for typical usage

---

## Issue 2: Missing CAPI Response Caching

**File:** `bin/mcp-stdio.js`
**Locations:** Multiple WPE handlers

### Problem
Repeated calls to CAPI endpoints (`getInstallList`, `getAccountList`) within the same session don't benefit from caching.

### Recommended Fix
Implement a simple TTL cache for CAPI responses:
```javascript
const capiCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedInstalls(services) {
  const cached = capiCache.get('installs');
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  const data = await services.capi?.getInstallList();
  capiCache.set('installs', { data, time: Date.now() });
  return data;
}
```

### Priority
LOW - Network calls are infrequent in typical usage

---

## Issue 3: Synchronous File Reading in getSiteLogs

**File:** `bin/mcp-stdio.js`
**Location:** `get_site_logs` handler

### Problem
Log files are read synchronously which could block the event loop for large files.

### Current Pattern
```javascript
const content = fs.readFileSync(logPath, 'utf-8');
```

### Recommended Fix
```javascript
const content = await fs.promises.readFile(logPath, 'utf-8');
```

### Priority
LOW - Log files are typically small, impact is minimal

---

## Issue 4: Fire-and-Forget Async Without Timeout

**File:** `bin/mcp-stdio.js`
**Locations:** `push_to_wpe`, `pull_from_wpe`, backup operations

### Problem
Long-running operations (push, pull, backup) are awaited without timeout handling. If the operation hangs, the MCP request hangs indefinitely.

### Recommended Fix
Add timeout wrapper:
```javascript
async function withTimeout(promise, ms, message) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Usage
await withTimeout(
  services.wpePush.push(args),
  300000, // 5 minutes
  'Push operation timed out'
);
```

### Priority
MEDIUM - Prevents indefinite hangs

---

## Status
- [ ] Use getInstall() for single lookups
- [ ] Add CAPI response caching (optional)
- [ ] Convert sync file reads to async
- [ ] Add timeout handling for long operations
