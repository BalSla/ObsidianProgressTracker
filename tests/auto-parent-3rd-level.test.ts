import { updateParentStatuses } from '../src/auto-parent';
import * as fs from 'fs';
import * as path from 'path';

describe('updateParentStatuses 3rd level', () => {
  const root = path.join(__dirname, 'fixtures');
  const filePath = path.join(root, '3rd-level.md');

  function readContent() {
    return fs.readFileSync(filePath, 'utf8');
  }

  test('checking 3rd level task checks all parents', () => {
    let content = readContent();
    // Simulate checking the 3rd level task
    content = content.replace('- [ ] 3rd level', '- [x] 3rd level');
    const result = updateParentStatuses(content, undefined, filePath, root);
    console.log('Result content after checking 3rd level:', result.content);
    // All should be checked
    expect(result.content).toContain('- [x] Explore map with [[empty link]]');
    expect(result.content).toContain('- [x] Test that scout explore map around the base');
    expect(result.content).toContain('- [x] 3rd level');
    // The unrelated checked task should remain checked
    expect(result.content).toContain('- [x] Is it possible to manage exploration?. Yes.');
  });

  test('unchecking 3rd level task unchecks all parents', () => {
    let content = readContent();
    // Simulate all checked first
    content = content.replace('- [ ] Explore map with [[empty link]]', '- [x] Explore map with [[empty link]]')
      .replace('- [ ] Test that scout explore map around the base', '- [x] Test that scout explore map around the base')
      .replace('- [ ] 3rd level', '- [x] 3rd level');
    // Now uncheck the 3rd level
    content = content.replace('- [x] 3rd level', '- [ ] 3rd level');
    const result = updateParentStatuses(content, undefined, filePath, root);
    // All should be unchecked except the unrelated checked task
    expect(result.content).toContain('- [ ] Explore map with [[empty link]]');
    expect(result.content).toContain('- [ ] Test that scout explore map around the base');
    expect(result.content).toContain('- [ ] 3rd level');
    expect(result.content).toContain('- [x] Is it possible to manage exploration?. Yes.');
  });
});
