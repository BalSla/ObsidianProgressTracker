import { TaskTreeBuilder } from '../src/task-tree-builder';

describe('TaskTreeBuilder', () => {
  const builder = new TaskTreeBuilder();

  test('build simple tree from simple.md', () => {
    const file = __dirname + '/fixtures/simple.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  test('build nested tree from main.md with linked subpage', () => {
    const file = __dirname + '/fixtures/main.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 3, completed: 2 });
    expect(tree.getCompletionString()).toBe('Complete 67% (2/3)');
  });

  test('throws error on missing file', () => {
    expect(() => builder.buildFromFile('nonexistent.md')).toThrow('File not found');
  });

  test('handles tasks linked to a page without tasks', () => {
    const file = __dirname + '/fixtures/linked-no-tasks.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('handles pipe-alias links [[page|alias]] to include page tasks', () => {
    const file = __dirname + '/fixtures/alias-link.md';
    const tree = builder.buildFromFile(file);
    // alias link to subpage.md should include its 3 tasks (2 completed)
    expect(tree.getCounts()).toEqual({ total: 3, completed: 2 });
    expect(tree.getCompletionString()).toBe('Complete 67% (2/3)');
  });

  test('ignores non-Obsidian markdown links within tasks', () => {
    const file = __dirname + '/fixtures/markdown-link.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  describe('cyclic task trees', () => {
    test('detects self-link cycle and marks with error icon', () => {
      const file = __dirname + '/fixtures/cyclic-self.md';
      const tree = builder.buildFromFile(file);
      expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
      expect(tree.getCompletionString()).toBe('No tasks ❗');
    });

    test('detects indirect link cycle and marks with error icon', () => {
      const file = __dirname + '/fixtures/cyclic-A.md';
      const tree = builder.buildFromFile(file);
      expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
      expect(tree.getCompletionString()).toBe('No tasks ❗');
    });

      test('detects indirect link (pipe-styled) cycle and marks with error icon', () => {
      const file = __dirname + '/fixtures/alias-link-pipe.md';
      const tree = builder.buildFromFile(file);
      expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
      expect(tree.getCompletionString()).toBe('No tasks ❗');
    });
  });

  test('skips pages tagged with #ignoretasktree', () => {
    const file = __dirname + '/fixtures/ignore-tasktree.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
    expect(tree.getCompletionString()).toBe('No tasks');
  });
  test('skips tasks from linked pages tagged with #ignoretasktree', () => {
    const file = __dirname + '/fixtures/ignore-tasktree-start.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('skips pages tagged with custom ignore tag', () => {
    const customBuilder = new TaskTreeBuilder(undefined, 'customignore');
    const file = __dirname + '/fixtures/ignore-custom.md';
    const tree = customBuilder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
    expect(tree.getCompletionString()).toBe('No tasks');
  });

  test('build tree from page with multiple separate lists', () => {
    const file = __dirname + '/fixtures/multi.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 4, completed: 2 });
    expect(tree.getCompletionString()).toBe('Complete 50% (2/4)');
  });

  test('includes all tasks from linked page with multiple lists', () => {
    const file = __dirname + '/fixtures/multi-link.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 5, completed: 2 });
    expect(tree.getCompletionString()).toBe('Complete 40% (2/5)');
  });

  test('does not traverse links outside root dir', () => {
    const rootDir = __dirname + '/fixtures';
    const customBuilder = new TaskTreeBuilder(rootDir);
    const file = rootDir + '/outside-link.md';
    const tree = customBuilder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
     });
  test('ignores links that escape the vault root', () => {
    const root = __dirname + '/fixtures';
    const customBuilder = new TaskTreeBuilder(root);
    const file = root + '/path-traversal.md';
    const tree = customBuilder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('handles mixed list with non-task items correctly', () => {
    // Bug: tasks indented under non-task items should not be children of previous task
    // - [ ] A
    // - [[B]]
    //     - [ ] [[C]]
    // Task C should NOT be a child of task A
    const file = __dirname + '/fixtures/mixed-list.md';
    const tree = builder.buildFromFile(file);
    // Expected: Task A (1 incomplete) + Tasks from B (1 incomplete) + Tasks from C (1 incomplete, 1 complete)
    // Total: 4 tasks, 1 completed (C2)
    expect(tree.getCounts()).toEqual({ total: 4, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 25% (1/4)');
  });

  test('handles complex mixed list with multiple tasks and non-task items', () => {
    // - [ ] Task 1
    // - [[B]]
    //     - [ ] Task 2 under B
    //     - [x] Task 3 under B
    // - [ ] Task 4
    // Task 2 and Task 3 should NOT be children of Task 1
    const file = __dirname + '/fixtures/mixed-list-complex.md';
    const tree = builder.buildFromFile(file);
    // Expected: Task 1 + B1 (from B.md) + Task 2 + Task 3 + Task 4
    // Total: 5 tasks, 1 completed (Task 3)
    expect(tree.getCounts()).toEqual({ total: 5, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 20% (1/5)');
  });

});
