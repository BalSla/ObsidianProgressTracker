import { updateParentStatuses, parseTasks } from '../src/auto-parent';

describe('updateParentStatuses', () => {
  test('checks parent when all children complete', () => {
    let content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [ ] Child2',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content);

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

  test('unchecks parent when any child incomplete', () => {
    let content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content);

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

  test('always updates parent to match children state', () => {
    let content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    // Parent should be checked since all children are complete
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );

    // Now manually toggle the parent to unchecked, but it should be corrected back to checked
    content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    // Parent should be checked again since children are still complete
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );
  });
});

describe ('auto-parent with mixed lists', () => {
  test('handles mixed list with tasks and non-task items', () => {
    let content = [
      '- [ ] Task 1',
      '- [[B]]',
      '    - [x] Task 2 under B',
      '    - [x] Task 3 under B',
      '- [ ] Task 4',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);
    let expected = [
      '- [ ] Task 1',
      '- [[B]]',
      '    - [x] Task 2 under B',
      '    - [x] Task 3 under B',
      '- [ ] Task 4',
    ].join('\n');
    expect(result.content).toBe(expected);
  });
});

describe('indent change detection via parseTasks', () => {
  test('detects indent change when child is moved to same level', () => {
    // Initial state: Task2 is a child of Task1
    const linesWithChild = [
      '- [ ] Task1',
      '  - [x] Task2',
    ];
    // After de-indent: Task2 is now at the same level as Task1
    const linesFlattened = [
      '- [ ] Task1',
      '- [x] Task2',
    ];

    const tasksChild = parseTasks(linesWithChild);
    const tasksFlattened = parseTasks(linesFlattened);

    // Line numbers and completion states are identical
    expect(tasksChild[0].line).toBe(tasksFlattened[0].line);
    expect(tasksChild[1].line).toBe(tasksFlattened[1].line);
    expect(tasksChild[0].completed).toBe(tasksFlattened[0].completed);
    expect(tasksChild[1].completed).toBe(tasksFlattened[1].completed);

    // But indent values differ, so the cache should detect the change
    expect(tasksChild[1].indent).toBe(2);
    expect(tasksFlattened[1].indent).toBe(0);
    expect(tasksChild[1].indent).not.toBe(tasksFlattened[1].indent);
  });

  test('parent state updates correctly after child is moved to same level and back', () => {
    // Initial: both tasks complete, parent should be checked
    const initial = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    let result = updateParentStatuses(initial, undefined, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );

    // Child2 is moved to same level (de-indented), breaking parent-child relationship
    const flattened = [
      '- [x] Parent',
      '  - [x] Child1',
      '- [x] Child2',
    ].join('\n');
    result = updateParentStatuses(flattened, result.state, undefined, undefined, 'ignoretasktree', true);
    // Parent now only has Child1 as a real child (Child2 is a sibling)
    // Parent should remain checked since Child1 is complete
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '- [x] Child2'].join('\n')
    );

    // Child2 is moved back to child level
    const restored = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(restored, result.state, undefined, undefined, 'ignoretasktree', true);
    // Parent should still be checked since all children complete
    expect(result.content).toBe(
      ['- [x] Parent', '  - [x] Child1', '  - [x] Child2'].join('\n')
    );
  });
});
