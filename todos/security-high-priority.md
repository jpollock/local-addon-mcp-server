# Security High Priority Issues

## HIGH-1: Missing confirmation on pull_from_wpe

**File:** `bin/mcp-stdio.js`
**Lines:** ~1950-2000

### Problem
The `pull_from_wpe` tool does not require a `confirm: true` parameter, but it's a destructive operation that overwrites local files and potentially the database.

### Risk
An AI agent could accidentally trigger a pull operation that overwrites local work without explicit user confirmation.

### Fix
Add `confirm` to the required parameters for `pull_from_wpe`:

```javascript
// In tool definition
required: ['site', 'confirm'],

// In handler
if (!args.confirm) {
  return {
    content: [{ type: 'text', text: JSON.stringify({
      error: 'Pull requires confirm=true to prevent accidental overwrites'
    }) }],
    isError: true
  };
}
```

### Priority
HIGH - Consistency with push_to_wpe and restore_backup patterns

---

## HIGH-2: WP-CLI Command Injection Risk

**File:** `bin/mcp-stdio.js`
**Lines:** ~670-720 (wp_cli handler)

### Problem
The `wp_cli` tool passes commands directly to WP-CLI without validating dangerous commands like `eval`, `shell`, `db query`, etc.

### Risk
An AI agent could be tricked into running arbitrary PHP code or shell commands via WP-CLI.

### Recommended Fix
Add a blocklist of dangerous WP-CLI commands:

```javascript
const BLOCKED_WP_COMMANDS = [
  'eval',
  'eval-file',
  'shell',
  'db query',
  'db cli',
  'config set',
];

// In wp_cli handler
const commandStr = args.command.join(' ').toLowerCase();
for (const blocked of BLOCKED_WP_COMMANDS) {
  if (commandStr.includes(blocked)) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        error: `Command '${blocked}' is blocked for security reasons`
      }) }],
      isError: true
    };
  }
}
```

### Priority
HIGH - Prevents command injection attacks

---

## Status
- [x] HIGH-1: Add confirm to pull_from_wpe (done: 2024-01-29)
- [x] HIGH-2: Implement WP-CLI command blocklist (done: 2024-01-29)
