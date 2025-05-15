"use client";

import * as React from "react";
import { Task } from "../types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TaskListItem, TaskListItemProps } from "./TaskListItem"; // Import TaskListItem

// Props for SortableTaskItem might need to be a combination of TaskListItemProps
// and any specific props for sortable behavior if not covered by TaskListItemProps.
// From the original TaskList.tsx, SortableTaskItemProps were:
export interface SortableTaskItemProps {
    task: Task;
    allTasks: Task[];
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    expandedTaskIds: Record<string, boolean>; // This is used by TaskListItem
    onToggleExpansion: (taskId: string) => void; // This is used by TaskListItem
    // Any other props that SortableTaskItem itself needs, or that TaskListItem needs from SortableTaskItem's parent
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = (props) => {
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
        zIndex: isDragging ? 10 : undefined,
        backgroundColor: isDragging ? "rgba(203, 213, 225, 0.8)" : undefined,
        boxShadow: isDragging ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" : undefined,
    };

    // Prepare props for TaskListItem
    // TaskListItemProps expects: task, allTasks, rowHeight, level, onTaskRowClick, isExpanded, onToggleExpansion, expandedTaskIds, isDragging
    // Most are available in `props` directly passed to SortableTaskItem.
    // `isExpanded` needs to be derived from `props.expandedTaskIds` and `task.id`.
    const taskListItemProps: Omit<TaskListItemProps, 'isOverlay'> = {
        ...props, // Passes task, allTasks, rowHeight, level, onTaskRowClick, onToggleExpansion, expandedTaskIds
        isExpanded: !!props.expandedTaskIds[task.id],
        isDragging: isDragging, // Pass the isDragging state from useSortable to TaskListItem
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="draggable-item-container">
            <div className="flex items-center w-full">
                <div {...listeners} className="p-1 cursor-grab flex-shrink-0 self-stretch flex items-center">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <TaskListItem {...taskListItemProps} />
                </div>
            </div>
        </div>
    );
}; 