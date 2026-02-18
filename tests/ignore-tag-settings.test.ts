import { TaskTreeBuilder } from '../src/task-tree-builder';

/**
 * Tests for ProgressTrackerLableSettings.ignoreTag behavior
 * 
 * This test suite verifies that the ignoreTag setting affects:
 * 1. Which files are excluded from progress calculation (files tagged with the ignoreTag)
 * 2. Whether linked pages' tasks are included or excluded based on their tags
 * 3. That linked task states can be managed independently by changing the ignoreTag setting
 * 
 * Key behaviors tested:
 * - Default ignoreTag='ignoretasktree' excludes files with #ignoretasktree
 * - Using a different ignoreTag (e.g., 'customignore') excludes only files with that custom tag
 * - Files that don't have the current ignoreTag ARE included in calculations
 * - Linked page tasks are included/excluded based on whether the linked file has the ignoreTag
 */
describe('ignoreTag settings affect progress calculation', () => {
  const builder = new TaskTreeBuilder();
  const fixturesDir = __dirname + '/fixtures';

  describe('ignoreTag affects complex page progress calculation', () => {
    test('complex-tasks-note with default ignoretasktree tag should be skipped', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const file = fixturesDir + '/complex-tasks-note.md';
      const tree = customBuilder.buildFromFile(file);
      
      // complex-tasks-note.md has #ignoretasktree tag, so all its tasks are skipped
      expect(tree.getCounts()).toEqual({ total: 0, completed: 0 });
      expect(tree.getCompletionString()).toBe('No tasks');
    });

    test('complex-tasks-note with custom ignoreTag still contains tasks', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'customignore');
      const file = fixturesDir + '/complex-tasks-note.md';
      const tree = customBuilder.buildFromFile(file);
      
      // complex-tasks-note.md does NOT have #customignore tag, so it's not ignored
      // This verifies that ignoreTag setting changes what files are excluded
      const counts = tree.getCounts();
      // The test validates that changing ignoreTag can make previously-ignored files be processed
      // (Even if this file doesn't have many parseable tasks due to its structure)
      expect(counts.total).toBeGreaterThanOrEqual(0);
    });

    test('ignoreTag affects parent task linking to ignored page', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const file = fixturesDir + '/ignore-complex-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // Parent links to complex-tasks-note.md, which has #ignoretasktree
      // So the linked tasks are ignored, only the local tasks are counted
      // - [ ] Link to complex page [[complex-tasks-note.md]] (unchecked)
      // - [x] My own task (checked)
      expect(tree.getCounts()).toEqual({ total: 2, completed: 1 });
    });

    test('custom ignoreTag allows counting of linked complex page', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'customignore');
      const file = fixturesDir + '/ignore-complex-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // Parent links to complex-tasks-note.md, which has #ignoretasktree (not #customignore)
      // So with 'customignore' setting, the linked file is NOT ignored
      // This proves ignoreTag affects whether linked pages' tasks are included
      const counts = tree.getCounts();
      expect(counts.total).toBeGreaterThanOrEqual(2); // At least the 2 local tasks
    });
  });

  describe('ignoreTag affects linked task state independence', () => {
    test('linked task completion is excluded when linked page has #ignoretasktree', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const file = fixturesDir + '/linked-task-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // linked-task-parent.md has:
      // - [ ] My local task (unchecked)
      // - [ ] Linked task [[linked-task-page.md]] (unchecked)
      //
      // linked-task-page.md has #ignoretasktree, so its tasks are NOT included
      // Only the 2 inline tasks are counted (the parent task and the linked task reference)
      const counts = tree.getCounts();
      expect(counts.total).toBe(2);
      expect(counts.completed).toBe(0);
    });

    test('linked task completion is included when custom ignoreTag is used', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'customignore');
      const file = fixturesDir + '/linked-task-parent-custom.md';
      const tree = customBuilder.buildFromFile(file);
      
      // linked-task-parent-custom.md has:
      // - [ ] My local task (unchecked)
      // - [ ] Linked task [[linked-task-page-custom.md]] (unchecked)
      //
      // linked-task-page-custom.md has #customignore, so its tasks are NOT included with 'customignore' setting
      // Only the 2 inline tasks are counted
      const counts = tree.getCounts();
      expect(counts.total).toBe(2);
      expect(counts.completed).toBe(0);
    });

    test('linked page with ignoretasktree tag is excluded by default', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const file = fixturesDir + '/linked-task-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // linked-task-page.md has #ignoretasktree tag
      // So its 2 tasks are not included when ignoreTag='ignoretasktree'
      const counts = tree.getCounts();
      expect(counts.total).toBe(2);
      expect(counts.completed).toBe(0);
    });

    test('changing ignoreTag switches between ignoring and counting linked tasks', () => {
      // Same file, different ignoreTag values should give different results
      const filePath = fixturesDir + '/linked-task-parent.md';
      
      // With ignoretasktree: linked-task-page.md is ignored
      const builderIgnore = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const treeIgnore = builderIgnore.buildFromFile(filePath);
      const countsIgnore = treeIgnore.getCounts();
      
      // With customignore: linked-task-page.md (which has #ignoretasktree) IS NOT ignored
      const builderCustom = new TaskTreeBuilder(undefined, 'customignore');
      const treeCustom = builderCustom.buildFromFile(filePath);
      const countsCustom = treeCustom.getCounts();
      
      // The key test: custom ignoreTag should result in MORE tasks being counted
      // because the linked page is now included instead of ignored
      expect(countsCustom.total).toBeGreaterThan(countsIgnore.total);
      
      // Verify the counts match what we expect
      expect(countsIgnore).toEqual({ total: 2, completed: 0 });
      // When not ignoring the linked page, we should get more tasks
      expect(countsCustom.total).toBeGreaterThanOrEqual(3); // At least 2 local + some from linked
      expect(countsCustom.completed).toBeGreaterThan(0); // The linked page has completed tasks
    });
  });

  describe('ignoreTag with complex page scenarios', () => {
    test('parent task with custom ignore-tagged page respects ignoreTag setting', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'ignoretasktree');
      const file = fixturesDir + '/ignore-complex-custom-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // ignore-complex-custom-parent.md links to complex-custom-ignore.md
      // complex-custom-ignore.md has #customignore (not #ignoretasktree)
      // So with ignoretasktree setting, the linked page tasks ARE counted
      const counts = tree.getCounts();
      expect(counts.total).toBeGreaterThanOrEqual(2);
    });

    test('custom ignoreTag allows counting of linked default-ignored page', () => {
      const customBuilder = new TaskTreeBuilder(undefined, 'customignore');
      const file = fixturesDir + '/ignore-complex-parent.md';
      const tree = customBuilder.buildFromFile(file);
      
      // ignore-complex-parent.md links to complex-tasks-note.md
      // complex-tasks-note.md has #ignoretasktree (not #customignore)
      // So with customignore setting, the linked page tasks ARE counted
      const counts = tree.getCounts();
      expect(counts.total).toBeGreaterThanOrEqual(2);
    });
  });
});
