import { TaskTreeBuilder } from '../src/task-tree-builder';

describe('Inspect current behavior', () => {
  test('inspect duplicate-link structure', () => {
    const builder = new TaskTreeBuilder();
    const file = __dirname + '/fixtures/duplicate-link.md';
    const tree: any = builder.buildFromFile(file);
    const roots = tree['rootNodes'];
    
    console.log('\n=== Root nodes count:', roots.length);
    roots.forEach((node: any, i: number) => {
      console.log(`\nRoot ${i}:`, {
        completed: node.completed,
        childrenCount: node.children.length
      });
      if (node.children.length > 0) {
        node.children.forEach((child: any, j: number) => {
          console.log(`  Child ${j}:`, {
            completed: child.completed,
            childrenCount: child.children.length
          });
        });
      }
    });
    
    const counts = tree.getCounts();
    console.log('\nTotal:', counts.total, 'Completed:', counts.completed);
  });
  
  test('inspect subpage structure', () => {
    const builder = new TaskTreeBuilder();
    const file = __dirname + '/fixtures/subpage.md';
    const tree: any = builder.buildFromFile(file);
    const roots = tree['rootNodes'];
    
    console.log('\n=== Subpage root nodes count:', roots.length);
    roots.forEach((node: any, i: number) => {
      console.log(`Root ${i}:`, {
        completed: node.completed,
        childrenCount: node.children.length
      });
    });
    
    const counts = tree.getCounts();
    console.log('Subpage Total:', counts.total, 'Completed:', counts.completed);
  });
});
