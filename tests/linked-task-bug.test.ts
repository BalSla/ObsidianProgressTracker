import { updateParentStatuses } from '../src/auto-parent';
import * as fs from 'fs';
import * as path from 'path';

describe('Fix for new task auto-check bug', () => {
  const testDir = path.join(__dirname, 'fixtures');
  
  beforeAll(() => {
    // Create test fixtures directory and files if they don't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a linked page with completed tasks
    const completedPageContent = [
      '- [x] Completed task 1',
      '- [x] Completed task 2',
    ].join('\n');
    fs.writeFileSync(path.join(testDir, 'completed-page.md'), completedPageContent);
    
    // Create a linked page with incomplete tasks  
    const incompletePageContent = [
      '- [x] Completed task 1',
      '- [ ] Incomplete task 2',
    ].join('\n');
    fs.writeFileSync(path.join(testDir, 'incomplete-page.md'), incompletePageContent);
  });

  test('newly created task with link to completed page should NOT be auto-checked', () => {
    // Start with a task tree
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, testDir, 'ignoretasktree', true);
    
    // Add a new task with a link to a page where all tasks are completed
    // This task should remain unchecked (this was the bug)
    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [ ] New task [[completed-page]]',  // Should remain unchecked
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, 'test.md', testDir, 'ignoretasktree', true);
    
    // The new task should remain unchecked even though the linked page has all completed tasks
    const lines = result.content.split('\n');
    const newTaskLine = lines[3];
    expect(newTaskLine).toBe('  - [ ] New task [[completed-page]]');
    
    // The parent should become unchecked due to the new incomplete child
    const parentLine = lines[0];
    expect(parentLine).toBe('- [ ] Parent');
  });

  test('newly created task with link to incomplete page should remain unchecked', () => {
    // Start with a task tree
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, testDir, 'ignoretasktree', true);
    
    // Add a new task with a link to a page where not all tasks are completed
    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [ ] New task [[incomplete-page]]',
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, 'test.md', testDir, 'ignoretasktree', true);
    
    // The new task should remain unchecked
    const lines = result.content.split('\n');
    const newTaskLine = lines[3];
    expect(newTaskLine).toBe('  - [ ] New task [[incomplete-page]]');
  });

  test('existing parent task with link should still be auto-completed based on linked page', () => {
    // Test that we didn't break the existing functionality for parent tasks with links
    let content = '- [ ] Parent Task [[completed-page]]';
    
    // Call without prevState to simulate a task that's not newly created
    let result = updateParentStatuses(content, undefined, 'test.md', testDir, 'ignoretasktree', true);
    
    // Should be auto-completed because the linked page has all completed tasks
    expect(result.content.trim()).toBe('- [x] Parent Task [[completed-page]]');
  });

  test('newly created parent task with link should NOT be auto-completed on first creation', () => {
    // This tests the specific fix: newly created tasks with links should not be auto-completed
    let content = '- [ ] New Parent Task [[completed-page]]';
    
    // This simulates adding a completely new task with a link
    let result = updateParentStatuses(content, new Map(), 'test.md', testDir, 'ignoretasktree', true);
    
    // The new task should remain unchecked even though the linked page has completed tasks
    expect(result.content.trim()).toBe('- [ ] New Parent Task [[completed-page]]');
  });
});