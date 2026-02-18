import { updateParentStatuses, parseTasks } from '../src/auto-parent';
import * as path from 'path';

describe('Ignore tag with auto-parent propagation', () => {
  const root = __dirname + '/fixtures';

  test('parent task linking to ignored file should only check local children', () => {
    const filePath = root + '/parent-link-to-ignored.md';
    const content = `- [ ] Parent task [[ignore-tasktree.md]]
  - [x] Local child task`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result content:', result.content);
    
    // Parent task should be marked complete because:
    // 1. ignore-tasktree.md tasks should be ignored (not affect parent)
    // 2. Local child task is complete
    // So parent should be complete
    expect(result.content).toContain('- [x] Parent task');
  });

  test('parent task linking to ignored file with incomplete local children', () => {
    const filePath = root + '/parent-link-to-ignored.md';
    const content = `- [ ] Parent task [[ignore-tasktree.md]]
  - [ ] Local child task`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result content:', result.content);
    
    // Parent task should remain incomplete because local child is incomplete
    // (ignore-tasktree.md tasks should not affect this)
    expect(result.content).toContain('- [ ] Parent task');
  });

  test('leaf task linking ONLY to ignored file should NOT be auto-updated', () => {
    const filePath = root + '/parent-link-to-ignored.md';
    const content = `- [ ] Task that links to ignored [[ignore-tasktree.md]]`;
    
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result content for leaf task:', result.content);
    
    // Task has no local children and links to ignored file
    // The ignored file has incomplete tasks, but they should be ignored
    // So the task should remain as-is (not auto-updated)
    expect(result.content).toBe('- [ ] Task that links to ignored [[ignore-tasktree.md]]');
  });

  test('leaf task linking to ignored file WITH completed tasks should NOT be auto-checked', () => {
    const filePath = root + '/parent-link-to-ignored.md';
    const content = `- [ ] Task that links to ignored [[ignore-tasktree.md]]`;
    
    // Even though ignore-tasktree.md has 1 completed and 1 incomplete task,
    // the task should NOT be affected
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result content:', result.content);
    
    // Task should remain unchecked because the linked file is ignored
    expect(result.content).toBe('- [ ] Task that links to ignored [[ignore-tasktree.md]]');
  });

  test('leaf task linking to ignored file with ALL tasks complete should NOT be auto-checked', () => {
    const filePath = root + '/parent-link-to-ignored.md';
    const content = `- [ ] Task that links to complete ignored [[ignore-tasktree-all-complete.md]]`;
    
    // Even though ignore-tasktree-all-complete.md has all tasks complete,
    // the task should NOT be auto-checked because the file is ignored
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    
    console.log('Result for all-complete ignored:', result.content);
    
    // Task should remain unchecked because the linked file is ignored
    expect(result.content).toBe('- [ ] Task that links to complete ignored [[ignore-tasktree-all-complete.md]]');
  });

  test('fallback path (no builder, no rootDir) should not auto-check task linking to ignored file', () => {
    // This tests the fallback code path (lines 90-137 in auto-parent.ts)
    // When builder is not provided but currentDir is
    const content = `- [ ] Task that links to complete ignored [[ignore-tasktree-all-complete.md]]`;
    
    // Call without rootDir to test the fallback path
    const result = updateParentStatuses(content, undefined, root + '/parent-link-to-ignored.md', undefined, 'ignoretasktree', true);
    
    console.log('Fallback path result:', result.content);
    
    // This is where the bug might be: fallback path doesn't check ignore tag
    // Task should remain unchecked
    expect(result.content).toBe('- [ ] Task that links to complete ignored [[ignore-tasktree-all-complete.md]]');
  });

  test('parseTasks fallback path respects ignore tag when provided', () => {
    // Direct call to parseTasks with currentDir but no builder
    // This triggers the fallback path
    const content = `- [ ] Task links to ignored [[ignore-tasktree-all-complete.md]]`;
    const lines = content.split(/\r?\n/);
    
    const list = parseTasks(lines, root, undefined, 'ignoretasktree');  // currentDir provided, no builder, ignoreTag provided
    
    console.log('parseTasks result:', list);
    console.log('linkChildrenComplete:', list[0]?.linkChildrenComplete);
    
    // The fallback path should check the ignore tag
    // So linkChildrenComplete should be undefined (ignored file)
    expect(list[0].linkChildrenComplete).toBeUndefined();
  });
});
