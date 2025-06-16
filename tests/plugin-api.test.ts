jest.mock('obsidian');
import ProgressTrackerLablePlugin from '../main';
import * as path from 'path';
import { App, PluginManifest, FileSystemAdapter } from 'obsidian';

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
  const app = { vault: { adapter: new FileSystemAdapter(fixtures) } } as unknown as App;
  const plugin = new ProgressTrackerLablePlugin(app, manifest as PluginManifest);
  plugin.settings = { ...defaultSettings };

  test('computes progress percentage for a note', () => {
    const percent = plugin.getPageProgress('simple.md');
    expect(percent).toBe(50);
  });
});
