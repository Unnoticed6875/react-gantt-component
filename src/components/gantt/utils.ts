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

  // The tasks array coming in should already be sorted by the desired 'order'
  // from the TaskList drag-and-drop logic, or initial load.
  // We just need to build the hierarchy based on parentId links.

  function buildTreeRecursively(
    currentTask: Task,
    allTasks: Task[],
    resultList: Task[]
  ) {
    if (visited.has(currentTask.id)) return;
    visited.add(currentTask.id);
    resultList.push(currentTask);

    const children = allTasks
      .filter((t) => t.parentId === currentTask.id)
      .sort((a, b) => a.order - b.order); // Sort children by their 'order' property

    for (const child of children) {
      buildTreeRecursively(child, allTasks, resultList);
    }
  }

  // Get all root tasks (those without a parent or with a non-existent parent)
  // and sort them by the 'order' property.
  const rootTasks = tasks
    .filter((task) => !task.parentId || !taskMap.has(task.parentId))
    .sort((a, b) => a.order - b.order);

  for (const rootTask of rootTasks) {
    buildTreeRecursively(rootTask, tasks, taskTree);
  }

  // Add any orphaned tasks not visited (should ideally not happen with good data)
  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      // Treat as a root and build its subtree, it will be appended at the end
      // Its children will also be sorted by order
      console.warn(
        `getHierarchicalTasks: Found orphaned task ${task.id}, appending.`
      );
      buildTreeRecursively(task, tasks, taskTree);
    }
  });

  return taskTree;
};

export const getVisibleTasks = (
  allFlatTasks: Task[], // This is the raw tasks array, potentially unsorted or sorted differently
  expandedTaskIds: Record<string, boolean>,
  // hierarchicalSortedTasks is the result from getHierarchicalTasks, which is now sorted by 'order'
  hierarchicalTasksByOrder: Task[]
): Task[] => {
  const visibleTasks: Task[] = [];
  const taskMap = new Map<string, Task>(
    allFlatTasks.map((task) => [task.id, task]) // Use allFlatTasks for the map to find parents by ID
  );

  function areAncestorsExpanded(taskId: string | undefined | null): boolean {
    if (!taskId) return true;
    const task = taskMap.get(taskId);
    if (!task) return true;

    if (task.parentId) {
      if (!expandedTaskIds[task.parentId]) {
        return false;
      }
      return areAncestorsExpanded(task.parentId);
    }
    return true;
  }

  // Iterate through the tasks already sorted by 'order' from getHierarchicalTasks
  for (const task of hierarchicalTasksByOrder) {
    if (!task.parentId || !taskMap.has(task.parentId)) {
      // Check if it's a root task
      visibleTasks.push(task); // Root tasks are candidates
    } else {
      // For child tasks, add if its direct parent is expanded AND all its ancestors are also expanded
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
