"use client";

import * as React from "react";
import { Task } from "./types";
import { Progress } from "@/components/ui/progress";
import { addDays, differenceInCalendarDays, min as dateMin, max as dateMax } from 'date-fns';

interface TaskBarProps {
    task: Task;
    taskBarStyle: React.CSSProperties;
    scale: number;
    onTaskUpdate: (taskId: string, newStart: Date, newEnd: Date) => void;
    onTaskBarClick?: (task: Task) => void;
}

const HANDLE_WIDTH = 8; // pixels

export function TaskBar({ task, taskBarStyle, scale, onTaskUpdate, onTaskBarClick }: TaskBarProps) {
    const dragStartXRef = React.useRef<number | null>(null);
    const originalTaskStartRef = React.useRef<Date | null>(null);
    const originalTaskEndRef = React.useRef<Date | null>(null);
    const activeDragHandleRef = React.useRef<'left' | 'right' | 'body' | null>(null);
    const [isDraggingActive, setIsDraggingActive] = React.useState(false);
    const dragImageRef = React.useRef<HTMLElement | null>(null);

    const commonDragStartLogic = (event: React.DragEvent<HTMLDivElement>, dragType: 'left' | 'right' | 'body') => {
        setIsDraggingActive(true);
        activeDragHandleRef.current = dragType;
        dragStartXRef.current = event.clientX;
        originalTaskStartRef.current = task.start;
        originalTaskEndRef.current = task.end;
        event.dataTransfer.effectAllowed = 'move';

        const targetElement = event.currentTarget;
        if (dragType === 'body') { // For body drag, set detailed info for ghosting
            const dragData = {
                type: 'gantt-task-drag', // Custom type to identify our drag operations
                taskId: task.id,
                originalStartISO: task.start.toISOString(),
                originalEndISO: task.end.toISOString(),
                taskHeight: targetElement.offsetHeight, // Pass height for ghost consistency
                taskName: task.name, // Pass name for ghost rendering
                taskProgress: task.progress, // Pass progress for ghost rendering
                taskType: task.type // Pass type for ghost rendering
            };
            event.dataTransfer.setData('application/json', JSON.stringify(dragData));
        } else {
            event.dataTransfer.setData(`text/${dragType}-resize`, task.id); // Simpler for resize handles
        }

        dragImageRef.current = targetElement.cloneNode(true) as HTMLElement;
        if (dragImageRef.current) {
            dragImageRef.current.style.position = "absolute";
            dragImageRef.current.style.left = "-9999px";
            dragImageRef.current.style.width = `${targetElement.offsetWidth}px`;
            dragImageRef.current.style.height = `${targetElement.offsetHeight}px`;
            dragImageRef.current.style.opacity = '0.75';
            dragImageRef.current.style.pointerEvents = 'none';
            document.body.appendChild(dragImageRef.current);

            const rect = targetElement.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;
            event.dataTransfer.setDragImage(dragImageRef.current, offsetX, offsetY);
        }
    };

    const handleBodyDragStart = (event: React.DragEvent<HTMLDivElement>) => {
        commonDragStartLogic(event, 'body');
        // Note: setData for application/json is now in commonDragStartLogic for body type
    };

    const handleSideDragStart = (event: React.DragEvent<HTMLDivElement>, handleType: 'left' | 'right') => {
        event.stopPropagation();
        commonDragStartLogic(event, handleType);
    };

    const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
        if (dragImageRef.current) {
            document.body.removeChild(dragImageRef.current);
            dragImageRef.current = null;
        }
        setIsDraggingActive(false); // This will make the original bar visible again

        if (dragStartXRef.current === null || originalTaskStartRef.current === null || originalTaskEndRef.current === null || activeDragHandleRef.current === null) {
            resetDragState();
            return;
        }

        const currentX = event.clientX;
        if (currentX === 0 && dragStartXRef.current !== 0 && event.screenX !== 0) {
            resetDragState();
            return;
        }

        const deltaX = currentX - dragStartXRef.current;
        const dayOffset = Math.round(deltaX / scale);

        let newStartDate = originalTaskStartRef.current;
        let newEndDate = originalTaskEndRef.current;

        if (activeDragHandleRef.current === 'body') {
            newStartDate = addDays(originalTaskStartRef.current, dayOffset);
            const durationDays = differenceInCalendarDays(originalTaskEndRef.current, originalTaskStartRef.current);
            newEndDate = addDays(newStartDate, durationDays);
        } else if (activeDragHandleRef.current === 'left') {
            newStartDate = addDays(originalTaskStartRef.current, dayOffset);
            newStartDate = dateMin([newStartDate, addDays(originalTaskEndRef.current, -1)]);
        } else if (activeDragHandleRef.current === 'right') {
            newEndDate = addDays(originalTaskEndRef.current, dayOffset);
            newEndDate = dateMax([newEndDate, addDays(originalTaskStartRef.current, 1)]);
        }

        if (newStartDate >= newEndDate) {
            if (activeDragHandleRef.current === 'left') newStartDate = addDays(newEndDate, -1);
            else if (activeDragHandleRef.current === 'right') newEndDate = addDays(newStartDate, 1);
        }

        onTaskUpdate(task.id, newStartDate, newEndDate);
        resetDragState();
    };

    const resetDragState = () => {
        dragStartXRef.current = null;
        originalTaskStartRef.current = null;
        originalTaskEndRef.current = null;
        activeDragHandleRef.current = null;
        setIsDraggingActive(false);
        if (dragImageRef.current && dragImageRef.current.parentNode) {
            dragImageRef.current.parentNode.removeChild(dragImageRef.current);
            dragImageRef.current = null;
        }
    };

    const handleStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: `${HANDLE_WIDTH}px`,
        cursor: 'ew-resize',
        zIndex: 10,
    };

    const mainBarStyleWithDragEffect: React.CSSProperties = {
        ...taskBarStyle,
        // If dragging body for ghosting, make original nearly invisible
        // Otherwise, for resize, make it semi-transparent
        opacity: isDraggingActive && activeDragHandleRef.current === 'body' ? 0.1 : (isDraggingActive ? 0.5 : 1),
        transition: 'opacity 0.1s ease-in-out',
    };

    return (
        <div
            draggable
            onDragStart={handleBodyDragStart}
            onDragEnd={handleDragEnd}
            style={mainBarStyleWithDragEffect}
            className="group relative bg-primary rounded overflow-hidden text-primary-foreground text-xs flex items-center cursor-grab"
            onClick={() => !isDraggingActive && onTaskBarClick?.(task)}
            title={`${task.name} (${task.progress !== undefined ? task.progress + '%' : ''})`}
        >
            <div
                draggable
                onDragStart={(e) => handleSideDragStart(e, 'left')}
                onDragEnd={handleDragEnd}
                style={{ ...handleStyle, left: 0, backgroundColor: isDraggingActive && activeDragHandleRef.current === 'left' ? 'rgba(0,100,255,0.2)' : 'transparent' }}
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
                draggable
                onDragStart={(e) => handleSideDragStart(e, 'right')}
                onDragEnd={handleDragEnd}
                style={{ ...handleStyle, right: 0, backgroundColor: isDraggingActive && activeDragHandleRef.current === 'right' ? 'rgba(0,100,255,0.2)' : 'transparent' }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
        </div>
    );
} 