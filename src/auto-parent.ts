import * as fs from 'fs';
import * as path from 'path';
import { TaskTreeBuilder } from './task-tree-builder';

export interface ParsedTaskInfo {
  line: number;
  indent: number;
  completed: boolean;
  parent?: ParsedTaskInfo;
  children: ParsedTaskInfo[];
  /** True if all linked pages' tasks are complete */
  linkChildrenComplete?: boolean;
  changed?: boolean;
}

export interface UpdateResult {
  content: string;
  state: Map<number, boolean>;
}

function parseTasks(
  lines: string[],
  currentDir?: string,
  builder?: TaskTreeBuilder
): ParsedTaskInfo[] {
  const tasks: ParsedTaskInfo[] = [];
  const stack: Array<{ indent: number; task?: ParsedTaskInfo }> = [
    { indent: -1, task: undefined },
  ];

  for (let i = 0; i < lines.length; i++) {
    // Normalize tabs to 4 spaces for consistent indentation
    const normalizedLine = lines[i].replace(/\t/g, '    ');
    const match = /^(\s*)- \[( |x|X)\](.*)$/.exec(normalizedLine);
    if (!match) continue;
    const indent = match[1].length;
    const completed = match[2].toLowerCase() === 'x';
    const text = match[3] || '';
    const task: ParsedTaskInfo = {
      line: i,
      indent,
      completed,
      children: [],
    };

    if (builder && currentDir) {
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      const matches = text.matchAll(linkRegex);
      let hasLink = false;
      let allLinkComplete = true;
      for (const m of matches) {
        hasLink = true;
        const rawLink = m[1];
        const pageName = rawLink.split('|')[0].trim();
        if (!pageName) continue; // skip empty links
        const fileName = pageName.toLowerCase().endsWith('.md')
          ? pageName
          : `${pageName}.md`;
        const linkPath = path.resolve(currentDir, fileName);
        if (fs.existsSync(linkPath)) {
          if (builder.shouldIgnoreFile(linkPath)) {
            continue;
          }
          try {
            const tree = builder.buildFromFile(linkPath);
            const counts = tree.getCounts();
            const complete = counts.total > 0 && counts.total === counts.completed;
            if (!complete) allLinkComplete = false;
          } catch {
            allLinkComplete = false;
          }
        } // If file does not exist, treat as complete (do not block parent)
      }
      if (hasLink) {
        task.linkChildrenComplete = allLinkComplete;
      }
    }

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].task;
    if (parent) {
      task.parent = parent;
      parent.children.push(task);
    }
    tasks.push(task);
    stack.push({ indent, task });
  }

  return tasks;
}

export function updateParentStatuses(
  content: string,
  prevState?: Map<number, boolean>,
  filePath?: string,
  rootDir?: string,
  ignoreTag: string = 'ignoretasktree'
): UpdateResult {
  // Normalize tabs to 4 spaces in the content before splitting into lines
  content = content.replace(/\t/g, '    ');
  let lines = content.split(/\r?\n/);
  let builder: TaskTreeBuilder | undefined = undefined;
  let dir: string | undefined = undefined;
  if (filePath && rootDir) {
    dir = path.dirname(path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath));
    builder = new TaskTreeBuilder(rootDir, ignoreTag);
  }
  let tasks = parseTasks(lines, dir, builder);

  if (prevState) {
    for (const t of tasks) {
      const prev = prevState.get(t.line);
      if (prev !== undefined && prev !== t.completed) {
        t.changed = true;
      }
    }
  }

  let changed;
  let loopCount = 0;
  do {
    changed = false;
    const sorted = tasks.slice().sort((a, b) => b.indent - a.indent);
    for (const t of sorted) {
      console.log('Before update', {
        line: t.line,
        indent: t.indent,
        completed: t.completed,
        children: t.children.map(c => ({ line: c.line, completed: c.completed })),
        changed: t.changed
      });
      if (t.children.length === 0 && t.linkChildrenComplete === undefined) continue;
      if (t.changed) continue; // skip manually changed parents
      const childrenComplete = t.children.every((c) => c.completed);
      const linksComplete = t.linkChildrenComplete ?? true;
      const newVal = childrenComplete && linksComplete;
      if (t.completed !== newVal) {
        lines[t.line] = lines[t.line].replace(
          /^(\s*- \[)( |x|X)(\])/,
          `$1${newVal ? 'x' : ' '}$3`
        );
        t.completed = newVal;
        changed = true;
        console.log('Updated line', t.line, lines[t.line]);
      }
    }
    // re-parse tasks to update parent/child relationships
    const prevLines = lines.join('\n');
    tasks = parseTasks(lines, dir, builder);
    loopCount++;
    if (changed) {
      console.log('After update loop', loopCount, lines.join('\n'));
      // Print all tasks after update
      for (const t of tasks) {
        console.log('Task after update', {
          line: t.line,
          indent: t.indent,
          completed: t.completed,
          children: t.children.map(c => ({ line: c.line, completed: c.completed })),
          changed: t.changed
        });
      }
    }
    // If any line changed, force another loop
    if (lines.join('\n') !== prevLines) {
      changed = true;
    }
  } while (changed);

  const newState = new Map<number, boolean>();
  for (const t of tasks) {
    newState.set(t.line, t.completed);
  }

  return { content: lines.join('\n'), state: newState };
}
