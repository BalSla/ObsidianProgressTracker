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
});
