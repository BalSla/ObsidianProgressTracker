import { updateParentStatuses } from '../src/auto-parent';

describe('New task auto-check issue', () => {
  test('newly created child task should not be auto-checked', () => {
    // Start with a parent that has all children completed
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    
    // Now simulate adding a new unchecked child task
    content = [
      '- [x] Parent',
      '  - [x] Child1', 
      '  - [x] Child2',
      '  - [ ] New child task',  // This should remain unchecked
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // The new child task should remain unchecked
    // The parent should become unchecked because not all children are complete
    const expectedContent = [
      '- [ ] Parent',              // Parent should be unchecked
      '  - [x] Child1',
      '  - [x] Child2', 
      '  - [ ] New child task',    // New task should remain unchecked
    ].join('\n');
    
    expect(result.content).toBe(expectedContent);
  });

  test('newly created child task in multi-level hierarchy should not be auto-checked', () => {
    // Start with a nested hierarchy where all tasks are completed
    let content = [
      '- [x] Level 1',
      '  - [x] Level 2A',
      '    - [x] Level 3A',
      '    - [x] Level 3B',
      '  - [x] Level 2B',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    
    // Add a new task at level 3 under Level 2A
    content = [
      '- [x] Level 1',
      '  - [x] Level 2A',
      '    - [x] Level 3A',
      '    - [x] Level 3B',
      '    - [ ] New Level 3C',     // This should remain unchecked
      '  - [x] Level 2B',
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // The new task should remain unchecked
    // Level 2A and Level 1 should become unchecked due to the new incomplete child
    const expectedContent = [
      '- [ ] Level 1',             // Should be unchecked
      '  - [ ] Level 2A',          // Should be unchecked  
      '    - [x] Level 3A',
      '    - [x] Level 3B',
      '    - [ ] New Level 3C',    // Should remain unchecked
      '  - [x] Level 2B',
    ].join('\n');
    
    expect(result.content).toBe(expectedContent);
  });

  test('inserting task in middle of list with line number shifts', () => {
    // Start with tasks where all are completed
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [x] Child3',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    
    // Log the initial state for debugging
    console.log('Initial state:', Array.from(result.state.entries()));
    
    // Simulate inserting a new task between Child1 and Child2
    // This shifts line numbers: Child2 moves from line 2 to line 3, Child3 from line 3 to line 4
    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [ ] New Child',      // Inserted at line 2
      '  - [x] Child2',         // Shifted to line 3  
      '  - [x] Child3',         // Shifted to line 4
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // Log the final state and content for debugging
    console.log('Final state:', Array.from(result.state.entries()));
    console.log('Final content:', result.content);
    
    // The new task should remain unchecked
    // Parent should become unchecked due to incomplete child
    const expectedContent = [
      '- [ ] Parent',           // Should be unchecked
      '  - [x] Child1',
      '  - [ ] New Child',      // Should remain unchecked
      '  - [x] Child2',
      '  - [x] Child3',
    ].join('\n');
    
    expect(result.content).toBe(expectedContent);
  });

  test('debug state tracking when inserting task', () => {
    // Start with a simple case
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    console.log('Initial state:', Array.from(result.state.entries()));
    
    // Insert a new task in the middle
    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [ ] New Child',
      '  - [x] Child2',
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    console.log('After insert - Final state:', Array.from(result.state.entries()));
    console.log('After insert - Content:', result.content);
    
    // Just check that the function doesn't crash and produces some result
    expect(result.content).toBeDefined();
  });

  test('newly created task with link should not be auto-checked', () => {
    // Start with completed tasks
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    
    // Add a new task with a link
    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [ ] New task with [[link]]',
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // The new task should remain unchecked
    const expectedContent = [
      '- [ ] Parent',                    // Should be unchecked
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [ ] New task with [[link]]', // Should remain unchecked
    ].join('\n');
    
    expect(result.content).toBe(expectedContent);
  });

  test('potential edge case: new task with parent that has changed flag', () => {
    // Start with a scenario that might trigger the issue
    let content = [
      '- [ ] Parent',       // Parent starts unchecked
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    
    // Manually toggle parent to checked (simulating user action)
    content = [
      '- [x] Parent',       // User manually checks parent  
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // Now add a new unchecked child - this might be the problematic scenario
    content = [
      '- [x] Parent',       // Parent was manually checked
      '  - [x] Child1',
      '  - [x] Child2', 
      '  - [ ] New Child',  // New unchecked task added
    ].join('\n');
    
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    
    // Parent should become unchecked (auto propagation from children)
    // But the new child should remain unchecked
    const expectedContent = [
      '- [ ] Parent',       // Should be auto-unchecked
      '  - [x] Child1',
      '  - [x] Child2',
      '  - [ ] New Child',  // Should remain unchecked
    ].join('\n');
    
    expect(result.content).toBe(expectedContent);
  });
});