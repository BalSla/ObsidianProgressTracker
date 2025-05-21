import * as fs from 'fs';
import * as path from 'path';
import { ParsedTaskNode, TaskTree } from './task-tree';

/**
 * Builds a TaskTree from an Obsidian markdown page by parsing tasks and recursively including linked pages.
 */
export class TaskTreeBuilder {
  private cache = new Set<string>();

  /**
   * Builds a TaskTree for the given markdown file path.
   * @param filePath Relative or absolute path to the markdown file.
   */
  public buildFromFile(filePath: string): TaskTree {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }
    if (this.cache.has(absPath)) {
      return new TaskTree([]);
    }
    this.cache.add(absPath);

    const content = fs.readFileSync(absPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const nodes = this.parseLines(lines, path.dirname(absPath));
    return new TaskTree(nodes);
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

      // Handle linked pages: [[PageName]]
      const linkMatch = /\[\[([^\]]+)\]\]/.exec(text);
      if (linkMatch) {
        const linkName = linkMatch[1];
        const linkPath = path.resolve(currentDir, `${linkName}.md`);
        if (fs.existsSync(linkPath)) {
          const subtree = this.buildFromFile(linkPath);
          // Use private API of TaskTree to extract root nodes via reflection
          // @ts-ignore
          node.children = subtree['rootNodes'] || [];
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
