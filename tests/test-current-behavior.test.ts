import { TaskTreeBuilder } from '../src/task-tree-builder';

describe('Current behavior with duplicate links', () => {
  test('duplicate links to same page - current behavior', () => {
    const builder = new TaskTreeBuilder();
    const file = __dirname + '/fixtures/duplicate-link.md';
    const tree = builder.buildFromFile(file);
    const counts = tree.getCounts();
    console.log('Current Total:', counts.total, 'Completed:', counts.completed);
    // Currently, subpage.md has 3 tasks (1 completed, 2 incomplete)
    // So duplicate-link.md currently has:
    // Task 1 -> includes all 3 tasks from subpage
    // Task 2 -> includes all 3 tasks from subpage again (duplicate!)
    // Task 3 -> 1 completed task
    // Total: 3 + 3 + 1 = 7, Completed: 1 + 1 + 1 = 3
  });
});
