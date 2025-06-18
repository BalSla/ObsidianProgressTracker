import * as fs from 'fs';
import * as path from 'path';
import { updateParentStatuses } from '../src/auto-parent';

describe('updateParentStatuses with links', () => {
  const root = path.join(__dirname, 'fixtures');

  test('checks parent when linked page tasks complete', () => {
    const filePath = path.join(root, 'main-linked-complete.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    expect(result.content.trim()).toBe('- [x] Parent Task [[subpage-complete]]');
  });

  test('unchecks parent when linked page has incomplete tasks', () => {
    const filePath = path.join(root, 'main-checked.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root, 'ignoretasktree', true);
    expect(result.content.trim()).toBe('- [ ] Parent Task [[subpage]]');
  });

  test('ignores linked page with custom ignore tag', () => {
    const filePath = path.join(root, 'ignore-custom-start.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root, 'customignore', true);
    expect(result.content.trim()).toBe('- [x] Parent Task [[ignore-custom]]');
  });

  test('checks parent when all subtasks are complete and linked page is not existin', () => {
    const content = `- [ ] 1st level [[page-without-tasks]]
    - [ ] 2nd level
        - [x] 3rd level
    - [x] completed task`;
    const result = updateParentStatuses(content, undefined, undefined, root, 'ignoretasktree', true);
    expect(result.content.split(/\r?\n/)[0]).toBe('- [x] 1st level [[page-without-tasks]]');
  });

    test('checks parent when all subtasks are complete and linked page does not have tasks', () => {
    const content = `- [ ] 1st level [[no-tasks]]
    - [ ] 2nd level
        - [x] 3rd level
    - [x] completed task`;
    const result = updateParentStatuses(content, undefined, undefined, root, 'ignoretasktree', true);
    expect(result.content.split(/\r?\n/)[0]).toBe('- [x] 1st level [[no-tasks]]');
  });
});
