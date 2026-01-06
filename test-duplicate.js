const { TaskTreeBuilder } = require('./src/task-tree-builder.ts');
const path = require('path');

// Quick test to see current behavior
const builder = new TaskTreeBuilder();
const file = __dirname + '/tests/fixtures/duplicate-link.md';
const tree = builder.buildFromFile(file);
const counts = tree.getCounts();
console.log('Current behavior:');
console.log('Total:', counts.total, 'Completed:', counts.completed);
console.log('Completion string:', tree.getCompletionString());
console.log('\nExpected behavior (if fixed):');
console.log('Total: 4, Completed: 2');
console.log('(Task 1 with subpage tasks counted once, Task 2 with same subpage tasks counted once, Task 3 completed)');
