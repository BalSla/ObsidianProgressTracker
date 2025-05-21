import { TaskTree, ParsedTaskNode } from '../src/task-tree';

describe('TaskTree', () => {
  test('should return no tasks for an empty tree', () => {
    const tree = new TaskTree([]);
    expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
    expect(tree.getCompletionString()).toBe('No tasks');
  });

  test('should count a single completed leaf task', () => {
    const nodes: ParsedTaskNode[] = [
      { completed: true, children: [] },
    ];
    const tree = new TaskTree(nodes);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 100% (1/1)');
  });

  test('should count a single incomplete leaf task', () => {
    const nodes: ParsedTaskNode[] = [
      { completed: false, children: [] },
    ];
    const tree = new TaskTree(nodes);
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('should count multiple leaf tasks correctly', () => {
    const nodes: ParsedTaskNode[] = [
      { completed: true, children: [] },
      { completed: false, children: [] },
    ];
    const tree = new TaskTree(nodes);
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  test('should count nested tasks correctly', () => {
    const nested: ParsedTaskNode = {
      completed: false,
      children: [
        { completed: true, children: [] },
        { completed: false, children: [] },
      ],
    };
    const tree = new TaskTree([nested]);
    expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 50% (1/2)');
  });

  test('should add subtask to specified parent and update counts', () => {
    const parent: ParsedTaskNode = { completed: false, children: [] };
    const tree = new TaskTree([parent]);
    const subtask: ParsedTaskNode = { completed: true, children: [] };
    tree.addSubtask(parent, subtask);
    // Now parent has one child, so total tasks = 1, completed = 1
    expect(tree.getCounts()).toEqual({ total: 1, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 100% (1/1) ❗');
  });

  test('should throw an error when adding subtask to non-existent parent', () => {
    const existing: ParsedTaskNode = { completed: false, children: [] };
    const nonExistent: ParsedTaskNode = { completed: false, children: [] };
    const tree = new TaskTree([existing]);
    const subtask: ParsedTaskNode = { completed: false, children: [] };
    expect(() => tree.addSubtask(nonExistent, subtask)).toThrow('Parent task not found');
  });

  test('should append exclamation icon when parent marked completed but child is incomplete', () => {
    const malformed: ParsedTaskNode = {
      completed: true,
      children: [ { completed: false, children: [] } ]
    };
    const tree = new TaskTree([malformed]);
    // processNode counts total=1, completed=0 => 0%
    expect(tree.getCounts()).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1) ❗');
  });

  test('should append exclamation icon when parent marked incomplete but all children are complete', () => {
    const malformed: ParsedTaskNode = {
      completed: false,
      children: [ { completed: true, children: [] } ]
    };
    const tree = new TaskTree([malformed]);
    // processNode counts total=1, completed=1 => 100%
    expect(tree.getCounts()).toEqual({ total: 1, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 100% (1/1) ❗');
  });
});
