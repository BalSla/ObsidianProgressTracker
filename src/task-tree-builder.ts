import * as fs from 'fs';
import * as path from 'path';
import { ParsedTaskNode, TaskTree } from './task-tree';

/**
 * Builds a TaskTree from an Obsidian markdown page by parsing tasks and recursively including linked pages.
 */
export class TaskTreeBuilder {
  private cache = new Set<string>();
  private rootDir: string;
  private ignoreTag: string;
  private fileStack: string[] = [];  // track current file recursion stack
  private hasFileCycle: boolean = false;

  private isPathInsideRoot(p: string): boolean {
    const rel = path.relative(this.rootDir, p);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  /**
   * @param rootDir Base directory for resolving relative paths (e.g., vault root in Obsidian).
   */
  constructor(rootDir?: string, ignoreTag: string = 'ignoretasktree') {
    // Normalize and resolve the root directory so comparisons are reliable
    this.rootDir = path.resolve(rootDir || process.cwd());
    this.ignoreTag = ignoreTag;
  }

  /**
   * Returns true if the given file contains the ignore tag.
   */
  public shouldIgnoreFile(filePath: string): boolean {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootDir, filePath);
    if (!this.isPathInsideRoot(absPath)) {
      return false;
    }
    if (!fs.existsSync(absPath)) {
      return false;
    }
    const content = fs.readFileSync(absPath, 'utf-8');
    return content.includes(`#${this.ignoreTag}`);
  }

  /**
   * Builds a TaskTree for the given markdown file path.
   * @param filePath Relative or absolute path to the markdown file.
   */
  public buildFromFile(filePath: string): TaskTree {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootDir, filePath);
    const absPath = path.normalize(resolved);

    const rel = path.relative(this.rootDir, absPath);
    const outsideRoot = rel.startsWith('..') || path.isAbsolute(rel);

    const isRootCall = this.fileStack.length === 0;
    if (isRootCall) {
      this.cache.clear();
      this.fileStack = [];
    }

    if (outsideRoot) {
      if (isRootCall) {
        throw new Error(`File outside rootDir: ${absPath}`);
      }
      return new TaskTree([]);
    }

    if (!fs.existsSync(absPath)) {
      if (isRootCall) {
        throw new Error(`File not found: ${absPath}`);
      }
      return new TaskTree([]);
    }
    if (this.cache.has(absPath)) {
      return new TaskTree([]);
    }
    this.cache.add(absPath);
    this.fileStack.push(absPath);

    const content = fs.readFileSync(absPath, 'utf-8');
    // ignore pages tagged to skip task tree
    if (content.includes(`#${this.ignoreTag}`)) {
      this.fileStack.pop();
      return new TaskTree([]);
    }
    const lines = content.split(/\r?\n/);
    const nodes = this.parseLines(lines, path.dirname(absPath));
    this.fileStack.pop();
    const tree = new TaskTree(nodes);
    return tree;
  }

  /**
   * Parses lines of markdown to extract tasks, respecting indentation and recursively handling links.
   */
  private parseLines(lines: string[], currentDir: string): ParsedTaskNode[] {
    const rootNodes: ParsedTaskNode[] = [];
    const stack: Array<{ indent: number; children: ParsedTaskNode[] }> = [
      { indent: -1, children: rootNodes },
    ];
    // Track linked pages within this file to avoid duplicate counting
    const linkedPagesInFile = new Set<string>();

    for (const line of lines) {
      const match = /^(\s*)- \[( |x|X)\] (.+)$/.exec(line);
      if (match) {
        // This is a task item
        const indent = match[1].length;
        const completed = match[2].toLowerCase() === 'x';
        const text = match[3];
        const node: ParsedTaskNode = { completed, children: [] };

        // Handle Obsidian links: [[PageName]] or [[PageName|Alias]]
        const linkMatch = /\[\[([^\]]+)\]\]/.exec(text);
        if (linkMatch) {
          // extract actual page name before any pipe alias
          const rawLink = linkMatch[1];
          const pageName = rawLink.split('|')[0].trim();
          // preserve .md extension if present
          const fileName = pageName.toLowerCase().endsWith('.md') ? pageName : `${pageName}.md`;
          const linkPath = path.resolve(currentDir, fileName);
          if (this.isPathInsideRoot(linkPath) && fs.existsSync(linkPath)) {
            // detect page link cycles by checking recursion stack
            if (this.fileStack.includes(linkPath)) {
              // Cycle detected: don't add children (treat as 0 additional tasks)
              // The task itself still counts, just the link contributes nothing
              node.children = [];
            } else if (linkedPagesInFile.has(linkPath)) {
              // Page already linked in this file: treat as leaf task (no children)
              // This prevents duplicate counting of tasks from the same linked page
              node.children = [];
            } else {
              // First time linking to this page in this file
              linkedPagesInFile.add(linkPath);
              const subtree = this.buildFromFile(linkPath);
              // Use private API of TaskTree to extract root nodes via reflection
              // @ts-ignore
              node.children = subtree['rootNodes'] || [];
            }
          }
        }

        // Determine the correct parent based on indentation
        while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
          stack.pop();
        }
        stack[stack.length - 1].children.push(node);
        stack.push({ indent, children: node.children });
      } else {
        // Check if this is a non-task list item (e.g., "- [[Link]]")
        const nonTaskMatch = /^(\s*)- (.+)$/.exec(line);
        if (nonTaskMatch) {
          const indent = nonTaskMatch[1].length;
          const text = nonTaskMatch[2];
          
          // Adjust stack to correct parent level based on indentation
          while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
          }
          
          // Handle Obsidian links in non-task items
          const linkMatch = /\[\[([^\]]+)\]\]/.exec(text);
          if (linkMatch) {
            // extract actual page name before any pipe alias
            const rawLink = linkMatch[1];
            const pageName = rawLink.split('|')[0].trim();
            // preserve .md extension if present
            const fileName = pageName.toLowerCase().endsWith('.md') ? pageName : `${pageName}.md`;
            const linkPath = path.resolve(currentDir, fileName);
            if (this.isPathInsideRoot(linkPath) && fs.existsSync(linkPath)) {
              // detect page link cycles by checking recursion stack
              if (!this.fileStack.includes(linkPath) && !linkedPagesInFile.has(linkPath)) {
                // Only include if not a cycle and not already linked in this file
                linkedPagesInFile.add(linkPath);
                const subtree = this.buildFromFile(linkPath);
                // @ts-ignore
                const linkedNodes = subtree['rootNodes'] || [];
                
                // Add all nodes from the linked file to the current parent
                for (const linkedNode of linkedNodes) {
                  stack[stack.length - 1].children.push(linkedNode);
                }
              } else if (this.fileStack.includes(linkPath)) {
                // Cycle detected, but for non-task items we just skip
                this.hasFileCycle = true;
              }
              // If linkedPagesInFile has it, we just skip (no error, no adding nodes)
            }
          }
          
          // Push the current parent's children array back onto the stack with this non-task item's indent
          // This ensures that items indented under it are added to the same parent, not to previous tasks
          stack.push({ indent, children: stack[stack.length - 1].children });
        }
      }
    }

    return rootNodes;
  }
}
