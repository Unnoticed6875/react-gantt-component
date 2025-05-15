"use client";

import * as React from "react";
import { Task } from "../types";
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
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react"; // For DragOverlay
import { SortableTaskItem } from "./SortableTaskItem";
import { TaskListItem } from "./TaskListItem"; // For DragOverlay

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

        const updatedTasks = tasks.map(t => ({ ...t, parentId: t.parentId ?? null }));
        const taskToMoveCopy = updatedTasks.find(t => t.id === movedTaskId)!;

        console.log(`[TaskList] processTaskReorder: Moving task '${taskToMoveCopy.name}' (ID: ${movedTaskId}) from original parent '${taskToMove.parentId ?? null}' to new parent '${overParentId}' at index ${newIndexInLevel}.`);
        taskToMoveCopy.parentId = overParentId;

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
                listToProcess = siblingsInNewLevel.filter(t => t.parentId === overParentId);
            } else {
                listToProcess = updatedTasks
                    .filter(t => t.parentId === parentIdToProcess)
                    .sort((a, b) => a.order - b.order);
            }

            for (const task of listToProcess) {
                const taskFromUpdatedList = updatedTasks.find(t => t.id === task.id)!;
                if (processedTaskIds.has(taskFromUpdatedList.id)) {
                    continue;
                }
                taskFromUpdatedList.order = globalOrderCounter++;
                finalOrderedTasks.push(taskFromUpdatedList);
                processedTaskIds.add(taskFromUpdatedList.id);
                assignOrderRecursive(taskFromUpdatedList.id);
            }
        }

        assignOrderRecursive(null);

        updatedTasks.forEach(task => {
            if (!processedTaskIds.has(task.id)) {
                console.warn("[TaskList] processTaskReorder: Task missed in recursive ordering, appending:", task.id, task.name);
                const taskCopy = updatedTasks.find(t => t.id === task.id)!;
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
            return;
        }

        finalOrderedTasks.sort((a, b) => a.order - b.order);

        const finalTasksSimplified = finalOrderedTasks.map(t => ({ id: t.id, name: t.name, parentId: t.parentId, order: t.order }));
        console.log("[TaskList] processTaskReorder: Original tasks (simplified, sorted by original order):", JSON.stringify(originalTasksSimplified));
        console.log("[TaskList] processTaskReorder: Final tasks (simplified, sorted by new global order):", JSON.stringify(finalTasksSimplified));

        onTasksUpdate(finalOrderedTasks);
    };

    if (!isClientMounted) {
        return null;
    }

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasksMap.get(active.id as string);
        if (task) {
            setActiveTask(task);
        }
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
                    const parentChildren = tasks.filter(t => t.parentId === oldParentId).sort((a, b) => a.order - b.order);
                    const oldItemIndex = parentChildren.findIndex(t => t.id === active.id);
                    const newItemIndex = parentChildren.findIndex(t => t.id === over.id);
                    const reorderedChildren = arrayMove(parentChildren, oldItemIndex, newItemIndex);
                    newParentId = oldParentId ?? null;
                    newIndex = reorderedChildren.findIndex(t => t.id === active.id);
                } else {
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
                        if (newParentId === null) {
                            const rootTasks = tasks.filter(t => !t.parentId && t.id !== active.id).sort((a, b) => a.order - b.order);
                            const overRootIndex = rootTasks.findIndex(t => t.id === over.id);
                            const activeTaskOriginal = tasksMap.get(active.id as string)!;
                            newIndex = overRootIndex !== -1 ? (activeTaskOriginal.order < overTaskData.order ? overRootIndex : overRootIndex + 1) : rootTasks.length;
                        } else {
                            newIndex = targetParentChildren.length;
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
                                    level={activeTask.parentId ? tasks.filter(t => t.parentId === activeTask.parentId).length > 0 ? 1 : 0 : 0}
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