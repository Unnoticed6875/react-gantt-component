"use client";

import * as React from "react";
import { Task } from "./types";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskListItemProps {
    task: Task;
    allTasks: Task[]; // Full list of tasks for finding children
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    isExpanded: boolean;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
    onChildReorderRequest?: (parentId: string, reorderedChildren: Task[]) => void;
    isDragging?: boolean;
    isOverlay?: boolean;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
    task,
    allTasks,
    rowHeight,
    level,
    onTaskRowClick,
    isExpanded,
    onToggleExpansion,
    expandedTaskIds,
    isDragging,
    isOverlay,
}) => {
    const children = allTasks.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order);

    const basePadding = 4;
    const levelPadding = level * 20;
    // Base style for name, accounts for level indentation
    const nameStyle = { paddingLeft: `${levelPadding + basePadding}px` };
    // Specific style for root-level leaf tasks (level 0, no children) to align with chevron space of potential siblings
    const rootLeafNameStyle = { paddingLeft: `${basePadding + 20}px` }; // 20 for chevron

    const itemClasses = `flex items-center hover:bg-muted/30 border-b text-xs w-full ${isDragging ? 'opacity-50' : ''} ${isOverlay ? 'shadow-lg bg-card' : ''}`;

    const taskRowContent = (
        <div
            className={itemClasses}
            style={{ height: `${rowHeight}px` }}
            onClick={() => !isDragging && onTaskRowClick?.(task)}
        >
            <div className="w-1/4 truncate pl-1 pr-2">{task.id}</div>
            {children.length > 0 ? (
                <CollapsibleTrigger asChild>
                    <div className="w-1/2 truncate pr-2 flex items-center cursor-pointer" style={nameStyle}>
                        <ChevronRight className={`h-4 w-4 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        {task.name}
                    </div>
                </CollapsibleTrigger>
            ) : (
                <div className="w-1/2 truncate pr-2 flex items-center" style={level === 0 ? rootLeafNameStyle : nameStyle}>
                    {task.name}
                </div>
            )}
            <div className="w-1/4 text-center">{task.start.toLocaleDateString()}</div>
            <div className="w-1/4 text-center pr-1">{task.end.toLocaleDateString()}</div>
        </div>
    );

    if (children.length > 0) {
        return (
            <Collapsible open={isExpanded} onOpenChange={() => onToggleExpansion(task.id)} asChild>
                <div className="collapsible-task-item-wrapper w-full">
                    {taskRowContent} {/* Parent task's own row content */}
                    <CollapsibleContent>
                        {isExpanded && (
                            <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                {children.map((child) => (
                                    <SortableTaskItem
                                        key={child.id}
                                        task={child}
                                        allTasks={allTasks}
                                        rowHeight={rowHeight}
                                        level={level + 1}
                                        onTaskRowClick={onTaskRowClick}
                                        expandedTaskIds={expandedTaskIds}
                                        onToggleExpansion={onToggleExpansion}
                                    />
                                ))}
                            </SortableContext>
                        )}
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    } else {
        return <div className="w-full">{taskRowContent}</div>;
    }
};

interface SortableTaskItemProps {
    task: Task;
    allTasks: Task[];
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    expandedTaskIds: Record<string, boolean>;
    onToggleExpansion: (taskId: string) => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = (props) => {
    const { task } = props;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined, // Ensure dragging item is on top
        backgroundColor: isDragging ? "rgba(203, 213, 225, 0.8)" : undefined, // slate-300 with opacity
        boxShadow: isDragging ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" : undefined, // shadow-lg
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="draggable-item-container">
            <div className="flex items-center w-full">
                <div {...listeners} className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <TaskListItem
                        {...props}
                        isExpanded={!!props.expandedTaskIds[task.id]}
                        isDragging={isDragging}
                    />
                </div>
            </div>
        </div>
    );
};

interface TaskListProps {
    tasks: Task[];
    rowHeight: number;
    onTaskRowClick?: (task: Task) => void;
    expandedTaskIds: Record<string, boolean>;
    onToggleExpansion: (taskId: string) => void;
    onTasksUpdate: (updatedTasks: Task[]) => void;
}

export function TaskList({
    tasks,
    rowHeight,
    onTaskRowClick,
    expandedTaskIds,
    onToggleExpansion,
    onTasksUpdate,
}: TaskListProps) {
    const [activeTask, setActiveTask] = React.useState<Task | null>(null);
    const [isClientMounted, setIsClientMounted] = React.useState(false);

    React.useEffect(() => {
        setIsClientMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const initialRootTasks = React.useMemo(() =>
        tasks.filter((task) => !task.parentId).sort((a, b) => a.order - b.order),
        [tasks]
    );

    // A map to quickly find a task by its ID
    const tasksMap = React.useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);

    const processTaskReorder = (
        movedTaskId: string,
        overParentId: string | null,
        newIndexInLevel: number
    ) => {
        console.log("[TaskList] processTaskReorder: Inputs -", { movedTaskId, overParentId, newIndexInLevel });
        const taskToMove = tasksMap.get(movedTaskId);
        if (!taskToMove) {
            console.error("[TaskList] processTaskReorder: Task to move not found:", movedTaskId);
            return;
        }

        const originalTasksSimplified = tasks.map(t => ({ id: t.id, name: t.name, parentId: t.parentId ?? null, order: t.order })).sort((a, b) => a.order - b.order);

        // Create copies and normalize parentId to be explicitly null for root tasks from the start
        const updatedTasks = tasks.map(t => ({ ...t, parentId: t.parentId ?? null }));
        const taskToMoveCopy = updatedTasks.find(t => t.id === movedTaskId)!;

        console.log(`[TaskList] processTaskReorder: Moving task '${taskToMoveCopy.name}' (ID: ${movedTaskId}) from original parent '${taskToMove.parentId ?? null}' to new parent '${overParentId}' at index ${newIndexInLevel}.`);
        taskToMoveCopy.parentId = overParentId; // overParentId is already string | null

        // Get siblings in the new level. All parentIds are now normalized to null for roots.
        const siblingsInNewLevel = updatedTasks.filter(
            (t) => t.parentId === overParentId && t.id !== movedTaskId
        ).sort((a, b) => a.order - b.order);

        siblingsInNewLevel.splice(newIndexInLevel, 0, taskToMoveCopy);

        let globalOrderCounter = 0;
        const finalOrderedTasks: Task[] = [];
        const processedTaskIds = new Set<string>();

        function assignOrderRecursive(parentIdToProcess: string | null) {
            let listToProcess: Task[];

            if (parentIdToProcess === overParentId) {
                // For the level that was directly modified, use siblingsInNewLevel as the definitive source and order
                // Ensure all items in siblingsInNewLevel actually have overParentId as their parentId
                listToProcess = siblingsInNewLevel.filter(t => t.parentId === overParentId);
                // console.log(`[TaskList] assignOrderRecursive: Using siblingsInNewLevel for parent ${overParentId}, count: ${listToProcess.length}`);
            } else {
                // For other levels, filter children from the main updatedTasks list and sort by their current order
                listToProcess = updatedTasks
                    .filter(t => t.parentId === parentIdToProcess)
                    .sort((a, b) => a.order - b.order);
                // console.log(`[TaskList] assignOrderRecursive: Using default children for parent ${parentIdToProcess}, count: ${listToProcess.length}`);
            }

            for (const task of listToProcess) {
                // Ensure we are processing the task object from the `updatedTasks` array,
                // as `task` from `listToProcess` might be from `siblingsInNewLevel` which could be a slightly different copy.
                const taskFromUpdatedList = updatedTasks.find(t => t.id === task.id)!;

                if (processedTaskIds.has(taskFromUpdatedList.id)) {
                    // This can happen if a task is in siblingsInNewLevel but also somehow reachable via normal parent/child traversal from another root task before this specific path is taken.
                    // Should be rare if siblingsInNewLevel is correctly constructed for only ONE parent level.
                    // console.warn(`[TaskList] assignOrderRecursive: Task ${taskFromUpdatedList.id} already processed, skipping.`);
                    continue;
                }

                taskFromUpdatedList.order = globalOrderCounter++;
                finalOrderedTasks.push(taskFromUpdatedList);
                processedTaskIds.add(taskFromUpdatedList.id);

                // Recursively process children of this task
                assignOrderRecursive(taskFromUpdatedList.id); // Children will be filtered from updatedTasks
            }
        }

        // Start recursion for root tasks (parentIdToProcess = null)
        assignOrderRecursive(null);

        // Safeguard for any tasks missed by the recursion (e.g., orphaned items if parentId logic had a bug)
        updatedTasks.forEach(task => {
            if (!processedTaskIds.has(task.id)) {
                console.warn("[TaskList] processTaskReorder: Task missed in recursive ordering, appending:", task.id, task.name);
                const taskCopy = updatedTasks.find(t => t.id === task.id)!; // Ensure we use the object from updatedTasks
                taskCopy.order = globalOrderCounter++;
                finalOrderedTasks.push(taskCopy);
                processedTaskIds.add(task.id);
            }
        });

        if (finalOrderedTasks.length !== tasks.length) {
            console.error(
                "[TaskList] processTaskReorder: Mismatch in task count after reorder. " +
                `Expected ${tasks.length}, got ${finalOrderedTasks.length}. State not updated. This is a critical error.`
            );
            // console.log("Original tasks state:", tasks);
            // console.log("Updated tasks (intermediate before final ordering):", updatedTasks.map(t=>({id: t.id, name: t.name, parentId: t.parentId, order: t.order})) );
            // console.log("Final ordered tasks attempt:", finalOrderedTasks.map(t=>({id: t.id, name: t.name, parentId: t.parentId, order: t.order})));
            return; // Avoid updating state if counts mismatch
        }

        // Sort final list by the newly assigned global order before updating state and logging
        finalOrderedTasks.sort((a, b) => a.order - b.order);

        const finalTasksSimplified = finalOrderedTasks.map(t => ({ id: t.id, name: t.name, parentId: t.parentId, order: t.order }));
        console.log("[TaskList] processTaskReorder: Original tasks (simplified, sorted by original order):", JSON.stringify(originalTasksSimplified));
        console.log("[TaskList] processTaskReorder: Final tasks (simplified, sorted by new global order):", JSON.stringify(finalTasksSimplified));

        onTasksUpdate(finalOrderedTasks);
    };

    if (!isClientMounted) {
        // Return null or a placeholder/skeleton to avoid rendering DndContext on the server
        // and during the initial client render before useEffect runs.
        // This prevents the aria-describedby mismatch.
        // You could return a div with the same className and minHeight for layout stability if needed.
        // For example: return <div className="bg-card border-r task-list-container" style={{ minHeight: '100px' }} />;
        return null;
    }

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasksMap.get(active.id as string);
        if (task) {
            setActiveTask(task);
        }
        // console.log("[TaskList] DragStart:", active.id); // Optional: for more detailed drag start info
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);
        const { active, over } = event;

        console.log("[TaskList] DragEnd Event:", { activeId: active.id, overId: over?.id });

        if (over && active.id !== over.id) {
            const activeTaskData = tasksMap.get(active.id as string);
            const overTaskData = tasksMap.get(over.id as string);

            if (!activeTaskData) {
                console.error("[TaskList] DragEnd: Active task data not found for ID:", active.id);
                return;
            }

            const oldParentId = activeTaskData.parentId;
            let newParentId: string | null = null;
            let newIndex: number;

            if (overTaskData) {
                const overTaskParentId = overTaskData.parentId;
                if (oldParentId === overTaskParentId) {
                    // Scenario 1: Reordering within the same parent
                    const parentChildren = tasks.filter(t => t.parentId === oldParentId).sort((a, b) => a.order - b.order);
                    const oldItemIndex = parentChildren.findIndex(t => t.id === active.id);
                    const newItemIndex = parentChildren.findIndex(t => t.id === over.id);
                    const reorderedChildren = arrayMove(parentChildren, oldItemIndex, newItemIndex);
                    newParentId = oldParentId ?? null;
                    newIndex = reorderedChildren.findIndex(t => t.id === active.id);
                } else {
                    // Scenario 2: Moving to a different parent (or to/from root)
                    newParentId = overTaskData.parentId ?? null;
                    const targetParentChildren = tasks.filter(t => t.parentId === newParentId && t.id !== active.id).sort((a, b) => a.order - b.order);
                    const overItemIndexInNewParent = targetParentChildren.findIndex(t => t.id === over.id);
                    if (overItemIndexInNewParent !== -1) {
                        const activeTaskOriginal = tasksMap.get(active.id as string)!;
                        if (activeTaskOriginal.order < overTaskData.order) {
                            newIndex = overItemIndexInNewParent;
                        } else {
                            newIndex = overItemIndexInNewParent + 1;
                        }
                    } else {
                        if (newParentId === null) { // Dropping to root, overTask is a root task
                            const rootTasks = tasks.filter(t => !t.parentId && t.id !== active.id).sort((a, b) => a.order - b.order);
                            const overRootIndex = rootTasks.findIndex(t => t.id === over.id);
                            const activeTaskOriginal = tasksMap.get(active.id as string)!;
                            newIndex = overRootIndex !== -1 ? (activeTaskOriginal.order < overTaskData.order ? overRootIndex : overRootIndex + 1) : rootTasks.length;
                        } else { // Dropping into a parent but not relative to a direct sibling found in targetParentChildren
                            newIndex = targetParentChildren.length; // Default to end of list
                        }
                    }
                }
                console.log("[TaskList] handleDragEnd: Calling processTaskReorder with:", {
                    movedTaskId: active.id as string,
                    newParentId,
                    newIndex
                });
                processTaskReorder(active.id as string, newParentId, newIndex);
            } else {
                // overTaskData is null (e.g., dragged off to an area not covered by a task item)
                console.log("[TaskList] handleDragEnd: Dropped into unhandled area (overTaskData is null). Defaulting to making it a root task at the end.");
                const rootTasks = tasks.filter(t => !t.parentId && t.id !== active.id).sort((a, b) => a.order - b.order);
                processTaskReorder(active.id as string, null, rootTasks.length);
            }
        } else {
            console.log("[TaskList] handleDragEnd: No effective change (over is null, or active.id === over.id), activeId:", active.id, "overId:", over?.id);
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={initialRootTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="bg-card border-r task-list-container" style={{ minHeight: '100px' }}>
                    {initialRootTasks.map((task) => (
                        <SortableTaskItem
                            key={task.id}
                            task={task}
                            allTasks={tasks}
                            rowHeight={rowHeight}
                            level={0}
                            onTaskRowClick={onTaskRowClick}
                            expandedTaskIds={expandedTaskIds}
                            onToggleExpansion={onToggleExpansion}
                        />
                    ))}
                </div>
            </SortableContext>
            <DragOverlay>
                {activeTask ? (
                    <div className="dragging-item-overlay" style={{ width: "100%" }}>
                        <div className="flex items-center w-full">
                            <div className="p-1 flex-shrink-0 self-stretch flex items-center">
                                <GripVertical className="h-5 w-5 text-muted-foreground opacity-50" />
                            </div>
                            <div className="flex-grow">
                                <TaskListItem
                                    task={activeTask}
                                    allTasks={tasks}
                                    rowHeight={rowHeight}
                                    level={activeTask.parentId ? (tasks.find(p => p.id === activeTask.parentId) ? 1 : 0) : 0}
                                    onTaskRowClick={() => { }}
                                    isExpanded={!!expandedTaskIds[activeTask.id]}
                                    onToggleExpansion={() => { }}
                                    expandedTaskIds={expandedTaskIds}
                                    isOverlay={true}
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
} 