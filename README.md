# CLI Bridge Addon for Local

This addon extends Local's GraphQL API with additional mutations that enable full CLI control of Local.

## Why This Addon?

Local's core GraphQL API doesn't expose all operations. Notably, `deleteSite` is only available via internal IPC. This addon bridges that gap by registering additional GraphQL mutations that wrap the internal services.

## Installation

### Development (symlink)

```bash
cd local-addon-cli-bridge
npm install
npm run build
ln -sf "$(pwd)" "$HOME/Library/Application Support/Local/addons/local-addon-cli-bridge"
```

Then restart Local.

### Production

Copy the built addon to Local's addons directory:
- macOS: `~/Library/Application Support/Local/addons/`
- Windows: `%APPDATA%\Local\addons\`
- Linux: `~/.config/Local/addons/`

## Added GraphQL Mutations

### deleteSite

Delete a single site from Local.

```graphql
mutation DeleteSite($input: DeleteSiteInput!) {
  deleteSite(input: $input) {
    success
    error
    siteId
  }
}

# Variables:
{
  "input": {
    "id": "site-id-here",
    "trashFiles": true,
    "updateHosts": true
  }
}
```

### deleteSites

Delete multiple sites at once.

```graphql
mutation DeleteSites($ids: [ID!]!, $trashFiles: Boolean) {
  deleteSites(ids: $ids, trashFiles: $trashFiles) {
    success
    error
    siteId
  }
}
```

## Usage with local-cli

Once this addon is installed and Local is restarted, you can use:

```bash
local-cli delete my-site           # Delete site and trash files
local-cli delete my-site --keep-files  # Remove from Local but keep files
```

## How It Works

The addon uses Local's service container to access the internal `deleteSite` service:

```typescript
const services = LocalMain.getServiceContainer().cradle;
const { deleteSite, graphql } = services;

// Register our GraphQL extension
graphql.registerGraphQLService('cli-bridge', typeDefs, resolvers);
```

The resolver then calls the internal service:

```typescript
await deleteSiteService.deleteSite({ site, trashFiles, updateHosts });
```
