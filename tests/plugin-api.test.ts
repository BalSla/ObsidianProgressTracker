jest.mock('obsidian');
import ProgressTrackerLablePlugin from '../main';
import * as path from 'path';

const manifest = {
  id: 'obsidian-progress-tracker',
  name: 'Progress Tracker',
  version: '1.0.0',
  minAppVersion: '0.15.0',
  description: '',
};

const defaultSettings = {
  mySetting: 'default',
  inlineFieldName: 'COMPLETE',
  representation: 'Complete {percentage}% ({completed}/{total})',
  ignoreTag: 'ignoretasktree',
};

describe('ProgressTrackerLablePlugin.getPageProgress', () => {
  const fixtures = path.join(__dirname, 'fixtures');
  const app: any = { vault: { adapter: { basePath: fixtures } } };
  const plugin = new ProgressTrackerLablePlugin(app, manifest as any);
  plugin.settings = { ...defaultSettings } as any;

  test('computes progress percentage for a note', () => {
    const percent = plugin.getPageProgress('simple.md');
    expect(percent).toBe(50);
  });
});
