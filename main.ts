import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting
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
                regex = /COMPLETE:\[\[\]\]/g; // Escaped square brackets for regex

                constructor(view: EditorView) {
                    this.decorations = this.buildDecorations(view);
                }

                update(update: ViewUpdate) {
                    if (update.docChanged || update.viewportChanged || update.selectionSet) {
                        this.decorations = this.buildDecorations(update.view);
                    }
                }

                buildDecorations(view: EditorView): DecorationSet {
                    const builder = new RangeSetBuilder<Decoration>();
                    if (!view.state.field(editorLivePreviewField)) {
                        return builder.finish();
                    }

                    for (const { from, to } of view.visibleRanges) {
                        const text = view.state.doc.sliceString(from, to);
                        let match;
                        while ((match = this.regex.exec(text))) {
                            const matchStart = from + match.index;
                            const matchEnd = matchStart + match[0].length;

                            // Skip rendering the widget when the cursor is inside the inline field to allow direct editing
                            const cursorPos = view.state.selection.main.head;
                            if (cursorPos >= matchStart && cursorPos <= matchEnd) {
                                continue;
                            }

                            // Check if the match is already decorated or part of a more complex syntax node
                            // This is a simplified check; more robust parsing might be needed
                            let covered = false;
                            syntaxTree(view.state).iterate({
                                from: matchStart,
                                to: matchEnd,
                                enter: (node: SyntaxNode) => {
                                    // If the match is inside something already handled by Obsidian's syntax tree
                                    // (e.g., a link alias, code block), we might want to skip it.
                                    // This is a very basic check.
                                    if (node.from < matchStart || node.to > matchEnd) {
                                        if (node.name !== "Document" && node.name !== "Paragraph" && node.name !== "HardBreak") {
                                            // console.log("Skipping due to existing node:", node.name, node.from, node.to, "vs", matchStart, matchEnd);
                                        }
                                    }
                                    // More sophisticated checks might be needed here to avoid conflicts
                                    // with Obsidian's own rendering of links, tags, etc.
                                }
                            });


                            if (!covered) {
                                builder.add(
                                    matchStart,
                                    matchEnd,
                                    Decoration.replace({
                                        widget: new CompleteWidget("COMPLETED TASK"),
                                    })
                                );
                            }
                        }
                    }
                    return builder.finish();
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
