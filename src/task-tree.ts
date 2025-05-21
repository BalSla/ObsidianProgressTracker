// src/task-tree.ts

/**
 * Represents a node in the parsed task tree.
 * The 'completed' status is for leaf nodes. For parent nodes, completion is derived from children.
 * Children represent sub-tasks.
 */
export interface ParsedTaskNode {
    completed: boolean;
    children: ParsedTaskNode[];
}

/**
 * Interface for the object returned by getCounts, detailing total and completed tasks.
 */
export interface TaskCounts {
    total: number;
    completed: number;
}

/**
 * Represents a tree of tasks and provides methods to calculate completion
 * based on rules where parent tasks' counts are derived from their children.
 */
export class TaskTree {
    private rootNodes: ParsedTaskNode[];
    private hasCycle: boolean = false;  // tracks if a cycle was detected

    /**
     * Constructs a TaskTree instance.
     * @param rootNodes An array of ParsedTaskNode representing the top-level tasks.
     */
    constructor(rootNodes: ParsedTaskNode[]) {
        this.rootNodes = rootNodes;
    }

    /**
     * Recursively processes a single node to determine its contribution to total and completed tasks.
     * - If a node has no children (it's a leaf), it counts as 1 task. It's completed if its 'completed' flag is true.
     * - If a node has children, its own 'completed' status is ignored. Its task count and completion
     *   are the sum of its children's counts and completions.
     * @param node The task node to process.
     * @returns TaskCounts for the given node and its descendants.
     */
    protected processNode(node: ParsedTaskNode, visited: Set<ParsedTaskNode> = new Set()): TaskCounts {
        // Detect cycle
        if (visited.has(node)) {
            this.hasCycle = true;
            return { total: 0, completed: 0 };
        }
        visited.add(node);
        if (!node.children || node.children.length === 0) {
            // Leaf node: counts as 1 task.
            const counts = {
                total: 1,
                completed: node.completed ? 1 : 0,
            };
            // remove node from visited after processing leaf
            visited.delete(node);
            return counts;
        } else {
            // Parent node: its count is the sum of its children's counts.
            let childTotalTasks = 0;
            let childCompletedTasks = 0;
            for (const child of node.children) {
                const result = this.processNode(child, visited);
                childTotalTasks += result.total;
                childCompletedTasks += result.completed;
            }
            // remove node from visited for other branches
            visited.delete(node);
            return {
                total: childTotalTasks,
                completed: childCompletedTasks,
            };
        }
    }

    /**
     * Calculates the total and completed tasks for the entire tree.
     * @returns TaskCounts for all tasks in the tree.
     */
    public getCounts(): TaskCounts {
        // reset cycle flag before counting
        this.hasCycle = false;
        let totalTasks = 0;
        let completedTasks = 0;

        for (const rootNode of this.rootNodes) {
            const result = this.processNode(rootNode);
            totalTasks += result.total;
            completedTasks += result.completed;
        }

        return { total: totalTasks, completed: completedTasks };
    }

    /**
     * Generates a string representation of the task completion status.
     * Example: "Complete 50% (1/2)"
     * @returns A string describing the completion status, with a warning icon if any node is malformed.
     */
    public getCompletionString(): string {
        const counts = this.getCounts();
        let result: string;
        if (counts.total === 0) {
            result = "No tasks";
        } else {
            const percentage = Math.round((counts.completed / counts.total) * 100);
            result = `Complete ${percentage}% (${counts.completed}/${counts.total})`;
        }
        // Append error icon if malformed or cycle detected
        if (this.hasMalformed() || this.hasCycle) {
            result += ' ❗';
        }
        return result;
    }

    /**
     * Adds a subtask to the specified parent task in the tree.
     * @param parent The parent ParsedTaskNode to which the subtask will be added.
     * @param subtask The ParsedTaskNode to add as a subtask.
     * @throws Error if the parent task is not found in the tree.
     */
    public addSubtask(parent: ParsedTaskNode, subtask: ParsedTaskNode): void {
        const found = this.findNode(parent, this.rootNodes);
        if (!found) {
            throw new Error('Parent task not found');
        }
        found.children.push(subtask);
    }

    /**
     * Recursively searches for the target node in the given node list.
     * @param target The node to find.
     * @param nodes The current list of nodes to search.
     * @returns The found node or null.
     */
    private findNode(target: ParsedTaskNode, nodes: ParsedTaskNode[]): ParsedTaskNode | null {
        for (const node of nodes) {
            if (node === target) {
                return node;
            }
            const foundChild = this.findNode(target, node.children);
            if (foundChild) {
                return foundChild;
            }
        }
        return null;
    }

    /**
     * Checks for inconsistent completion flags:
     * - A parent marked completed while not all children are complete.
     * - A parent marked incomplete while all children are complete.
     */
    private hasMalformed(): boolean {
        const checkNode = (node: ParsedTaskNode): boolean => {
            if (node.children && node.children.length > 0) {
                const counts = this.processNode(node);
                if ((node.completed && counts.completed < counts.total) ||
                    (!node.completed && counts.completed === counts.total)) {
                    return true;
                }
                for (const child of node.children) {
                    if (checkNode(child)) {
                        return true;
                    }
                }
            }
            return false;
        };
        return this.rootNodes.some(checkNode);
    }
}
