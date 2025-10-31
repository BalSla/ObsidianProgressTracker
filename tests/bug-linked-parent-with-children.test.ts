import * as fs from 'fs';
import * as path from 'path';
import { updateParentStatuses } from '../src/auto-parent';

describe('Parent task with link and child tasks', () => {
  const root = path.join(__dirname, 'fixtures');

  test('parent with link to incomplete page and all children complete should remain unchecked', () => {
    // Scenario: parent task links to pageB (which has incomplete tasks)
    // and has two child tasks that are both complete.
    // Expected: parent should remain unchecked because linked page has incomplete tasks
    const filePath = path.join(root, 'pageA.md');
    
    const content = `- [ ] [[pageB]]
  - [x] child A
  - [x] child B`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    // Parent should remain unchecked despite all children being complete
    // because pageB has incomplete tasks
    expect(result.content.split(/\r?\n/)[0]).toBe('- [ ] [[pageB]]');
    expect(result.content).toBe(content); // No changes should be made
  });

  test('parent with link to complete page and all children complete should be checked', () => {
    // Scenario: parent task links to a page with all tasks complete
    // and has two child tasks that are both complete.
    // Expected: parent should be checked
    const filePath = path.join(root, 'pageA-complete.md');
    
    const content = `- [ ] [[subpage-complete]]
  - [x] child A
  - [x] child B`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    // Parent should be checked because both children and linked page are complete
    expect(result.content.split(/\r?\n/)[0]).toBe('- [x] [[subpage-complete]]');
  });

  test('parent with link and incomplete children should remain unchecked', () => {
    // Scenario: parent task has a link (doesn't matter if page is complete)
    // but has at least one incomplete child
    // Expected: parent should remain unchecked
    const filePath = path.join(root, 'pageA.md');
    
    const content = `- [ ] [[subpage-complete]]
  - [x] child A
  - [ ] child B`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    // Parent should remain unchecked because child B is incomplete
    expect(result.content.split(/\r?\n/)[0]).toBe('- [ ] [[subpage-complete]]');
    expect(result.content).toBe(content); // No changes should be made
  });
});
