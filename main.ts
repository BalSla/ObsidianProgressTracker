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
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
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
            const builder = new TaskTreeBuilder(vaultRoot);
            element.querySelectorAll("p").forEach(p => {
                const regex = /COMPLETE:\[\[([^\]]*)\]\]/g;
                let html = p.innerHTML;
                html = html.replace(regex, (match, linkName) => {
                    let filePath: string;
                    if (linkName && linkName.trim() !== '') {
                        const dir = context.sourcePath ? context.sourcePath.replace(/\/[^/]+$/, '') : '';
                        const filename = linkName.endsWith('.md') ? linkName : `${linkName}.md`;
                        filePath = dir ? `${dir}/${filename}` : filename;
                    } else if (context.sourcePath) {
                        console.log("No link name, using source path:", context.sourcePath);
                        filePath = context.sourcePath;
                        const tree = builder.buildFromFile(filePath);
                        return `<span class="completed-task-reading">${tree.getCompletionString()}</span>`;
                    } else {
                        console.log("No link name, using source path:", context.sourcePath);
                        filePath = context.sourcePath;
                        const tree = builder.buildFromFile(filePath);
                        return `<span class="completed-task-reading">${tree.getCompletionString()}</span>`;
                    }
                    try {
                        const tree = builder.buildFromFile(filePath);
                        return `<span class="completed-task-reading">${tree.getCompletionString()}</span>`;
                    } catch (error) {
                        return '<span class="completed-task-reading">No tasks</span>';
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
                regex = /COMPLETE:\[\[([^\]]*)\]\]/g; // Capture link name

                constructor(view: EditorView) {
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
                    const treeBuilder = new TaskTreeBuilder(vaultRoot);
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
                                displayText = tree.getCompletionString();
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
        console.log('File modified:', file.path);
        const modifiedPath = file.path;

        const backlinks = findBacklinkSources(modifiedPath);

        for (const sourceFilePath of backlinks) {
            console.log('Backlink source file:', sourceFilePath);
            const file = this.app.vault.getAbstractFileByPath(sourceFilePath);
            console.log('Looking for file opened in view:', file);
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
    console.log('Backlink sources:', sources);
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
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
