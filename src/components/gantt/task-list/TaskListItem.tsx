"use client";

import * as React from "react";
import { Task } from "../types";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskItem, SortableTaskItemProps } from "./SortableTaskItem"; // Import SortableTaskItem

export interface TaskListItemProps {
    task: Task;
    allTasks: Task[]; // Full list of tasks for finding children
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    isExpanded: boolean;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
    // onChildReorderRequest?: (parentId: string, reorderedChildren: Task[]) => void; // This seems to be handled by the main TaskList
    isDragging?: boolean;
    isOverlay?: boolean;
    // Props needed by SortableTaskItem that are passed down
    // This component will now pass these through to SortableTaskItem for children
}

export const TaskListItem: React.FC<TaskListItemProps> = ({
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
    // Children calculation needs to be accurate based on how tasks are structured and passed.
    const children = allTasks.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order);

    const basePadding = 4;
    const levelPadding = level * 20;
    const nameStyle = { paddingLeft: `${levelPadding + basePadding}px` };
    const rootLeafNameStyle = { paddingLeft: `${basePadding + 20}px` };

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
                    {taskRowContent}
                    <CollapsibleContent>
                        {isExpanded && (
                            <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                {children.map((child) => {
                                    // Prepare props for SortableTaskItem
                                    // SortableTaskItemProps: task, allTasks, rowHeight, level, onTaskRowClick, expandedTaskIds, onToggleExpansion
                                    const sortableTaskItemProps: SortableTaskItemProps = {
                                        task: child,
                                        allTasks: allTasks, // Pass the full list for further nesting
                                        rowHeight: rowHeight,
                                        level: level + 1,
                                        onTaskRowClick: onTaskRowClick,
                                        expandedTaskIds: expandedTaskIds, // Pass down the map
                                        onToggleExpansion: onToggleExpansion,
                                    };
                                    return (
                                        <SortableTaskItem
                                            key={child.id}
                                            {...sortableTaskItemProps}
                                        />
                                    );
                                })}
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

// If SortableTaskItem is defined in another file, it would be imported.
// For now, we assume TaskListItem doesn't directly render SortableTaskItem
// but is rendered BY SortableTaskItem. The recursive rendering of children
// in the original TaskListItem was:
// <SortableContext ...>
//   {children.map(child => <SortableTaskItem ... task={child} ... />)}
// </SortableContext>
// This means TaskListItem itself needs to render SortableTaskItem for its children if it's to maintain the same structure.
// This creates a dependency: TaskListItem -> SortableTaskItem -> TaskListItem (for display)
// Let's make TaskListItem only responsible for rendering its own row and its direct, non-sortable children's display structure,
// and let SortableTaskItem handle the sortable wrapper and recursion for sortable children.
// The original TaskListItem was complex because it was both a display item AND a container for sortable children.

// Simpler TaskListItem: It displays itself. If it has children, it renders them via the passed-in mechanism
// (which would be SortableTaskItems rendered by its parent context).
// The CollapsibleContent should contain the list of SortableTaskItems for the children.
// The original TaskListItem's children.map was creating new SortableTaskItems.
// This is the structure that seems to be implied.
// Let's assume SortableTaskItem.tsx will be created next and will import TaskListItem.tsx.
// And TaskListItem.tsx, if it needs to render sortable children, will import SortableTaskItem.tsx.
// This circular dependency is often resolved by one component taking children as a prop, or careful structuring.

// The original code had:
// TaskListItem renders SortableContext and maps children to SortableTaskItem.
// SortableTaskItem renders TaskListItem.
// This is fine.

// We need to forward SortableTaskItem here. For now, I'll keep the placeholder,
// as SortableTaskItem.tsx needs to be created first, or we use a forwardRef or pass component as prop.
// To avoid issues for now, the children rendering part inside TaskListItem will be temporarily simplified.
// It should actually render <SortableTaskItem ... /> for each child.
// The `SortableTaskItem` itself will then render a `TaskListItem`.

// Re-evaluating the children rendering inside TaskListItem:
// The original TaskListItem, when expanded, renders a SortableContext and then maps children to SortableTaskItem.
// This means TaskListItem *does* need to know about SortableTaskItem.
// I will proceed with this structure, and we will create SortableTaskItem next.
// An import for SortableTaskItem will be needed here.
// Make sure there are no other characters or tags after this line. 