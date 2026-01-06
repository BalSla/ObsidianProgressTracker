import { TaskTreeBuilder } from '../src/task-tree-builder';

describe('Duplicate link handling', () => {
  const builder = new TaskTreeBuilder();

  test('duplicate task links to same page - first gets children, rest are leaves', () => {
    const file = __dirname + '/fixtures/duplicate-link.md';
    const tree = builder.buildFromFile(file);
    const counts = tree.getCounts();
    
    // duplicate-link.md:
    // - [ ] Task 1 [[subpage]]  -> becomes parent with subpage's tasks
    // - [ ] Task 2 [[subpage]]  -> becomes leaf (deduplicated)
    // - [x] Task 3               -> leaf task
    //
    // subpage.md has 3 tasks: 2 completed, 1 incomplete
    // Expected: 3 (from subpage via Task 1) + 1 (Task 2 leaf) + 1 (Task 3) = 5
    // Completed: 2 (from subpage) + 0 (Task 2) + 1 (Task 3) = 3
    expect(counts).toEqual({ total: 5, completed: 3 });
    expect(tree.getCompletionString()).toMatch(/Complete 60% \(3\/5\)/);
  });

  test('three tasks linking to same page - only first includes children', () => {
    // Reuse the builder instance - TaskTreeBuilder is stateless for individual calls
    const file = __dirname + '/fixtures/triple-link.md';
    const tree = builder.buildFromFile(file);
    const counts = tree.getCounts();
    
    // triple-link.md:
    // - [ ] First [[subpage]]   -> becomes parent with subpage's 3 tasks
    // - [ ] Second [[subpage]]  -> becomes leaf (deduplicated)
    // - [x] Third [[subpage]]   -> becomes leaf (deduplicated, completed)
    //
    // Expected: 3 (from subpage) + 1 (Second) + 1 (Third) = 5
    // Completed: 2 (from subpage) + 0 (Second) + 1 (Third) = 3
    expect(counts).toEqual({ total: 5, completed: 3 });
  });

  test('duplicate non-task links to same page', () => {
    const file = __dirname + '/fixtures/duplicate-non-task-link.md';
    const tree = builder.buildFromFile(file);
    const counts = tree.getCounts();
    
    // duplicate-non-task-link.md:
    // - [[subpage]]    -> includes all 3 tasks from subpage
    // - [[subpage]]    -> deduplicated, no tasks added
    // - [x] Task 1     -> 1 completed task
    //
    // Expected: 3 (from subpage via first link) + 1 (Task 1) = 4
    // Completed: 2 (from subpage) + 1 (Task 1) = 3
    expect(counts).toEqual({ total: 4, completed: 3 });
  });

  test('mixed task and non-task duplicate links', () => {
    const file = __dirname + '/fixtures/mixed-duplicate-link.md';
    const tree = builder.buildFromFile(file);
    const counts = tree.getCounts();
    
    // mixed-duplicate-link.md:
    // - [ ] Task [[subpage]]  -> includes all 3 tasks from subpage
    // - [[subpage]]            -> deduplicated, no tasks added
    // - [x] Done               -> 1 completed task
    //
    // Expected: 3 (from subpage) + 1 (Done) = 4
    // Completed: 2 (from subpage) + 1 (Done) = 3
    expect(counts).toEqual({ total: 4, completed: 3 });
  });
});
