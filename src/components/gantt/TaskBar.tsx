"use client";

import * as React from "react";
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities'; // For applying transform
import { Task } from "./types";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
// date-fns imports are no longer needed here for drag calculations

const HANDLE_WIDTH = 8;

// Helper to generate unique IDs for dnd-kit
const getDraggableId = (taskId: string, type: 'body' | 'left' | 'right') => {
    return `task-${taskId}-${type}`;
};

interface ResizeHandleProps {
    taskId: string;
    task: Task; // Pass the whole task for original dates
    type: 'left' | 'right';
    isDraggingThisHandle: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ taskId, task, type, isDraggingThisHandle }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: getDraggableId(taskId, type),
        data: {
            type: type === 'left' ? 'task-resize-left' : 'task-resize-right',
            task: task, // Pass the original task data
            originalTaskDates: { start: task.start, end: task.end },
        },
    });

    const handleStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: `${HANDLE_WIDTH}px`,
        zIndex: 10,
        cursor: 'ew-resize',
        [type]: 0, // Sets left: 0 or right: 0
        backgroundColor: isDraggingThisHandle ? 'rgba(0,100,255,0.3)' : 'transparent',
    };

    return (
        <div
            ref={setNodeRef}
            style={handleStyle}
            {...listeners}
            {...attributes}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            aria-label={`Resize task ${type}`}
        />
    );
};

interface TaskBarContentProps {
    task: Task;
}

const TaskBarContent: React.FC<TaskBarContentProps> = ({ task }) => (
    <div className="relative w-full h-full px-2 flex items-center overflow-hidden">
        <span className="truncate select-none">{task.name}</span>
        {task.progress !== undefined && (
            <Progress
                value={task.progress}
                className="absolute top-0 left-0 h-full w-full !bg-primary/70 rounded-none opacity-50 group-hover:opacity-40 transition-opacity duration-150"
            />
        )}
        <span className="truncate relative z-10 pl-1 select-none">
            {task.progress !== undefined ? `(${task.progress}%)` : ''}
        </span>
    </div>
);

interface TaskBarProps {
    task: Task;
    taskBarStyle: React.CSSProperties; // Base style from Timeline
    // scale: number; // Removed for non-overlay, as dnd-kit handles delta pixels
    // onTaskUpdate is removed; DndContext in GanttChart handles updates
    onTaskBarClick?: (task: Task) => void;
    isOverlay?: boolean; // To style differently if it's a drag overlay
}

export function TaskBar({ task, taskBarStyle, onTaskBarClick, isOverlay = false }: TaskBarProps) {
    const { id: taskId, start, end } = task;

    const { attributes: bodyAttributes, listeners: bodyListeners, setNodeRef: setBodyNodeRef, transform: bodyTransform, isDragging: isBodyDragging } = useDraggable({
        id: getDraggableId(taskId, 'body'),
        data: {
            type: 'task-body',
            task: task,
            originalTaskDates: { start, end },
        },
        disabled: isOverlay, // Disable dragging the body if it's an overlay (overlay is already being dragged by dnd-kit)
    });

    // Check if left/right handles are being dragged to adjust main body opacity/interaction
    // This requires isDragging state from individual useDraggable hooks for handles IF they were separate.
    // For now, we get that from the ResizeHandle component, but it means TaskBar needs to know.
    // Alternative: get isDragging from useDraggable directly here.
    const { isDragging: isLeftHandleDragging } = useDraggable({ id: getDraggableId(taskId, 'left'), data: { type: 'task-resize-left', task, originalTaskDates: { start, end } } });
    const { isDragging: isRightHandleDragging } = useDraggable({ id: getDraggableId(taskId, 'right'), data: { type: 'task-resize-right', task, originalTaskDates: { start, end } } });

    const isAnyPartDragging = isBodyDragging || isLeftHandleDragging || isRightHandleDragging;

    // Styles for the main draggable element (TaskBar itself or its clone in DragOverlay)
    const style = bodyTransform && !isOverlay ?
        { ...taskBarStyle, transform: CSS.Translate.toString(bodyTransform) } :
        taskBarStyle;

    // Conditional styling if it's the original item being dragged (not the overlay)
    const liveElementStyle: React.CSSProperties = isAnyPartDragging && !isOverlay ?
        { ...style, opacity: 0.3, transition: 'opacity 0.1s ease-in-out' } :
        style;

    if (isOverlay) {
        // Simplified overlay rendering, assuming taskBarStyle has all necessary styles
        return (
            <div style={taskBarStyle} className="bg-primary rounded text-primary-foreground text-xs flex items-center cursor-grabbing">
                <TaskBarContent task={task} />
            </div>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    ref={setBodyNodeRef}
                    style={liveElementStyle}
                    {...bodyListeners}
                    {...bodyAttributes}
                    className="group relative bg-primary rounded overflow-hidden text-primary-foreground text-xs flex items-center cursor-grab"
                    onClick={() => !isAnyPartDragging && onTaskBarClick?.(task)} // Prevent click during any drag op
                >
                    <ResizeHandle taskId={taskId} task={task} type="left" isDraggingThisHandle={isLeftHandleDragging} />
                    <TaskBarContent task={task} />
                    <ResizeHandle taskId={taskId} task={task} type="right" isDraggingThisHandle={isRightHandleDragging} />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p><strong>{task.name}</strong></p>
                <p>ID: {task.id}</p>
                <p>Start: {task.start.toLocaleDateString()}</p>
                <p>End: {task.end.toLocaleDateString()}</p>
                {task.dependencies && task.dependencies.length > 0 && (
                    <p>Depends on: {task.dependencies.join(", ")}</p>
                )}
                {task.progress !== undefined && <p>Progress: {task.progress}%</p>}
            </TooltipContent>
        </Tooltip>
    );
} 