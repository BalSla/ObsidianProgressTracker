import { TaskTreeBuilder } from '../src/task-tree-builder';

describe('Tag Detection', () => {
  const builder = new TaskTreeBuilder();

  test('ignores file with regular tag in text', () => {
    const file = __dirname + '/fixtures/tag-regular.md';
    const tree = builder.buildFromFile(file);
    expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
    expect(tree.getCompletionString()).toBe('No tasks');
  });

  test('does NOT ignore file with tag in inline code block', () => {
    const file = __dirname + '/fixtures/tag-in-inline-code.md';
    const tree = builder.buildFromFile(file);
    // Should process tasks since tag is in code block
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  test('does NOT ignore file with tag in fenced code block', () => {
    const file = __dirname + '/fixtures/tag-in-code-block.md';
    const tree = builder.buildFromFile(file);
    // Should process tasks since tag is in code block
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  test('ignores file with tag in frontmatter', () => {
    const file = __dirname + '/fixtures/tag-in-frontmatter.md';
    const tree = builder.buildFromFile(file);
    // Should ignore file since tag is in frontmatter
    expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
    expect(tree.getCompletionString()).toBe('No tasks');
  });

  test('shouldIgnoreFile returns true for regular tag', () => {
    const file = __dirname + '/fixtures/tag-regular.md';
    expect(builder.shouldIgnoreFile(file)).toBe(true);
  });

  test('shouldIgnoreFile returns false for tag in inline code', () => {
    const file = __dirname + '/fixtures/tag-in-inline-code.md';
    expect(builder.shouldIgnoreFile(file)).toBe(false);
  });

  test('shouldIgnoreFile returns false for tag in code block', () => {
    const file = __dirname + '/fixtures/tag-in-code-block.md';
    expect(builder.shouldIgnoreFile(file)).toBe(false);
  });

  test('shouldIgnoreFile returns true for tag in frontmatter', () => {
    const file = __dirname + '/fixtures/tag-in-frontmatter.md';
    expect(builder.shouldIgnoreFile(file)).toBe(true);
  });
});
