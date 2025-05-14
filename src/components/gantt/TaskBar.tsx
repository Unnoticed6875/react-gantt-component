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

interface TaskBarProps {
    task: Task;
    taskBarStyle: React.CSSProperties; // Base style from Timeline
    // scale: number; // Removed for non-overlay, as dnd-kit handles delta pixels
    // onTaskUpdate is removed; DndContext in GanttChart handles updates
    onTaskBarClick?: (task: Task) => void;
    isOverlay?: boolean; // To style differently if it's a drag overlay
}

const HANDLE_WIDTH = 8;

// Helper to generate unique IDs for dnd-kit
const getDraggableId = (taskId: string, type: 'body' | 'left' | 'right') => {
    return `task-${taskId}-${type}`;
};

export function TaskBar({ task, taskBarStyle, onTaskBarClick, isOverlay = false }: TaskBarProps) {
    const {
        attributes: bodyAttributes,
        listeners: bodyListeners,
        setNodeRef: setBodyNodeRef,
        transform: bodyTransform,
        isDragging: isBodyDragging
    } = useDraggable({
        id: getDraggableId(task.id, 'body'),
        data: {
            type: 'task-body',
            task: task,
            originalTaskDates: { start: task.start, end: task.end }, // Pass original dates
        },
        disabled: isOverlay,
    });

    const {
        attributes: leftHandleAttributes,
        listeners: leftHandleListeners,
        setNodeRef: setLeftHandleNodeRef,
        isDragging: isLeftHandleDragging
    } = useDraggable({
        id: getDraggableId(task.id, 'left'),
        data: {
            type: 'task-resize-left',
            task: task,
            originalTaskDates: { start: task.start, end: task.end },
        },
    });

    const {
        attributes: rightHandleAttributes,
        listeners: rightHandleListeners,
        setNodeRef: setRightHandleNodeRef,
        isDragging: isRightHandleDragging
    } = useDraggable({
        id: getDraggableId(task.id, 'right'),
        data: {
            type: 'task-resize-right',
            task: task,
            originalTaskDates: { start: task.start, end: task.end },
        },
    });

    const isAnyPartDragging = isBodyDragging || isLeftHandleDragging || isRightHandleDragging;

    // Styles for the main draggable element (TaskBar itself or its clone in DragOverlay)
    const style = bodyTransform && !isOverlay ?
        { ...taskBarStyle, transform: CSS.Translate.toString(bodyTransform) } :
        taskBarStyle;

    // Conditional styling if it's the original item being dragged (not the overlay)
    const liveElementStyle: React.CSSProperties = isAnyPartDragging && !isOverlay ?
        { ...style, opacity: 0.3, transition: 'opacity 0.1s ease-in-out' } :
        style;

    const handleWrapperStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: `${HANDLE_WIDTH}px`,
        zIndex: 10,
        cursor: 'ew-resize',
    };

    if (isOverlay) {
        // Overlay is already styled by GanttChart's DragOverlay styles,
        // but we might want to ensure it doesn't try to apply transforms again.
        // The `taskBarStyle` passed to it from DragOverlay should be sufficient.
        // This TaskBar instance is the one *in* the DragOverlay.
        return (
            <div style={taskBarStyle} className="bg-primary rounded text-primary-foreground text-xs flex items-center cursor-grabbing">
                <div className="relative w-full h-full px-2 flex items-center overflow-hidden">
                    <span className="truncate select-none">{task.name}</span>
                    {task.progress !== undefined && (
                        <Progress
                            value={task.progress}
                            className="absolute top-0 left-0 h-full w-full !bg-primary/70 rounded-none opacity-50"
                        />
                    )}
                    <span className="truncate relative z-10 pl-1 select-none">
                        {task.progress !== undefined ? `(${task.progress}%)` : ''}
                    </span>
                </div>
            </div>
        )
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
                    onClick={() => !isAnyPartDragging && onTaskBarClick?.(task)}
                >
                    <div
                        ref={setLeftHandleNodeRef}
                        style={{
                            ...handleWrapperStyle,
                            left: 0,
                            backgroundColor: isLeftHandleDragging ? 'rgba(0,100,255,0.3)' : 'transparent'
                        }}
                        {...leftHandleListeners}
                        {...leftHandleAttributes}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    />

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

                    <div
                        ref={setRightHandleNodeRef}
                        style={{
                            ...handleWrapperStyle,
                            right: 0,
                            backgroundColor: isRightHandleDragging ? 'rgba(0,100,255,0.3)' : 'transparent'
                        }}
                        {...rightHandleListeners}
                        {...rightHandleAttributes}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>
                    <strong>{task.name}</strong>
                </p>
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