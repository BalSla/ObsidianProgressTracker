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
    private processNode(node: ParsedTaskNode): TaskCounts {
        if (!node.children || node.children.length === 0) {
            // Leaf node: counts as 1 task.
            return {
                total: 1,
                completed: node.completed ? 1 : 0,
            };
        } else {
            // Parent node: its count is the sum of its children's counts.
            let childTotalTasks = 0;
            let childCompletedTasks = 0;
            for (const child of node.children) {
                const result = this.processNode(child);
                childTotalTasks += result.total;
                childCompletedTasks += result.completed;
            }
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
     * @returns A string describing the completion status.
     */
    public getCompletionString(): string {
        const counts = this.getCounts();
        if (counts.total === 0) {
            return "No tasks";
        }
        const percentage = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
        return `Complete ${percentage}% (${counts.completed}/${counts.total})`;
    }
}
