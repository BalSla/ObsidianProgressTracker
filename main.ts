import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile      // added TFile
} from 'obsidian';
import { editorLivePreviewField } from "obsidian"; // Required for CM6 editor extensions
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { ViewPlugin, Decoration, DecorationSet, ViewUpdate, WidgetType, EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';
import { TaskTreeBuilder } from './src/task-tree-builder';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    mySetting: string;
    inlineFieldName: string;
    representation: string;
    ignoreTag: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    inlineFieldName: 'COMPLETE',
    representation: 'Complete {percentage}% ({completed}/{total})',
    ignoreTag: 'ignoretasktree',
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // Reading View Processor
        this.registerMarkdownPostProcessor((element, context) => {
            // Determine vault root directory for resolving links
            const vaultRoot = (this.app.vault.adapter as any).basePath;
            const builder = new TaskTreeBuilder(vaultRoot, this.settings.ignoreTag);
            const fieldName = this.settings.inlineFieldName;
            const template = this.settings.representation;
            element.querySelectorAll("p").forEach(p => {
                const regex = new RegExp(`${fieldName}:\\[\\[([^\\]]*)\\]\\]`, 'g');
                let html = p.innerHTML;
                html = html.replace(regex, (match, linkName) => {
                    let filePath: string;
                    if (linkName && linkName.trim() !== '') {
                        const dir = context.sourcePath ? context.sourcePath.replace(/\/[^/]+$/, '') : '';
                        const filename = linkName.endsWith('.md') ? linkName : `${linkName}.md`;
                        filePath = dir ? `${dir}/${filename}` : filename;
                    } else if (context.sourcePath) {
                        filePath = context.sourcePath;
                        const tree = builder.buildFromFile(filePath);
                        return `<span class="completed-task-reading">${tree.getCompletionString()}</span>`;
                    } else {
                        filePath = context.sourcePath;
                        const tree = builder.buildFromFile(filePath);
                        return `<span class="completed-task-reading">${tree.getCompletionString()}</span>`;
                    }
                    try {
                        const tree = builder.buildFromFile(filePath);
                        const counts = tree.getCounts();
                        const rawString = tree.getCompletionString();
                        let display: string;
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
                        return `<span class="completed-task-reading">${display}</span>`;
                    } catch (error) {
                        return `<span class="completed-task-reading">No tasks</span>`;
                    }
                });
                p.innerHTML = html;
            });
        });

        // Live Preview Extension
        this.registerEditorExtension(this.createLivePreviewExtension());

        // Subscribe to vault modify event
        this.registerEvent(
            this.app.vault.on('modify', (file: TFile) => this.handleFileModify(file))
        );
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
                    this.regex = new RegExp(`${plugin.settings.inlineFieldName}:\\[\\[([^\\]]*)\\]\\]`, 'g');
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
                    const sourcePath = (field as any).sourcePath;
                    const vaultRoot = (plugin.app.vault.adapter as any).basePath;
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
                            let displayText: string;
                            try {
                                const tree = treeBuilder.buildFromFile(filePath);
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
    private handleFileModify(file: TFile) {
        const modifiedPath = file.path;

        const backlinks = findBacklinkSources(modifiedPath);

        for (const sourceFilePath of backlinks) {
            const file = this.app.vault.getAbstractFileByPath(sourceFilePath);
            const leaves = this.app.workspace.getLeavesOfType("markdown");
            for (const leaf of leaves) {
                if (leaf.view instanceof MarkdownView && leaf.view.file === file) {
                    leaf.view.previewMode.rerender(true);
                }
            }
        }
    }
}

function findBacklinkSources(targetPath: string): string[] {
  const backlinks = this.app.metadataCache.resolvedLinks;
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

class SampleSettingTab extends PluginSettingTab {
     plugin: MyPlugin;

     constructor(app: App, plugin: MyPlugin) {
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
    }
}
