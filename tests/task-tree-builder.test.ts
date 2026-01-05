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
    test('handles self-link cycle: task counts, link contributes 0', () => {
      const file = __dirname + '/fixtures/cyclic-self.md';
      const tree = builder.buildFromFile(file);
      // Should show 1 incomplete task (the task itself)
      // The self-link contributes 0 additional tasks
      expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
      expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
    });

    test('handles indirect link cycle: tasks count, cyclic link contributes 0', () => {
      const file = __dirname + '/fixtures/cyclic-A.md';
      const tree = builder.buildFromFile(file);
      // cyclic-A.md: - [ ] Task A [[cyclic-B]]
      // cyclic-B.md: - [x] Task B [[cyclic-A]]  (link back to A contributes 0)
      // Expected: Task A (incomplete) becomes parent with Task B (complete) as child
      // Total: 1 (Task B), Completed: 1 (Task B)
      // Note: May show ❗ because parent Task A is incomplete but child Task B is complete
      expect(tree.getCounts()).toEqual({ total: 1, completed: 1 });
      expect(tree.getCompletionString()).toMatch(/Complete 100% \(1\/1\)( ❗)?/);
    });

      test('detects indirect link (pipe-styled) cycle and marks with error icon', () => {
      const file = __dirname + '/fixtures/alias-link-pipe.md';
      const tree = builder.buildFromFile(file);
      // alias-link-pipe.md: - [ ] Parent Task [[subpage-pipe.md|SubPage Alias]]
      // subpage-pipe.md:
      //   - [x] Subtask 1 (leaf)
      //   - [ ] Subtask 2 (parent)
      //       - [x] SubSubtask 1 (leaf)
      //       - [ ] [[alias-link-pipe.md|SubSubtask 2]] (task with cycle link)
      // 
      // Task hierarchy:
      // - Parent Task (has children from subpage-pipe)
      //   - Subtask 1 (completed, leaf) = 1 task
      //   - Subtask 2 (parent, counts as sum of children) = 2 tasks
      //     - SubSubtask 1 (completed, leaf) = 1 task
      //     - SubSubtask 2 (incomplete task, cycle link contributes 0) = 1 task
      // Total: 3 tasks (Subtask 1, SubSubtask 1, SubSubtask 2), Completed: 2
      expect(tree.getCounts()).toEqual({ total: 3, completed: 2 });
      expect(tree.getCompletionString()).toMatch(/Complete 67% \(2\/3\)( ❗)?/);
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

  test('marking Task 2 complete does not mark Task 1 as complete (separate list items)', () => {
    // Build the tree from the same fixture used above
    const file = __dirname + '/fixtures/mixed-list-complex.md';
    const tree: any = builder.buildFromFile(file);

    // Access the internal root nodes (tests already use this pattern elsewhere)
    // Expected root node order: [ Task 1, B1(from B.md), Task 2 under B, Task 3 under B, Task 4 ]
    const roots = tree['rootNodes'];
    expect(roots.length).toBe(5);

    const task1 = roots[0];
    const task2 = roots[2];
    const task3 = roots[3];

    // Sanity: initial states (task1 incomplete, task2 incomplete, task3 completed)
    expect(task1.completed).toBe(false);
    expect(task2.completed).toBe(false);
    expect(task3.completed).toBe(true);
    const countsBefore = tree.getCounts();
    // Now completed should be 1 (Task 3), total still 5
    expect(countsBefore).toEqual({ total: 5, completed: 1 });


    // Mark Task 2 as completed and verify counts update
    task2.completed = true;
    const countsAfter = tree.getCounts();
    // Now completed should be 2 (Task 2 + Task 3), total still 5
    expect(countsAfter).toEqual({ total: 5, completed: 2 });

    // Ensure Task 1 remains incomplete (Task 2 is not its child)
    expect(task1.completed).toBe(false);
  });

});
