# Obsidian Progress Tracker Plugin - AI Agent Guide

## Architecture Overview

This Obsidian plugin calculates and displays task completion percentages across notes and linked notes. Core components:

- **[main.ts](../main.ts)**: Plugin entry point, handles Obsidian API integration, settings, and file modification events
- **[src/task-tree-builder.ts](../src/task-tree-builder.ts)**: Recursively parses markdown files, follows `[[wiki-links]]`, builds task trees
- **[src/task-tree.ts](../src/task-tree.ts)**: Pure computation layer for task completion (parent counts = sum of children)
- **[src/auto-parent.ts](../src/auto-parent.ts)**: Updates parent task checkboxes based on child completion state
- **[src/utils.ts](../src/utils.ts)**: Regex escaping utility

## Key Design Patterns

### Task Tree Recursion & Link Following
Tasks can link to other notes using `- [ ] [[SubPage]]`. The builder recursively includes linked page tasks:
```typescript
// From task-tree-builder.ts
const linkMatch = /\[\[([^\]]+)\]\]/.exec(text);
const pageName = rawLink.split('|')[0].trim(); // Handle [[Page|Alias]] syntax
```
**Cycle Detection**: File-level cycles append `❗` error icon and return zero counts.

### Parent Task Propagation
When `autoPropagateTaskStates` is enabled, parent tasks auto-update:
- Parent unchecks when ANY child unchecks
- Parent checks when ALL children (including linked pages) check
- Linked page tasks use `linkChildrenComplete` property (see [auto-parent.ts](../src/auto-parent.ts))

### Dual Rendering Modes
1. **Reading View**: `registerMarkdownPostProcessor` replaces `COMPLETE:[[Page]]` syntax
2. **Live Preview**: CodeMirror 6 extensions with `ViewPlugin` + `Decoration.replace` widgets

Both modes use `TaskTreeBuilder` to compute progress on-the-fly.

## Build & Test Workflow

```bash
npm run build      # TypeScript compile + esbuild bundle → main.js
npm test           # Jest tests with fixtures in tests/fixtures/
npm run dev        # Watch mode for development
```

**Production deployment**: Task "Build and copy artifacts (Personal)" copies `main.js`, `manifest.json`, `styles.css` to local vault for testing.

## Testing Conventions

Tests use file fixtures in [tests/fixtures/](../tests/fixtures/):
- Each test file is a standalone markdown scenario (e.g., `cyclic-self.md`, `alias-link.md`)
- Tests verify exact `{ total, completed }` counts and completion strings
- Mock `fs` operations reference `__dirname + '/fixtures/filename.md'`

Example test pattern:
```typescript
const tree = builder.buildFromFile(__dirname + '/fixtures/simple.md');
expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
```

## Critical File Paths

- **Vault root resolution**: Use `app.vault.adapter.getBasePath()` to resolve relative paths
- **Ignore tag checking**: Files tagged `#ignoretasktree` (configurable) are excluded from calculations
- **Link resolution**: Links resolve relative to current file's directory, `.md` auto-appended if missing

## CodeMirror Integration

Live preview uses CodeMirror 6 state fields (`editorLivePreviewField`) to access current file path:
```typescript
const field = view.state.field(editorLivePreviewField);
const sourcePath = (field as unknown as SourcePathField).sourcePath;
```
Widgets skip decoration when cursor is within match range to prevent edit conflicts.

## Common Pitfalls

- **Async file modification**: Set `this.skipModify = true` before `vault.modify()` to prevent recursion
- **Backlink propagation**: When file changes, recursively update all files linking to it via `findBacklinkSources()`
- **Cache invalidation**: Compare `pageTasksCache` by line numbers + completion states to avoid unnecessary updates
- **Test isolation**: `TaskTreeBuilder` must `cache.clear()` at root call to avoid state leaks between tests

## Public API

Other plugins call `getPageProgress(file)` to retrieve completion percentage:
```typescript
const tracker = this.app.plugins.getPlugin('obsidian-progress-tracker');
const percent = tracker.getPageProgress('path/to/file.md'); // Returns 0-100
```
