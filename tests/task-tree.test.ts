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
});
