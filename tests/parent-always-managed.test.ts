import { updateParentStatuses } from '../src/auto-parent';

describe('Parent tasks are always managed (no independent management)', () => {
  test('parent is always checked when all children complete, regardless of manual changes', () => {
    let content = [
      '- [ ] Parent',
      '  - [ ] Child1',
      '  - [ ] Child2',
    ].join('\n');
    
    // Initial state - nothing complete
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content); // No change expected
    
    // Complete first child - parent should remain unchecked
    content = [
      '- [ ] Parent', 
      '  - [x] Child1',
      '  - [ ] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content); // Parent still unchecked
    
    // Complete second child - parent should automatically become checked
    content = [
      '- [ ] Parent',
      '  - [x] Child1', 
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );
    
    // Manually uncheck parent - it should be corrected back to checked
    content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2', 
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );
  });

  test('parent is always unchecked when any child incomplete, regardless of manual changes', () => {
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    // All complete initially
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content);
    
    // Uncheck one child - parent should automatically become unchecked
    content = [
      '- [x] Parent',
      '  - [ ] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(
      ['- [ ] Parent', '  - [ ] Child1', '  - [x] Child2'].join('\n')
    );
    
    // Manually check parent - it should be corrected back to unchecked
    content = [
      '- [x] Parent',
      '  - [ ] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(
      ['- [ ] Parent', '  - [ ] Child1', '  - [x] Child2'].join('\n')
    );
  });

  test('autoPropagateTaskStates=false still disables all auto-management', () => {
    let content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    
    // With auto-propagation disabled, parent should never change
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', false);
    expect(result.content).toBe(content);
    
    // Manually check parent
    content = [
      '- [x] Parent',
      '  - [x] Child1', 
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', false);
    expect(result.content).toBe(content); // Should remain as-is
  });
});