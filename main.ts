import {
    App,
    Editor,
    MarkdownView,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile
} from 'obsidian';
import * as path from 'path';
import { editorLivePreviewField } from "obsidian"; // Required for CM6 editor extensions
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { ViewPlugin, Decoration, DecorationSet, ViewUpdate, WidgetType, EditorView } from '@codemirror/view';
import { TaskTreeBuilder } from './src/task-tree-builder';
import { updateParentStatuses, parseTasks, ParsedTaskInfo } from './src/auto-parent';
import { escapeRegex } from './src/utils';


interface ProgressTrackerLableSettings {
    mySetting: string;
    inlineFieldName: string;
    representation: string;
    ignoreTag: string;
    autoPropagateTaskStates: boolean;
}

interface SourcePathField {
    sourcePath: string;
}

const DEFAULT_SETTINGS: ProgressTrackerLableSettings = {
    mySetting: 'default',
    inlineFieldName: 'COMPLETE',
    representation: 'Complete {percentage}% ({completed}/{total})',
    ignoreTag: 'ignoretasktree',
    autoPropagateTaskStates: true,
};

function resolveVaultPath(root: string, filePath: string): string | undefined {
    const abs = path.resolve(root, filePath);
    const rel = path.relative(root, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        console.warn(`Skipping invalid path outside vault: ${filePath}`);
        return undefined;
    }
    return abs;
}

export default class ProgressTrackerLablePlugin extends Plugin {
    settings: ProgressTrackerLableSettings;
    private fileStates: Map<string, Map<number, boolean>> = new Map();
    private skipModify = false;
    // Plugin-level cache: only the active page's ParsedTaskInfo[]
    private pageTasksCache: ParsedTaskInfo[] | null = null;
    private lastOpenedFilePath: string | null = null;

    async onload() {
        await this.loadSettings();

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new ProgressTrackerLableSettingTab(this.app, this));

        // Reading View Processor
        this.registerMarkdownPostProcessor((element, context) => {
            // Determine vault root directory for resolving links
            let vaultRoot = '';
            const adapter: any = this.app.vault.adapter;
            vaultRoot = typeof adapter.getBasePath === 'function'
                ? adapter.getBasePath()
                : '';
            const builder = new TaskTreeBuilder(vaultRoot, this.settings.ignoreTag);
            const fieldName = this.settings.inlineFieldName;
            const template = this.settings.representation;
            element.querySelectorAll("p").forEach(p => {
                const regex = new RegExp(`${escapeRegex(fieldName)}:\\[\\[([^\\]]*)\\]\\]`, 'g');
                const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                const replacements: Array<{node: Text, frag: DocumentFragment}> = [];
                let textNode: Text | null;
                while ((textNode = walker.nextNode() as Text | null)) {
                    const text = textNode.nodeValue || '';
                    regex.lastIndex = 0;
                    let match;
                    let lastIndex = 0;
                    const frag = document.createDocumentFragment();
                    while ((match = regex.exec(text))) {
                        const before = text.slice(lastIndex, match.index);
                        if (before) frag.append(before);
                        const linkName = match[1];
                        let filePath: string;
                        if (linkName && linkName.trim() !== '') {
                            const dir = context.sourcePath ? context.sourcePath.replace(/\/[^/]+$/, '') : '';
                            const filename = linkName.endsWith('.md') ? linkName : `${linkName}.md`;
                            filePath = dir ? `${dir}/${filename}` : filename;
                        } else {
                            filePath = context.sourcePath ?? '';
                        }
                        const resolved = resolveVaultPath(vaultRoot, filePath);
                        let display: string;
                        try {
                            if (!resolved) throw new Error('invalid');
                            const tree = builder.buildFromFile(resolved);
                            const counts = tree.getCounts();
                            const rawString = tree.getCompletionString();
                            if (counts.total === 0) {
                                display = rawString;
                            } else {
                                const percentage = Math.round((counts.completed / counts.total) * 100);
                                display = template
                                    .replace('{completed}', `${counts.completed}`)
                                    .replace('{total}', `${counts.total}`)
                                    .replace('{percentage}', `${percentage}`);
                                if (rawString.endsWith(' ❗')) {
                                    display += ' ❗';
                                }
                            }
                        } catch {
                            display = 'No tasks';
                        }
                        const span = document.createElement('span');
                        span.addClass('completed-task-reading');
                        span.setText(display);
                        frag.append(span);
                        lastIndex = match.index + match[0].length;
                    }
                    if (lastIndex === 0) continue;
                    const after = text.slice(lastIndex);
                    if (after) frag.append(after);
                    replacements.push({node: textNode, frag});
                }
                for (const {node, frag} of replacements) {
                    node.replaceWith(frag);
                }
            });
        });

