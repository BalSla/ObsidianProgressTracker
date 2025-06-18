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

  test('does not change manually toggled parent', () => {
    let content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', true);

    content = [
      '- [x] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, result.state, undefined, undefined, 'ignoretasktree', true);
    expect(result.content).toBe(content);
  });
});
