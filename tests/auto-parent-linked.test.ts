import * as fs from 'fs';
import * as path from 'path';
import { updateParentStatuses } from '../src/auto-parent';

describe('updateParentStatuses with links', () => {
  const root = path.join(__dirname, 'fixtures');

  test('checks parent when linked page tasks complete', () => {
    const filePath = path.join(root, 'main-linked-complete.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content.trim()).toBe('- [x] Parent Task [[subpage-complete]]');
  });

  test('unchecks parent when linked page has incomplete tasks', () => {
    const filePath = path.join(root, 'main-checked.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content.trim()).toBe('- [ ] Parent Task [[subpage]]');
  });

  test('ignores linked page with custom ignore tag', () => {
    const filePath = path.join(root, 'ignore-custom-start.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const result = updateParentStatuses(content, undefined, filePath, root, 'customignore');
    expect(result.content.trim()).toBe('- [x] Parent Task [[ignore-custom]]');
  });

  test('leaves parent unchecked when linked page is missing', () => {
    const content = `- [ ] 1st level [[page-without-tasks]]
    - [ ] 2nd level
        - [x] 3rd level
    - [x] completed task`;
    const filePath = path.join(root, 'dummy.md');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content.split(/\r?\n/)[0]).toBe('- [ ] 1st level [[page-without-tasks]]');
  });

  test('leaves parent unchecked when linked page has no tasks', () => {
    const content = `- [ ] 1st level [[no-tasks]]
    - [ ] 2nd level
        - [x] 3rd level
    - [x] completed task`;
    const filePath = path.join(root, 'dummy.md');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content.split(/\r?\n/)[0]).toBe('- [ ] 1st level [[no-tasks]]');
  });
});
