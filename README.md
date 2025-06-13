# Obsidian Progress Tracker Plugin

This plugin displays progress information for task lists and automatically
updates parent task checkboxes when all of their subtasks change state.

Pages can be excluded from calculations by tagging them with a custom ignore tag
configured in the plugin settings.

## Programmatic API

Other plugins can obtain a note's completion percentage by calling the
`getPageProgress` method exposed by this plugin. First retrieve the plugin by its
ID (`obsidian-progress-tracker`) and then pass a vault-relative path or `TFile`
instance:

```ts
const tracker = this.app.plugins.getPlugin('obsidian-progress-tracker');
if (tracker) {
  const percent = tracker.getPageProgress('path/to/file.md');
  console.log(`Progress: ${percent}%`);
}
```

## License

This project is licensed under the [MIT License](LICENSE).