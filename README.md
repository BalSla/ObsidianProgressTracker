# Obsidian Progress Tracker Plugin

This plugin displays progress information for task lists and automatically
updates parent task checkboxes when all of their subtasks change state.

Pages can be excluded from calculations by tagging them with a custom ignore tag
configured in the plugin settings.

## Running Tests

Before running the test suite for the first time, install all dependencies so
that Jest and the TypeScript type definitions are available:

```bash
npm install
```

After the dependencies are installed, execute the tests with:

```bash
npm test
```

## License

This project is licensed under the [MIT License](LICENSE).