        // Live Preview Extension
        this.registerEditorExtension(this.createLivePreviewExtension());

        // Subscribe to vault modify event
        this.registerEvent(
            this.app.vault.on('modify', (file: TFile) => this.handleFileModify(file))
        );

        // Register handler for file/leaf open
        this.registerEvent(
            this.app.workspace.on('file-open', (file: TFile | null) => this.handleFileOpen(file))
        );
        // Register handler for file delete
        this.registerEvent(
            this.app.vault.on('delete', (file: TFile) => this.handleFileDelete(file))
        );

        // Immediately handle the currently active file on plugin load
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.handleFileOpen(activeFile);
        }
    }

    // Remove related data from pageTasksCache when file is deleted
    private handleFileDelete(file: TFile) {
        this.pageTasksCache = null;
    }

    // Called when a file/leaf is opened
    private async handleFileOpen(file: TFile | null) {
        if (!file) return;
        // Read file content and parse tasks for this page
        let vaultRoot = '';
        const adapter: any = this.app.vault.adapter;
        vaultRoot = typeof adapter.getBasePath === 'function'
            ? adapter.getBasePath()
            : '';
        const absPath = resolveVaultPath(vaultRoot, file.path);
        if (!absPath) return;
        try {
            const content = await this.app.vault.read(file);
            // Exit if page is tagged with ignoreTag
            if (content.match(new RegExp(`#${this.settings.ignoreTag}(\s|$)`))) {
                return;
            }
            const lines = content.split(/\r?\n/);
            const dir = path.dirname(absPath);
            const builder = new TaskTreeBuilder(vaultRoot, this.settings.ignoreTag);
            const tasks = parseTasks(lines, dir, builder);
            if (!tasks || tasks.length === 0) {
                return;
            }
            this.pageTasksCache = tasks;
        } catch (e) {
            console.error('[ProgressTracker] Failed to parse tasks for file', file.path, e);
        }
        this.lastOpenedFilePath = file ? file.path : null;
    }

    private createLivePreviewExtension(): Extension {
        const plugin = this; // Capture the plugin instance

        class CompleteWidget extends WidgetType {
            constructor(private readonly displayText: string) {
                super();
            }

            toDOM() {
                const span = document.createElement("span");
                span.className = "cm-completed-task-widget"; // Add a class for styling
                span.textContent = `[${this.displayText}]`;
                return span;
            }

            ignoreEvent() {
                return false;
            }
        }

        const completeTaskPlugin = ViewPlugin.fromClass(
            class {
                decorations: DecorationSet;
                regex: RegExp;

                constructor(view: EditorView) {
                    this.regex = new RegExp(`${escapeRegex(plugin.settings.inlineFieldName)}:\\[\\[([^\\]]*)\\]\\]`, 'g');
                    this.decorations = this.buildDecorations(view);
                }

                update(update: ViewUpdate) {
                    if (update.docChanged || update.viewportChanged || update.selectionSet) {
                        this.decorations = this.buildDecorations(update.view);
                    }
                }

                buildDecorations(view: EditorView): DecorationSet {
                    const rangeBuilder = new RangeSetBuilder<Decoration>();
                    const field = view.state.field(editorLivePreviewField);
                    if (!field) {
                        return rangeBuilder.finish();
                    }
                    const sourcePath = (field as unknown as SourcePathField).sourcePath;
                    let vaultRoot = '';
                    const adapter: any = plugin.app.vault.adapter;
                    vaultRoot = typeof adapter.getBasePath === 'function'
                        ? adapter.getBasePath()
                        : '';
                    const treeBuilder = new TaskTreeBuilder(vaultRoot, plugin.settings.ignoreTag);
                    for (const { from, to } of view.visibleRanges) {
                        const text = view.state.doc.sliceString(from, to);
                        let match;
                        while ((match = this.regex.exec(text))) {
                            const matchStart = from + match.index;
                            const matchLength = match[0].length;
                            const cursorPos = view.state.selection.main.head;
                            if (cursorPos >= matchStart && cursorPos <= matchStart + matchLength) {
                                continue;
                            }
                            let filePath: string;
                            const linkName = match[1];
                           // Determine target file path: if linkName empty, use current source path
                           if (linkName && linkName.trim() !== '') {
                               const dir = sourcePath ? sourcePath.replace(/\/[^/]+$/, '') : '';
                               const filename = linkName.endsWith('.md') ? linkName : `${linkName}.md`;
                               filePath = dir ? `${dir}/${filename}` : filename;
                           } else if (sourcePath) {
                               // Empty link: target is current page
                               filePath = sourcePath;
                           } else {
                               // Fallback to active file
                               const active = plugin.app.workspace.getActiveFile();
                               filePath = active?.path || '';
                           }
                            const resolved = resolveVaultPath(vaultRoot, filePath);
                            let displayText: string;
                            try {
                                if (!resolved) throw new Error('invalid');
                                const tree = treeBuilder.buildFromFile(resolved);
                                const counts = tree.getCounts();
                                const rawString = tree.getCompletionString();
                                if (counts.total === 0) {
                                    displayText = rawString;
                                } else {
                                    const percentage = Math.round((counts.completed / counts.total) * 100);
                                    displayText = plugin.settings.representation
                                        .replace('{completed}', `${counts.completed}`)
                                        .replace('{total}', `${counts.total}`)
                                        .replace('{percentage}', `${percentage}`);
                                    if (rawString.endsWith(' ❗')) {
                                        displayText += ' ❗';
                                    }
                                }
                            } catch {
                                displayText = 'No tasks';
                            }
                            rangeBuilder.add(
                                matchStart,
                                matchStart + matchLength,
                                Decoration.replace({
                                    widget: new CompleteWidget(displayText),
                                })
                            );
                        }
                    }
                    return rangeBuilder.finish();
                }
            },
            {
                decorations: (v) => v.decorations,
            }
        );
        return completeTaskPlugin;
    }


    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Handler for file modifications
    private async handleFileModify(file: TFile) {
        if (this.skipModify) {
            this.skipModify = false;
            return;
        }
        const modifiedPath = file.path;
        let root = '';
        const adapter: any = this.app.vault.adapter;
        root = typeof adapter.getBasePath === 'function'
            ? adapter.getBasePath()
            : '';
        // Exit if page is tagged with ignoreTag or contains no tasks
        try {
            const content = await this.app.vault.read(file);
            if (content.match(new RegExp(`#${this.settings.ignoreTag}(\s|$)`))) {
                return;
            }
            const lines = content.split(/\r?\n/);
            const dir = path.dirname(resolveVaultPath(root, modifiedPath) ?? '');
            const builder = new TaskTreeBuilder(root, this.settings.ignoreTag);
            const actualTasks = parseTasks(lines, dir, builder);
            if (!actualTasks || actualTasks.length === 0) {
                return;
            }
            const cached = this.pageTasksCache;
            // Compare cached and actual tasks (shallow, by length and line numbers)
            if (
                this.lastOpenedFilePath === modifiedPath &&
                cached &&
                cached.length === actualTasks.length &&
                cached.every((t, i) => t.line === actualTasks[i].line && t.completed === actualTasks[i].completed)
            ) {
                return;
            }
        } catch (e) {
            console.error('[ProgressTracker] Error comparing cache for file', modifiedPath, e);
        }
        const visited = new Set<string>();
        await this.updateFileAndBacklinks(modifiedPath, visited, root);
    }
    private async updateFileAndBacklinks(path: string, visited: Set<string>, root: string) {
        if (visited.has(path)) return;
        visited.add(path);
        const abstract = this.app.vault.getAbstractFileByPath(path);
        if (!(abstract instanceof TFile)) return;
        try {
            const content = await this.app.vault.read(abstract);
            const prev = this.fileStates.get(path);
            const result = updateParentStatuses(
                content,
                prev,
                path,
                root,
                this.settings.ignoreTag,
                this.settings.autoPropagateTaskStates
            );
            this.fileStates.set(path, result.state);
            if (result.content !== content) {
                this.skipModify = true;
                await this.app.vault.modify(abstract, result.content);
            }
        } catch (e) {
            console.error(e);
        }

        const leaves = this.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
            if (leaf.view instanceof MarkdownView && leaf.view.file?.path === path) {
                leaf.view.previewMode.rerender(true);
            }
        }

        const backlinks = findBacklinkSources(this.app, path);
        for (const source of backlinks) {
            await this.updateFileAndBacklinks(source, visited, root);
        }
    }

    /**
     * Calculate the completion percentage for a note.
     * Other plugins can call this method to obtain a page's progress.
     *
     * @param file A TFile instance or a vault-relative file path
     * @returns Progress percentage rounded to the nearest whole number
     */
    public getPageProgress(file: TFile | string): number {
        let vaultRoot = '';
        const adapter: any = this.app.vault.adapter;
        vaultRoot = typeof adapter.getBasePath === 'function'
            ? adapter.getBasePath()
            : '';
        const targetPath = typeof file === 'string' ? file : file.path;
        const resolved = resolveVaultPath(vaultRoot, targetPath);
        if (!resolved) {
            throw new Error(`Invalid path: ${targetPath}`);
        }
        const builder = new TaskTreeBuilder(vaultRoot, this.settings.ignoreTag);
        const tree = builder.buildFromFile(resolved);
        const counts = tree.getCounts();
        if (counts.total === 0) return 0;
        return Math.round((counts.completed / counts.total) * 100);
    }
}

