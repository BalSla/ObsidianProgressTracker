jest.mock('obsidian');
import ProgressTrackerLablePlugin from '../main';
import * as path from 'path';
import { App, PluginManifest, Vault } from 'obsidian';

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
  autoPropagateTaskStates: false,
};

describe('ProgressTrackerLablePlugin.getPageProgress', () => {
  const fixtures = path.join(__dirname, 'fixtures');
  const vault = new Vault(fixtures);
  const app = { vault } as unknown as App;
  const plugin = new ProgressTrackerLablePlugin(app, manifest as PluginManifest);
  plugin.settings = { ...defaultSettings };
  (plugin as any).app.vault.adapter.getBasePath = () => fixtures;

  test('computes progress percentage for a note', () => {
    expect(vault.adapter.getBasePath()).toBe(fixtures);
    const percent = plugin.getPageProgress(path.join(fixtures, 'simple.md'));
    expect(percent).toBe(50);
  });
});
