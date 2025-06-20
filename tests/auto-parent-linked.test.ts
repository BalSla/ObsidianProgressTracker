import * as fs from 'fs';
import * as path from 'path';
import { parseTasks, updateParentStatuses } from '../src/auto-parent';

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

describe('parsed tasks inf tests', () => {
  test('parsed tasks linkChildrenComplete is undefined if task linked to an empty page', () => {
    const content = `- [ ] [[no-tasks]]
    `;
    const lines = content.split(/\r?\n/);
    const list = parseTasks(lines, undefined, undefined);
    expect(list.length).toBe(1);
    expect(list[0].completed).toBe(false);
    expect(list[0].linkChildrenComplete).toBe(undefined);
  });

    test('parsed tasks linkChildrenComplete is undefined if task linked to a missing page', () => {
    const content = `- [ ] [[missing-page]]
    `;
    const lines = content.split(/\r?\n/);
    const list = parseTasks(lines, undefined, undefined);
    expect(list.length).toBe(1);
    expect(list[0].completed).toBe(false);
    expect(list[0].linkChildrenComplete).toBe(undefined);
  });

  test('parsed tasks linkChildrenComplete is true if tasks linked page are completed', () => {
    const content = `- [ ] [[subpage-complete]]
    `;
    const lines = content.split(/\r?\n/);
    const list = parseTasks(lines, path.join(__dirname, 'fixtures'));
    expect(list.length).toBe(1);
    expect(list[0].completed).toBe(false);
    expect(list[0].linkChildrenComplete).toBe(true);
  });

  test('parsed tasks linkChildrenComplete is false if tasks on linked page are not completed', () => {
    const content = `- [ ] [[subpage]]
    `;
    const lines = content.split(/\r?\n/);
    const list = parseTasks(lines, path.join(__dirname, 'fixtures'));
    expect(list.length).toBe(1);
    expect(list[0].completed).toBe(false);
    expect(list[0].linkChildrenComplete).toBe(false);
  });

});
