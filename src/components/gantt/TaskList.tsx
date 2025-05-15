"use client";

import * as React from "react";
import { Task } from "./types";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";

interface TaskListItemProps {
    task: Task;
    allTasks: Task[]; // Full list of tasks for finding children
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    isExpanded: boolean;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
    onChildReorderRequest: (parentId: string, reorderedChildren: Task[]) => void;
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
    onChildReorderRequest,
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
                            <Reorder.Group
                                values={children}
                                onReorder={(newOrder) => onChildReorderRequest(task.id, newOrder)}
                                axis="y"
                                as="div"
                                className="children-list-container min-h-[10px]" // Keep min-height for visual stability
                            >
                                {children.map((child) => (
                                    <ChildReorderableItem
                                        key={child.id}
                                        childTask={child}
                                        allTasks={allTasks}
                                        rowHeight={rowHeight}
                                        level={level + 1}
                                        onTaskRowClick={onTaskRowClick}
                                        expandedTaskIds={expandedTaskIds}
                                        onToggleExpansion={onToggleExpansion}
                                        onChildReorderRequest={onChildReorderRequest}
                                    />
                                ))}
                            </Reorder.Group>
                        )}
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    } else {
        return <div className="w-full">{taskRowContent}</div>;
    }
};

interface ChildReorderableItemProps {
    childTask: Task;
    allTasks: Task[];
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
    onChildReorderRequest: (parentId: string, reorderedChildren: Task[]) => void;
}

const ChildReorderableItem: React.FC<ChildReorderableItemProps> = ({
    childTask,
    allTasks,
    rowHeight,
    level,
    onTaskRowClick,
    onToggleExpansion,
    expandedTaskIds,
    onChildReorderRequest,
}) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item
            key={childTask.id}
            value={childTask}
            as="div"
            dragListener={false}
            dragControls={dragControls}
            className="draggable-child-item-container"
            whileDrag={{
                backgroundColor: "rgba(203, 213, 225, 0.8)",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                zIndex: 10,
            }}
        >
            <div className="flex items-center w-full">
                <div
                    onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
                    className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center"
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <TaskListItem
                        task={childTask}
                        allTasks={allTasks}
                        rowHeight={rowHeight}
                        level={level}
                        onTaskRowClick={onTaskRowClick}
                        isExpanded={!!expandedTaskIds[childTask.id]}
                        onToggleExpansion={onToggleExpansion}
                        expandedTaskIds={expandedTaskIds}
                        onChildReorderRequest={onChildReorderRequest}
                    />
                </div>
            </div>
        </Reorder.Item>
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
    const initialRootTasks = React.useMemo(() =>
        tasks.filter((task) => !task.parentId).sort((a, b) => a.order - b.order),
        [tasks]
    );

    const processTaskReorder = (
        orderedRootTaskIds: string[],
        childrenOrderMap: Map<string, string[]>
    ) => {
        const finalOrderedTasks: Task[] = [];
        let globalOrderCounter = 0;
        const taskMap = new Map(tasks.map(task => [task.id, { ...task }])); // Operate on copies

        function buildRecursive(currentLevelTaskIds: string[]) {
            for (const taskId of currentLevelTaskIds) {
                const task = taskMap.get(taskId);
                if (!task) {
                    console.error(`Task not found in map: ${taskId}`);
                    continue;
                }

                finalOrderedTasks.push({ ...task, order: globalOrderCounter++ });

                let childIdsForThisTask: string[];
                if (childrenOrderMap.has(taskId)) {
                    childIdsForThisTask = childrenOrderMap.get(taskId)!;
                } else {
                    // Get children in their current persistent order
                    childIdsForThisTask = tasks // from original tasks prop for stable current order
                        .filter(child => child.parentId === taskId)
                        .sort((a, b) => a.order - b.order)
                        .map(child => child.id);
                }

                if (childIdsForThisTask.length > 0) {
                    buildRecursive(childIdsForThisTask);
                }
            }
        }

        buildRecursive(orderedRootTaskIds);

        if (finalOrderedTasks.length !== tasks.length) {
            console.error(
                "TaskList Reorder: Mismatch in task count after reorder. " +
                `Expected ${tasks.length}, got ${finalOrderedTasks.length}. State not updated.`
            );
            // Potentially revert or handle error more gracefully
            return;
        }
        onTasksUpdate(finalOrderedTasks);
    };

    const handleRootReorder = (newlyOrderedRootTasks: Task[]) => {
        const rootTaskIds = newlyOrderedRootTasks.map(t => t.id);
        processTaskReorder(rootTaskIds, new Map()); // No children reordered in this operation
    };

    const handleChildReorderRequest = (parentId: string, newlyOrderedChildren: Task[]) => {
        const childrenReorderMap = new Map<string, string[]>();
        childrenReorderMap.set(parentId, newlyOrderedChildren.map(c => c.id));
        const currentRootTaskIds = initialRootTasks.map(t => t.id); // Root order remains the same
        processTaskReorder(currentRootTaskIds, childrenReorderMap);
    };

    return (
        // <DragDropContext onDragEnd={handleDragEnd}> // Removed
        // <Droppable droppableId="taskListDroppable" type="ROOT"> // Removed
        //     {(provided) => ( // Removed
        <Reorder.Group
            values={initialRootTasks}
            onReorder={handleRootReorder}
            axis="y"
            as="div" // Ensures it renders as a div
            className="bg-card border-r task-list-container"
            style={{ minHeight: '100px' }} // Keep min-height
        >
            {initialRootTasks.map((task) => (
                <RootReorderableItem
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    rowHeight={rowHeight}
                    onTaskRowClick={onTaskRowClick}
                    expandedTaskIds={expandedTaskIds}
                    onToggleExpansion={onToggleExpansion}
                    onChildReorderRequest={handleChildReorderRequest}
                />
            ))}
            {/* {provided.placeholder} // Removed */}
        </Reorder.Group>
        //     )} // Removed
        // </Droppable> // Removed
        // </DragDropContext> // Removed
    );
}

interface RootReorderableItemProps {
    task: Task;
    allTasks: Task[];
    rowHeight: number;
    onTaskRowClick?: (task: Task) => void;
    expandedTaskIds: Record<string, boolean>;
    onToggleExpansion: (taskId: string) => void;
    onChildReorderRequest: (parentId: string, reorderedChildren: Task[]) => void;
}

const RootReorderableItem: React.FC<RootReorderableItemProps> = ({
    task,
    allTasks,
    rowHeight,
    onTaskRowClick,
    expandedTaskIds,
    onToggleExpansion,
    onChildReorderRequest,
}) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item
            key={task.id} // Key is good here, also on Reorder.Item from map
            value={task}
            as="div"
            dragListener={false}
            dragControls={dragControls}
            className="draggable-root-item-container" // Base class
            whileDrag={{
                backgroundColor: "rgba(203, 213, 225, 0.8)", // Example: semi-transparent slate-300
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", // Example: shadow-lg
                zIndex: 10,
            }}
        >
            <div className="flex items-center w-full">
                <div
                    onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
                    className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center"
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <TaskListItem
                        task={task}
                        allTasks={allTasks}
                        rowHeight={rowHeight}
                        level={0}
                        onTaskRowClick={onTaskRowClick}
                        isExpanded={!!expandedTaskIds[task.id]}
                        onToggleExpansion={onToggleExpansion}
                        expandedTaskIds={expandedTaskIds}
                        onChildReorderRequest={onChildReorderRequest}
                    />
                </div>
            </div>
        </Reorder.Item>
    );
}; 