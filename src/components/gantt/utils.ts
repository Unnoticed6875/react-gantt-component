import { Task } from "./types";

export const getStartAndEndDates = (tasks: Task[]) => {
  if (!tasks || tasks.length === 0) {
    return { overallMinDate: null, overallMaxDate: null };
  }

  let overallMinDate = tasks[0].start;
  let overallMaxDate = tasks[0].end;

  tasks.forEach((task) => {
    if (task.start < overallMinDate) {
      overallMinDate = task.start;
    }
    if (task.end > overallMaxDate) {
      overallMaxDate = task.end;
    }
  });

  return { overallMinDate, overallMaxDate };
};

export const getHierarchicalTasks = (tasks: Task[]): Task[] => {
  const taskMap = new Map<string, Task>(tasks.map((task) => [task.id, task]));
  const taskTree: Task[] = [];
  const visited = new Set<string>();

  function buildTree(task: Task, level: number): Task[] {
    visited.add(task.id);
    const results: Task[] = [task]; // Task itself, without adding _level
    const children = tasks
      .filter((t) => t.parentId === task.id)
      .sort((a, b) => a.start.getTime() - b.start.getTime()); // Optional: sort children by start date

    for (const child of children) {
      if (!visited.has(child.id)) {
        results.push(...buildTree(child, level + 1));
      }
    }
    return results;
  }

  const rootTasks = tasks.filter(
    (task) => !task.parentId || !taskMap.has(task.parentId)
  );
  // Optional: sort root tasks by start date
  rootTasks.sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const rootTask of rootTasks) {
    if (!visited.has(rootTask.id)) {
      taskTree.push(...buildTree(rootTask, 0));
    }
  }

  // Add any orphaned tasks (tasks whose parentId doesn't exist or were part of a cycle not starting from a clear root)
  // These will be treated as root-level tasks.
  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      // Add it as a root, and try to build its subtree if it has children not yet visited
      taskTree.push(...buildTree(task, 0));
    }
  });

  return taskTree;
};

export const getVisibleTasks = (
  allFlatTasks: Task[],
  expandedTaskIds: Record<string, boolean>,
  hierarchicalSortedTasks: Task[] // Use the already sorted list as a base for order and structure
): Task[] => {
  const visibleTasks: Task[] = [];
  const taskMap = new Map<string, Task>(
    allFlatTasks.map((task) => [task.id, task])
  );

  // Helper to check if all ancestors of a task are expanded
  function areAncestorsExpanded(taskId: string | undefined): boolean {
    if (!taskId) return true; // No parent means it's a root or effectively so
    const task = taskMap.get(taskId);
    if (!task) return true; // Should not happen if data is consistent

    if (task.parentId) {
      // If it has a parent, that parent must be expanded, and its ancestors too
      if (!expandedTaskIds[task.parentId]) {
        return false;
      }
      return areAncestorsExpanded(task.parentId);
    }
    return true; // Is a root task, or its parent was not found (treat as visible)
  }

  for (const task of hierarchicalSortedTasks) {
    if (!task.parentId) {
      // Root tasks are always a candidate
      visibleTasks.push(task);
    } else {
      // For child tasks, only add if its direct parent is expanded AND all its ancestors were also expanded
      if (
        expandedTaskIds[task.parentId] &&
        areAncestorsExpanded(task.parentId)
      ) {
        visibleTasks.push(task);
      }
    }
  }
  return visibleTasks;
};
