import { TaskTreeBuilder } from '../src/task-tree-builder';
import * as fs from 'fs';
import * as path from 'path';

describe('Non-task list items as children', () => {
  let builder: TaskTreeBuilder;
  let fixtureDir: string;

  beforeEach(() => {
    fixtureDir = path.join(__dirname, 'fixtures', 'temp-non-task-test');
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
    builder = new TaskTreeBuilder(fixtureDir);
  });

  afterEach(() => {
    // Cleanup temp fixtures
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  test('non-task item with linked page as child of task should not count as task child', () => {
    // Create linked page with a task
    fs.writeFileSync(
      path.join(fixtureDir, 'linked-page.md'),
      `- [ ] task aa
`
    );

    // Create main page with task having non-task item as child
    // - [ ] task a
    //   - [[linked-page]]
    // 
    // The non-task item `- [[linked-page]]` should NOT be a child of task a
    // Linked page tasks should not be added to the tree
    fs.writeFileSync(
      path.join(fixtureDir, 'main.md'),
      `- [ ] task a
  - [[linked-page]]
`
    );

    const tree = builder.buildFromFile(path.join(fixtureDir, 'main.md'));
    const counts = tree.getCounts();

    // Expected: 
    // - task a (root level, incomplete)
    // Total: 1, Completed: 0
    expect(counts).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('non-task item should not affect parent task completion calculation', () => {
    // Create linked page with all tasks complete
    fs.writeFileSync(
      path.join(fixtureDir, 'linked-complete.md'),
      `- [x] task aa
`
    );

    // Create main page where parent task has a non-task item child
    fs.writeFileSync(
      path.join(fixtureDir, 'main.md'),
      `- [ ] task a
  - [[linked-complete]]
`
    );

    const tree = builder.buildFromFile(path.join(fixtureDir, 'main.md'));
    const counts = tree.getCounts();

    // Expected: 
    // - task a (root, incomplete)
    // Total: 1, Completed: 0
    expect(counts).toEqual({ total: 1, completed: 0 });
    expect(tree.getCompletionString()).toBe('Complete 0% (0/1)');
  });

  test('indented tasks under non-task item should not become children of parent task', () => {
    // Create linked page with tasks
    fs.writeFileSync(
      path.join(fixtureDir, 'B.md'),
      `- [ ] B1
`
    );

    fs.writeFileSync(
      path.join(fixtureDir, 'C.md'),
      `- [ ] C1
- [x] C2
`
    );

    // Create main page with mixed structure:
    // - [ ] A
    // - [[B]]
    //     - [ ] [[C]]
    // 
    // Tasks from B should be at root level (siblings of A)
    // Tasks from C should be at root level (siblings of A), not children of B
    fs.writeFileSync(
      path.join(fixtureDir, 'main.md'),
      `- [ ] A
- [[B]]
    - [ ] [[C]]
`
    );

    const tree = builder.buildFromFile(path.join(fixtureDir, 'main.md'));
    const counts = tree.getCounts();

    // Expected: A + B1 + C1 + C2 = 4 total, 1 completed (C2)
    expect(counts).toEqual({ total: 4, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 25% (1/4)');

    // Verify that A has no children (it's a leaf, not a parent)
    const roots = (tree as any)['rootNodes'];
    // A should be a root, B1 should be a root. Indented [[C]] under B creates C1, C2 as roots 
    // Total root count should be 4 or 3 depending on implementation
    const aNode = roots.find((r: any) => r.completed === false && r.children.length === 0 && 
                              (tree as any)['rootNodes'].indexOf(r) === 0);
    expect(aNode).toBeDefined();
    expect(aNode.children.length).toBe(0); // A should have no children
  });

  test('non-task item at root level with linked tasks', () => {
    // Create linked page
    fs.writeFileSync(
      path.join(fixtureDir, 'subpage.md'),
      `- [x] S1
- [ ] S2
`
    );

    // Create main page with non-task item at root
    fs.writeFileSync(
      path.join(fixtureDir, 'main.md'),
      `- [ ] Task 1
- [[subpage]]
- [ ] Task 2
`
    );

    const tree = builder.buildFromFile(path.join(fixtureDir, 'main.md'));
    const counts = tree.getCounts();

    // Expected: Task 1 + S1 + S2 + Task 2 = 4 total, 1 completed (S1)
    expect(counts).toEqual({ total: 4, completed: 1 });
    expect(tree.getCompletionString()).toBe('Complete 25% (1/4)');
  });
});