function findBacklinkSources(app: App, targetPath: string): string[] {
  const backlinks = app.metadataCache.resolvedLinks;
  const sources: string[] = [];

  for (const [sourcePath, targets] of Object.entries(backlinks)) {
    if (typeof targets === 'object' && targets !== null) {
      const typedTargets = targets as Record<string, number>;

      if (typedTargets[targetPath]) {
        sources.push(sourcePath);
      }
    }
  }
  return sources;
}

class ProgressTrackerLableSettingTab extends PluginSettingTab {
     plugin: ProgressTrackerLablePlugin;

     constructor(app: App, plugin: ProgressTrackerLablePlugin) {
         super(app, plugin);
         this.plugin = plugin;
     }

     display(): void {
         const { containerEl } = this;

         containerEl.empty();

         new Setting(containerEl)
             .setName('Inline Field Name')
             .setDesc('The name of the inline field tag (e.g., COMPLETE)')
             .addText(text => text
                 .setPlaceholder('Enter inline field name')
                 .setValue(this.plugin.settings.inlineFieldName)
                 .onChange(async (value: string) => {
                     this.plugin.settings.inlineFieldName = value;
                     await this.plugin.saveSettings();
                 }));

         new Setting(containerEl)
             .setName('Representation Template')
             .setDesc('Template for display using {completed}, {total}, and {percentage}')
             .addText(text => text
                 .setPlaceholder('e.g., Complete {percentage}% ({completed}/{total})')
                 .setValue(this.plugin.settings.representation)
                 .onChange(async (value: string) => {
                     this.plugin.settings.representation = value;
                     await this.plugin.saveSettings();
                 }));

         new Setting(containerEl)
             .setName('Ignore Tag')
             .setDesc('Tag to ignore pages (without #), e.g., ignoretasktree')
             .addText(text => text
                 .setPlaceholder('Enter ignore tag')
                 .setValue(this.plugin.settings.ignoreTag)
                 .onChange(async (value: string) => {
                     this.plugin.settings.ignoreTag = value;
                     await this.plugin.saveSettings();
                 }));

         new Setting(containerEl)
             .setName('Auto Propagate Task States')
             .setDesc('Automatically check/uncheck parent tasks when all children change state')
             .addToggle(toggle => toggle
                 .setValue(this.plugin.settings.autoPropagateTaskStates)
                 .onChange(async (value: boolean) => {
                     this.plugin.settings.autoPropagateTaskStates = value;
                     await this.plugin.saveSettings();
                 }));
    }
}
