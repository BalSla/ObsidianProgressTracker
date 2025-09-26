import { updateParentStatuses } from '../src/auto-parent';

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
