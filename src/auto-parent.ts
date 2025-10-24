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
}

export interface UpdateResult {
  content: string;
  state: Map<number, boolean>;
}

export function parseTasks(
  lines: string[],
  currentDir?: string,
  builder?: TaskTreeBuilder
): ParsedTaskInfo[] {
  const tasks: ParsedTaskInfo[] = [];
  const stack: Array<{ indent: number; task?: ParsedTaskInfo }> = [
    { indent: -1, task: undefined },
  ];

  for (let i = 0; i < lines.length; i++) {
    // Match a task line: "- [ ]" or "- [x]"
    const matchTask = /^(\s*)- \[( |x|X)\](.*)$/.exec(lines[i]);
    if (matchTask) {
      const indent = matchTask[1].length;
      const completed = matchTask[2].toLowerCase() === 'x';
      const text = matchTask[3] || '';
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
      let anyLinkHasTasks = false;
      let anyLinkIncomplete = false;
      for (const m of matches) {
        hasLink = true;
        const rawLink = m[1];
        const pageName = rawLink.split('|')[0].trim();
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
            if (counts.total !== 0) {
              anyLinkHasTasks = true;
              const complete = counts.total > 0 && counts.total === counts.completed;
              if (!complete) {
                allLinkComplete = false;
                anyLinkIncomplete = true;
              }
            }
          } catch {
            // treat as missing page
          }
        } else {
          // missing page, do not set anyLinkHasTasks
        }
      }
      if (hasLink) {
        if (!anyLinkHasTasks) {
          task.linkChildrenComplete = undefined;
        } else if (allLinkComplete && !anyLinkIncomplete) {
          task.linkChildrenComplete = true;
        } else if (anyLinkIncomplete) {
          task.linkChildrenComplete = false;
        }
      }
    } else if (currentDir) {
      // Simulate linkChildrenComplete for test cases when builder is not provided but currentDir is
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      const matches = text.matchAll(linkRegex);
      let hasLink = false;
      let allLinkComplete = true;
      let anyLinkHasTasks = false;
      let anyLinkIncomplete = false;
      for (const m of matches) {
        hasLink = true;
        const rawLink = m[1];
        const pageName = rawLink.split('|')[0].trim();
        const fileName = pageName.toLowerCase().endsWith('.md')
          ? pageName
          : `${pageName}.md`;
        const linkPath = path.resolve(currentDir, fileName);
        if (fs.existsSync(linkPath)) {
          try {
            const content = fs.readFileSync(linkPath, 'utf8');
            const subLines = content.split(/\r?\n/);
            // Count tasks in the linked file
            let total = 0, completed = 0;
            for (const line of subLines) {
              const m = /^\s*- \[( |x|X)\]/.exec(line);
              if (m) {
                total++;
                if (m[1].toLowerCase() === 'x') completed++;
              }
            }
            if (total !== 0) {
              anyLinkHasTasks = true;
              if (completed !== total) {
                allLinkComplete = false;
                anyLinkIncomplete = true;
              }
            }
          } catch {}
        }
      }
      if (hasLink) {
        if (!anyLinkHasTasks) {
          task.linkChildrenComplete = undefined;
        } else if (allLinkComplete && !anyLinkIncomplete) {
          task.linkChildrenComplete = true;
        } else if (anyLinkIncomplete) {
          task.linkChildrenComplete = false;
        }
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
      continue;
    }

    // If it's a non-task list item (e.g. "- [[B]]"), track its indentation
    // so that subsequent indented tasks attach to this list item instead of
    // the previous task above it.
    const matchList = /^(\s*)-\s(?!\[( |x|X)\])(.*)$/.exec(lines[i]);
    if (matchList) {
      const indent = matchList[1].length;
      // Pop any stack items that are at or deeper than this indent
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      // Push a placeholder with no task so children won't attach to earlier tasks
      stack.push({ indent, task: undefined });
      continue;
    }
  }

  return tasks;
}

export function updateParentStatuses(
  content: string,
  prevState?: Map<number, boolean>,
  filePath?: string,
  rootDir?: string,
  ignoreTag: string = 'ignoretasktree',
  autoPropagateTaskStates: boolean = true
): UpdateResult {
  if (!autoPropagateTaskStates) {
    // If disabled, do not change any parent states, just return the content and state
    const lines = content.split(/\r?\n/);
    const tasks = parseTasks(lines);
    const newState = new Map<number, boolean>();
    for (const t of tasks) {
      newState.set(t.line, t.completed);
    }
    return { content, state: newState };
  }

  const lines = content.split(/\r?\n/);
  let builder: TaskTreeBuilder | undefined = undefined;
  let dir: string | undefined = undefined;
  if (filePath && rootDir) {
    dir = path.dirname(path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath));
    builder = new TaskTreeBuilder(rootDir, ignoreTag);
  }
  const tasks = parseTasks(lines, dir, builder);

  const sorted = tasks.slice().sort((a, b) => b.indent - a.indent);

  for (const t of sorted) {
    if (t.children.length === 0 && t.linkChildrenComplete === undefined) continue;
    const childrenComplete = t.children.every((c) => c.completed);
    const linksComplete = t.linkChildrenComplete ?? true;
    const newVal = childrenComplete && linksComplete;
    if (t.completed !== newVal) {
      lines[t.line] = lines[t.line].replace(
        /^(\s*- \[)( |x|X)(\])/,
        `$1${newVal ? 'x' : ' '}$3`
      );
      t.completed = newVal;
    }
  }

  const newState = new Map<number, boolean>();
  for (const t of tasks) {
    newState.set(t.line, t.completed);
  }

  return { content: lines.join('\n'), state: newState };
}
