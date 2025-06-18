import { updateParentStatuses } from '../src/auto-parent';

describe('updateParentStatuses (autoPropagateTaskStates = false)', () => {
  test('does not check or uncheck parent when disabled', () => {
    let content = [
      '- [ ] Parent',
      '  - [x] Child1',
      '  - [x] Child2',
    ].join('\n');
    let result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', false);
    // Parent should remain unchecked
    expect(result.content).toBe(content);

    content = [
      '- [x] Parent',
      '  - [ ] Child1',
      '  - [x] Child2',
    ].join('\n');
    result = updateParentStatuses(content, undefined, undefined, undefined, 'ignoretasktree', false);
    // Parent should remain checked
    expect(result.content).toBe(content);
  });
});
