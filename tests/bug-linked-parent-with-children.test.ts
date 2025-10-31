import * as fs from 'fs';
import * as path from 'path';
import { updateParentStatuses } from '../src/auto-parent';

describe('Bug: linked parent with incomplete linked page and complete children', () => {
  const root = path.join(__dirname, 'fixtures');

  test('parent with link to incomplete page and all children complete should remain unchecked', () => {
    // pageB has an incomplete task
    // pageA has a parent task linking to pageB with all children complete
    const filePath = path.join(root, 'pageA.md');
    
    // Simulate the scenario where child B is now checked
    const content = `- [ ] [[pageB]]
  - [x] child A
  - [x] child B`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result content:', result.content);
    
    // Expected: parent should remain unchecked because pageB has incomplete tasks
    // The parent should not be checked just because all its direct children are complete
    expect(result.content.split(/\r?\n/)[0]).toBe('- [ ] [[pageB]]');
  });

  test('actually reproduce the bug - with 1-space indent', () => {
    // Try with 1-space indentation
    const filePath = path.join(root, 'pageA.md');
    
    const content = `- [ ] [[pageB]]
 - [x] child A
 - [x] child B`;
    
    const { parseTasks } = require('../src/auto-parent');
    const lines = content.split(/\r?\n/);
    const { TaskTreeBuilder } = require('../src/task-tree-builder');
    const builder = new TaskTreeBuilder(root, 'ignoretasktree');
    const dir = path.dirname(filePath);
    const tasks = parseTasks(lines, dir, builder);
    
    console.log('1-space indent - Task count:', tasks.length);
    console.log('1-space indent - Task 0 linkChildrenComplete:', tasks[0]?.linkChildrenComplete);
    console.log('1-space indent - Task 0 children.length:', tasks[0]?.children.length);
    if (tasks[0]) {
      console.log('1-space indent - Task 0 children completed:', tasks[0].children.map((c: any) => c.completed));
    }
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('1-space indent - Result content:', result.content);
    
    const firstLine = result.content.split(/\r?\n/)[0];
    if (firstLine === '- [x] [[pageB]]') {
      console.log('BUG CONFIRMED with 1-space indent!');
    } else {
      console.log('Bug still NOT reproduced with 1-space indent');
    }
  });
});
