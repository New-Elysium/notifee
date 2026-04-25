# Bun Workspace Symlinks + Metro Bundler: Root Cause & Solutions

## Summary

The example app fails to bundle with:

```
Unable to resolve module @babel/runtime/helpers/interopRequireDefault
from .../packages/react-native/example/index.js

could not be found within the project or in these directories:
  node_modules
  ../node_modules
  ../../node_modules
```

This is **not** a missing package. `@babel/runtime` is installed. The failure is architectural: Bun's content-addressable module store is invisible to Metro's internal file map.

---

## How Bun Installs Packages in a Workspace

When you run `bun install` in a monorepo, Bun does **not** copy packages into each workspace's `node_modules/` the way npm or yarn classic does. Instead it:

1. Extracts packages into a central content-addressable store at the **root** of the project:
   ```
   notifee/node_modules/.bun/@babel+runtime@7.28.6/node_modules/@babel/runtime/
   notifee/node_modules/.bun/react-native@0.84.1+.../node_modules/react-native/
   notifee/node_modules/.bun/...
   ```

2. Creates **symbolic links** in each workspace's `node_modules/` that point into that store:
   ```
   example/node_modules/@babel/runtime
     → ../../../../../node_modules/.bun/@babel+runtime@7.28.6/node_modules/@babel/runtime
   ```

This is Bun's design: fewer disk writes, deduplicated storage, fast installs. From the OS perspective the packages are accessible — `ls`, `require()`, and Node.js module resolution all work fine through the symlinks.

---

## How Metro Builds Its File Map

