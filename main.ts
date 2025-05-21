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

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Progress Tracker Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        // Reading View Processor
        this.registerMarkdownPostProcessor((element, context) => {
            element.querySelectorAll("p").forEach(p => {
                const regex = /COMPLETE:\[\[\]\]/g;
                let html = p.innerHTML;
                html = html.replace(regex, () => {
                    // Replace with a styled HTML span or container
                    return '<span class="completed-task-reading">COMPLETED TASK</span>';
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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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
