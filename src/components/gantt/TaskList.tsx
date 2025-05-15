"use client";

import * as React from "react";
import { Task } from "./types";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface TaskListItemProps {
    task: Task;
    allTasks: Task[]; // Full list of tasks for finding children
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    isExpanded: boolean;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
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
}) => {
    const children = allTasks.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order);

    const basePadding = 4;
    const levelPadding = level * 20;
    // Base style for name, accounts for level indentation
    const nameStyle = { paddingLeft: `${levelPadding + basePadding}px` };
    // Specific style for root-level leaf tasks (level 0, no children) to align with chevron space of potential siblings
    const rootLeafNameStyle = { paddingLeft: `${basePadding + 20}px` }; // 20 for chevron

    const taskRowContent = (
        <div
            className={`flex items-center hover:bg-muted/30 border-b text-xs w-full`}
            style={{ height: `${rowHeight}px` }}
            onClick={() => onTaskRowClick?.(task)}
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
                            <Droppable droppableId={`children-of-${task.id}`} type={`CHILDREN_OF_${task.id}`}>
                                {(provided) => ( // Correct: single function child for Droppable
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="children-list-container min-h-[10px]" // Added min-height for empty droppable
                                    >
                                        {children.map((child, index) => (
                                            <Draggable key={child.id} draggableId={child.id} index={index}>
                                                {(providedDraggable, snapshotDraggable) => (
                                                    <div
                                                        ref={providedDraggable.innerRef}
                                                        {...providedDraggable.draggableProps}
                                                        className={`flex items-center draggable-child-item-container ${snapshotDraggable.isDragging ? 'bg-muted shadow-lg' : ''}`}
                                                    >
                                                        <div {...providedDraggable.dragHandleProps} className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center">
                                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex-grow">
                                                            <TaskListItem
                                                                task={child}
                                                                allTasks={allTasks}
                                                                rowHeight={rowHeight}
                                                                level={level + 1}
                                                                onTaskRowClick={onTaskRowClick}
                                                                isExpanded={!!expandedTaskIds[child.id]}
                                                                onToggleExpansion={onToggleExpansion}
                                                                expandedTaskIds={expandedTaskIds}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder} {/* Placeholder inside the droppable div */}
                                    </div>
                                )}
                            </Droppable>
                        )}
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    } else {
        return <div className="w-full">{taskRowContent}</div>;
    }
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
    const initialRootTasks = React.useMemo(() =>
        tasks.filter((task) => !task.parentId).sort((a, b) => a.order - b.order),
        [tasks]
    );

    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const currentTasks = [...tasks]; // Current state of all tasks
        let newRootTaskIdsOrder: string[] = initialRootTasks.map(t => t.id); // Default to current root order
        const reorderedChildrenByParentId = new Map<string, string[]>();

        if (source.droppableId === "taskListDroppable" && destination.droppableId === "taskListDroppable") {
            // Case 1: Reordering root tasks
            const rootIds = [...initialRootTasks.map(t => t.id)];
            const [movedId] = rootIds.splice(source.index, 1);
            rootIds.splice(destination.index, 0, movedId);
            newRootTaskIdsOrder = rootIds;

        } else if (source.droppableId.startsWith("children-of-") && source.droppableId === destination.droppableId) {
            // Case 2: Reordering children within the same parent
            const parentId = source.droppableId.replace("children-of-", "");
            const childrenOfParentIds = currentTasks
                .filter(t => t.parentId === parentId)
                .sort((a, b) => a.order - b.order)
                .map(t => t.id);

            const [movedChildId] = childrenOfParentIds.splice(source.index, 1);
            childrenOfParentIds.splice(destination.index, 0, movedChildId);
            reorderedChildrenByParentId.set(parentId, childrenOfParentIds);
        } else {
            console.warn("Drag operation between different lists or levels is not supported.");
            return;
        }

        const finalOrderedTasks: Task[] = [];
        let globalOrderCounter = 0;
        const taskMap = new Map(currentTasks.map(task => [task.id, task]));

        function buildOrderedListRecursive(taskIds: string[]) {
            for (const taskId of taskIds) {
                const task = taskMap.get(taskId);
                if (!task) continue;

                finalOrderedTasks.push({ ...task, order: globalOrderCounter++ });

                let childrenIdsToProcess: string[];
                if (reorderedChildrenByParentId.has(taskId)) {
                    childrenIdsToProcess = reorderedChildrenByParentId.get(taskId)!;
                } else {
                    childrenIdsToProcess = currentTasks
                        .filter(child => child.parentId === taskId)
                        .sort((a, b) => a.order - b.order)
                        .map(child => child.id);
                }
                if (childrenIdsToProcess.length > 0) {
                    buildOrderedListRecursive(childrenIdsToProcess);
                }
            }
        }

        buildOrderedListRecursive(newRootTaskIdsOrder);

        if (finalOrderedTasks.length !== tasks.length) {
            console.error(
                "TaskList DragEnd: Mismatch in task count after reorder. " +
                `Expected ${tasks.length}, got ${finalOrderedTasks.length}. State not updated.`
            );
            return;
        }
        onTasksUpdate(finalOrderedTasks);
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="taskListDroppable" type="ROOT">
                {(provided) => (
                    <div
                        className="bg-card border-r task-list-container"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{ minHeight: '100px' }}
                    >
                        {initialRootTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(providedDraggable, snapshot) => (
                                    <div
                                        ref={providedDraggable.innerRef}
                                        {...providedDraggable.draggableProps}
                                        className={`draggable-root-item-container ${snapshot.isDragging ? 'bg-muted shadow-lg' : ''}`}
                                    >
                                        <div className="flex items-center w-full">
                                            <div {...providedDraggable.dragHandleProps} className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center">
                                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-grow">
                                                <TaskListItem
                                                    task={task}
                                                    allTasks={tasks}
                                                    rowHeight={rowHeight}
                                                    level={0}
                                                    onTaskRowClick={onTaskRowClick}
                                                    isExpanded={!!expandedTaskIds[task.id]}
                                                    onToggleExpansion={onToggleExpansion}
                                                    expandedTaskIds={expandedTaskIds}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
} 