Metro does **not** use the OS filesystem directly when resolving modules. It first builds an internal file map (backed by `metro-file-map`'s `TreeFS`) by crawling all source roots. On macOS it uses the native `find` command:

```
find <roots> ( ( -type f <extensions> ) -o -type l )
```

The roots are `projectRoot` (`example/`) plus any entries in `watchFolders`.

### The crawl discovers files and symlinks, but not symlink *contents*

The `find` expression matches:
- **`-type f`** — regular files
- **`-type l`** — symbolic links (recorded as a symlink entry with flag `1`)

It does **not** recurse *through* a symlink to a directory. A symlink like:

```
example/node_modules/@babel/runtime  →  (symlink, type l)
```

is recorded as a symlink leaf, not a directory. The `find` command never descends into it to discover `helpers/interopRequireDefault.js`.

### Symlink target resolution at lookup time

When Metro later calls `lookup('example/node_modules/@babel/runtime')`, `TreeFS` calls `readlink` to get the raw target string, then computes the absolute target path:

```
/path/to/notifee/node_modules/.bun/@babel+runtime@7.28.6/node_modules/@babel/runtime
```

It then tries to find **that path** in the file map. For the lookup to return `{ type: "d" }` (directory), files inside that target directory must already be in the file map.

### Why `.bun/` contents are missing from the file map

When Metro crawls `notifee/` (added via `watchFolders`), the `find` command does traverse into `notifee/node_modules/.bun/` — it is a real directory, not a symlink, so `find` descends into it. Files like:

```
notifee/node_modules/.bun/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/interopRequireDefault.js
```

**should** be found as `-type f` hits.

However, Metro's `TreeFS` stores all paths **relative to `rootDir`** (which is `example/`). A file deep inside `.bun/` would be stored as:

```
../../../node_modules/.bun/@babel+runtime@7.28.6/node_modules/@babel/runtime/helpers/interopRequireDefault.js
```

When `#lookupByNormalPath` follows the symlink and tries to navigate a path containing multiple `../` hops that cross the `rootDir` boundary, the internal tree traversal either fails to find the node or returns `{ exists: false }`. This is a known edge case in Metro's `TreeFS` for cross-root symlinks.

### Why `react-native` (a direct import) appears to work

For non-scoped, non-subpath imports like `import { Platform } from 'react-native'`, the Metro resolver checks only whether `example/node_modules/` itself exists as a directory (which it does — it is a real directory). It then hands the candidate path `example/node_modules/react-native` to `resolvePackageEntryPoint`. That function also eventually calls `fileSystemLookup`, but by the time the error screen is rendered only the **first** failing module is shown. `@babel/runtime` is injected by Babel's transform at the very top of the transformed `index.js` — it is the first `require` Metro encounters, so its failure is what surfaces. If it were fixed in isolation, `react-native` would likely fail next for the same underlying reason.

---

## Reproduction

```
notifee/
├── node_modules/
│   └── .bun/                          ← Bun's content-addressable store
│       └── @babel+runtime@7.28.6/
│           └── node_modules/
│               └── @babel/runtime/    ← actual files live here
└── packages/
    └── react-native/
        └── example/
            └── node_modules/
                └── @babel/
                    └── runtime        → symlink → ../../../../.bun/@babel+runtime@7.28.6/...
```

Metro's `projectRoot` = `example/`. Metro crawls from there. The symlink is discovered but its target contents are not reachable through `TreeFS`'s cross-root path resolution.

---

## Solutions

### Option 1 — Use npm to install the example app's dependencies (Recommended for now)

Remove the example app from Bun's workspace and let npm manage it independently. npm installs packages as real directories, not `.bun/` symlinks.

```bash
# Remove example from root bun workspace temporarily
# Then in packages/react-native/example:
npm install --legacy-peer-deps
```

Or permanently remove `"packages/react-native/example"` from the `workspaces` array in the root `package.json` and let the example manage its own `node_modules` with npm.

**Pros:** Simple, proven to work, Metro has no symlink issues.  
**Cons:** Breaks unified Bun workspace management for the example.

---

### Option 2 — Use Bun with `--hoist` or symlink-free install mode

Bun supports installing packages as hard copies rather than `.bun/` symlinks when configured. Add to the root `bunfig.toml`:

```toml
[install]
linker = "copyfiles"
```

Or use the `isolated` linker which copies files directly into each workspace's `node_modules/`:

```toml
[install]
linker = "isolated"
```

> ⚠️ `copyfiles` and `isolated` modes may significantly increase disk usage and install time.

---

### Option 3 — Set Metro's `projectRoot` to the monorepo root

When `projectRoot` = `notifee/`, all paths in TreeFS are relative to `notifee/`. Symlink targets inside `notifee/node_modules/.bun/` resolve cleanly without any `../` cross-root traversal.

```js
// packages/react-native/example/metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../../..');

const config = {
  projectRoot: monorepoRoot,
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
  },
  server: {
    // Tell Metro where the app entry point is relative to the new projectRoot
    enhanceMiddleware: (middleware) => middleware,
  },
};

module.exports = mergeConfig(getDefaultConfig(monorepoRoot), config);
```

> ⚠️ Changing `projectRoot` affects how Metro discovers `babel.config.js`, the app entry point, and source map paths. Requires additional configuration and testing.

---

### Option 4 — Use a custom `resolveRequest` to bypass file map for node_modules

Provide a custom resolver that uses `require.resolve` (real OS filesystem) for packages that Metro's file map can't find:

```js
// packages/react-native/example/metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const config = {
  watchFolders: [path.resolve(__dirname, '../../..')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../../node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      try {
        return context.resolveRequest(context, moduleName, platform);
      } catch (e) {
        // Fall back to real filesystem resolution for packages
        // that Metro's file map can't traverse through Bun symlinks
        try {
          const resolved = require.resolve(moduleName, {
            paths: [path.resolve(__dirname, 'node_modules')],
          });
          return { filePath: fs.realpathSync(resolved), type: 'sourceFile' };
        } catch {
          throw e;
        }
      }
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

> ⚠️ The fallback `require.resolve` runs in the Metro server's Node.js process and bypasses Metro's hot-reload file watching for those modules. Changes to those files won't trigger fast refresh.

---

### Option 5 — Manually replace Bun symlinks with real directories for the example

After every `bun install`, run a script that dereferences the symlinks in `example/node_modules/`:

```bash
#!/bin/bash
# scripts/deref-example-symlinks.sh
EXAMPLE_MODS="packages/react-native/example/node_modules"

for link in "$EXAMPLE_MODS"/*; do
  if [ -L "$link" ]; then
    real=$(realpath "$link")
    rm "$link"
    cp -r "$real" "$link"
  fi
done

# Handle scoped packages (e.g. @babel/runtime)
for scope in "$EXAMPLE_MODS"/@*/; do
  for link in "$scope"/*; do
    if [ -L "$link" ]; then
      real=$(realpath "$link")
      rm "$link"
      cp -r "$real" "$link"
    fi
  done
done
```

Add to `packages/react-native/example/package.json`:

```json
{
  "scripts": {
    "postinstall": "bash ../../../scripts/deref-example-symlinks.sh"
  }
}
```

> ⚠️ Increases disk usage significantly. Symlinks are re-created on every `bun install`, requiring the script to run again.

---

### Option 6 — Wait for Metro to fix cross-root symlink resolution

This is a known limitation in Metro's `TreeFS` when `rootDir` is a subdirectory of the monorepo and symlink targets require `../` traversal beyond `rootDir`. A proper fix would be for Metro to correctly resolve and traverse these paths regardless of `rootDir` boundary crossings.

Track:
- https://github.com/facebook/metro/issues (search: "symlink bun monorepo")
- https://github.com/oven-sh/bun/issues (search: "metro symlink")

---

## Quick Reference

| Approach | Works Today | Disk Cost | Maintenance |
|---|---|---|---|
| npm install in example | ✅ Yes | Medium | Low |
| Bun `linker = "copyfiles"` | ✅ Yes | High | Low |
| Metro `projectRoot` = monorepo root | ⚠️ Needs config work | None | Medium |
| Custom `resolveRequest` fallback | ⚠️ Partial (no HMR for fallback mods) | None | Medium |
| Manual symlink deref script | ✅ Yes | High | High |
| Wait for Metro fix | ❌ Not yet | None | None |

---

## Affected Environment

| Component | Version |
|---|---|
| Bun | 1.3.10 |
| Metro | 0.83.5 |
| React Native | 0.84.1 |
| `@react-native/metro-config` | 0.84.1 |
| `metro-file-map` | 0.83.5 |
| `metro-resolver` | 0.83.5 |
| Node.js crawler | TreeFS + native `find` |
| Platform | macOS (darwin) |