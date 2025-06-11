import * as fs from 'fs';
import * as path from 'path';
import { ParsedTaskNode, TaskTree } from './task-tree';

// Subclass TaskTree to override completion string based on file link cycles
class BuilderTaskTree extends TaskTree {
  constructor(rootNodes: ParsedTaskNode[], private fileHasCycle: boolean) {
    super(rootNodes);
  }
  public getCounts(): import('./task-tree').TaskCounts {
    // Return zeros if a page-link cycle was detected
    if (this.fileHasCycle) {
      return { total: 0, completed: 0 };
    }
    return super.getCounts();
  }
  public getCompletionString(): string {
    // Delegate to base implementation
    const base = super.getCompletionString();
    // Append error icon if file-level cycle detected
    if (this.fileHasCycle && !base.endsWith(' ❗')) {
      return base + ' ❗';
    }
    return base;
  }
}

/**
 * Builds a TaskTree from an Obsidian markdown page by parsing tasks and recursively including linked pages.
 */
export class TaskTreeBuilder {
  private cache = new Set<string>();
  private rootDir: string;
  private ignoreTag: string;
  private hasFileCycle: boolean = false;  // flag for cycle in page links
  private fileStack: string[] = [];  // track current file recursion stack

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
      this.hasFileCycle = false;
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
      return new BuilderTaskTree([], false);
    }
    const lines = content.split(/\r?\n/);
    const nodes = this.parseLines(lines, path.dirname(absPath));
    this.fileStack.pop();
    // Use BuilderTaskTree to reflect file link cycle in completion string
    const tree = new BuilderTaskTree(nodes, isRootCall && this.hasFileCycle);
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

    for (const line of lines) {
      const match = /^(\s*)- \[( |x|X)\] (.+)$/.exec(line);
      if (!match) {
        continue;
      }
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
            // set file-level cycle flag
            this.hasFileCycle = true;
            // create self-cycle to trigger TaskTree cycle detection if needed
            node.children = [node];
          } else {
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
    }

    return rootNodes;
  }
}
