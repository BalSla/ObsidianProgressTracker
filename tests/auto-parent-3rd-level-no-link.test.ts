import { updateParentStatuses } from '../src/auto-parent';
import * as fs from 'fs';
import * as path from 'path';

describe('updateParentStatuses 3rd level (no link in parent)', () => {
  const root = path.join(__dirname, 'fixtures');
  const filePath = path.join(root, '3rd-level-no-link.md');

  beforeAll(() => {
    fs.writeFileSync(filePath, [
      '- [ ] Explore map',
      '    - [ ] Test that scout explore map around the base',
      '        - [ ] 3rd level',
      '    - [x] Is it possible to manage exploration?. Yes.',
      ''
    ].join('\n'));
  });

  afterAll(() => {
    fs.unlinkSync(filePath);
  });

  function readContent() {
    return fs.readFileSync(filePath, 'utf8');
  }

  test('checking 3rd level task checks all parents (no link)', () => {
    let content = readContent();
    content = content.replace('- [ ] 3rd level', '- [x] 3rd level');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content).toContain('- [x] Explore map');
    expect(result.content).toContain('- [x] Test that scout explore map around the base');
    expect(result.content).toContain('- [x] 3rd level');
    expect(result.content).toContain('- [x] Is it possible to manage exploration?. Yes.');
  });

  test('unchecking 3rd level task unchecks all parents (no link)', () => {
    let content = readContent();
    content = content.replace('- [ ] Explore map', '- [x] Explore map')
      .replace('- [ ] Test that scout explore map around the base', '- [x] Test that scout explore map around the base')
      .replace('- [ ] 3rd level', '- [x] 3rd level');
    content = content.replace('- [x] 3rd level', '- [ ] 3rd level');
    const result = updateParentStatuses(content, undefined, filePath, root);
    expect(result.content).toContain('- [ ] Explore map');
    expect(result.content).toContain('- [ ] Test that scout explore map around the base');
    expect(result.content).toContain('- [ ] 3rd level');
    expect(result.content).toContain('- [x] Is it possible to manage exploration?. Yes.');
  });
});
