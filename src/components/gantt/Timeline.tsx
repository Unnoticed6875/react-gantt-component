"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Task, ViewMode } from './types';
import { TaskBar } from "./TaskBar";
import {
    differenceInCalendarDays,
    addDays,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    startOfWeek,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    max,
    min,
    isValid as isValidDate,
} from 'date-fns';
import DependencyArrows from './DependencyArrows';

// Data structure for the drag data from TaskBar
interface GanttTaskDragData {
    type: 'gantt-task-drag';
    taskId: string;
    originalStartISO: string;
    originalEndISO: string;
    taskHeight: number;
    taskName: string;
    taskProgress?: number;
    taskType: 'task' | 'milestone';
}

// Interface for the ghost preview state
interface GhostPreviewData {
    task: Task; // A temporary task object for the ghost
    x: number;
    y: number;
    width: number;
    height: number; // Added height
    style: React.CSSProperties;
}

interface TimelineProps {
    viewMode: ViewMode;
    tasks: Task[];
    startDate: Date;
    endDate: Date;
    rowHeight: number;
    taskHeight: number; // This is the default/target task height
    scale: number;
    getTaskDate: (task: Task) => { start: Date; end: Date };
    getTaskBarStyle: (task: Task, index: number, calculatedStyle: React.CSSProperties) => React.CSSProperties;
    showGrid?: boolean;
    onTaskUpdate: (taskId: string, newStart: Date, newEnd: Date) => void;
}

interface TaskPosition {
    x: number;
    y: number;
    width: number;
}

const Timeline: React.FC<TimelineProps> = ({
    viewMode,
    tasks,
    startDate: ganttStartDate,
    endDate: ganttEndDate,
    rowHeight,
    taskHeight, // Default task height from props
    scale,
    getTaskDate,
    getTaskBarStyle,
    showGrid = true,
    onTaskUpdate, // We won't call this directly from here, but keep for TaskBar
}) => {
    const [ghostPreviewData, setGhostPreviewData] = useState<GhostPreviewData | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null); // Ref for the main timeline div
    const totalTimelineDays = differenceInCalendarDays(ganttEndDate, ganttStartDate) + 1;
    const preciseTimelineWidth = totalTimelineDays * scale;

    const taskPositions: Record<string, TaskPosition> = {};

    const handleTimelineDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        try {
            const jsonData = event.dataTransfer.getData('application/json');
            if (!jsonData) return;
            const dragData: GanttTaskDragData = JSON.parse(jsonData);

            if (dragData.type !== 'gantt-task-drag') {
                setGhostPreviewData(null); // Not our task drag, clear ghost
                return;
            }

            if (!timelineRef.current) return;

            const timelineRect = timelineRef.current.getBoundingClientRect();
            const mouseXInTimeline = event.clientX - timelineRect.left;

            // Determine current row based on mouseY
            const mouseYInTimeline = event.clientY - timelineRect.top;
            let rowIndex = Math.floor(mouseYInTimeline / rowHeight);
            rowIndex = Math.max(0, Math.min(rowIndex, tasks.length > 0 ? tasks.length - 1 : 0)); // Ensure tasks.length-1 is not negative

            const originalTaskStart = new Date(dragData.originalStartISO);
            const originalTaskEnd = new Date(dragData.originalEndISO);
            if (!isValidDate(originalTaskStart) || !isValidDate(originalTaskEnd)) return;

            const durationDays = differenceInCalendarDays(originalTaskEnd, originalTaskStart);

            const currentDayOffsetFromStart = mouseXInTimeline / scale;
            let newGhostStartDate = addDays(ganttStartDate, currentDayOffsetFromStart);
            // Snap to day start or apply other snapping logic if desired
            newGhostStartDate = new Date(newGhostStartDate.getFullYear(), newGhostStartDate.getMonth(), newGhostStartDate.getDate());
            const newGhostEndDate = addDays(newGhostStartDate, durationDays);

            // Calculate position for the ghost
            const ghostTaskStartOffsetDays = differenceInCalendarDays(newGhostStartDate, ganttStartDate);
            const ghostTaskDurationDays = differenceInCalendarDays(addDays(newGhostEndDate, 1), newGhostStartDate);

            if (ghostTaskDurationDays <= 0) {
                setGhostPreviewData(null);
                return;
            }

            const ghostX = ghostTaskStartOffsetDays * scale;
            const ghostCalculatedTaskHeight = dragData.taskType === 'milestone' ? dragData.taskHeight * 0.8 : dragData.taskHeight;
            const ghostY = rowIndex * rowHeight + (rowHeight - ghostCalculatedTaskHeight) / 2;
            const ghostWidth = Math.max(0, ghostTaskDurationDays * scale - 1); // -1 for border/visuals

            const ghostTask: Task = {
                id: `ghost-${dragData.taskId}`,
                name: dragData.taskName,
                start: newGhostStartDate,
                end: newGhostEndDate,
                progress: dragData.taskProgress || 0,
                type: dragData.taskType,
            };

            setGhostPreviewData({
                task: ghostTask,
                x: ghostX,
                y: ghostY,
                width: ghostWidth,
                height: ghostCalculatedTaskHeight,
                style: {
                    position: 'absolute',
                    left: ghostX,
                    top: ghostY,
                    width: ghostWidth,
                    height: ghostCalculatedTaskHeight,
                    zIndex: 20, // Above normal tasks, below drag image
                    opacity: 0.7,
                    border: '2px dashed #a0a0a0',
                    pointerEvents: 'none', // Ghost should not interfere with mouse events
                    backgroundColor: 'rgba(180,180,180,0.2)'
                }
            });

        } catch {
            // Error processing drag data, ensure ghost is cleared
            setGhostPreviewData(null);
        }
    }, [scale, ganttStartDate, rowHeight, tasks.length]); // tasks.length to re-evaluate clamping

    const handleTimelineDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        // Check if the mouse truly left the timeline element, not just moving onto a child (like the ghost itself if it wasn't pointer-events:none)
        if (timelineRef.current && !timelineRef.current.contains(event.relatedTarget as Node)) {
            setGhostPreviewData(null);
        }
    };

    // This handler is on TaskBar, but we need to clear ghost if drag ends anywhere
    // One way is to listen to global dragend, or rely on TaskBar dragend to inform parent,
    // which then tells Timeline. For now, DragLeave and a check in DragOver for non-our-drags will mostly cover.
    // A more robust solution might involve a shared context or a global event listener for dragend.

    const renderVerticalGridLines = () => {
        if (!showGrid) return null;
        const lines: React.JSX.Element[] = [];

        if (scale >= 3) {
            const days = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });
            days.forEach((day, index) => {
                lines.push(
                    <div
                        key={`fine-grid-col-${index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-700 opacity-50"
                        style={{ left: index * scale, width: scale }}
                    />
                );
            });
        }

        let majorIntervals: Date[] = [];
        if (viewMode === 'day' && scale < 3) {
            majorIntervals = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });
        } else if (viewMode === 'week') {
            majorIntervals = eachWeekOfInterval({ start: ganttStartDate, end: ganttEndDate }, { weekStartsOn: 1 }).map(d => startOfWeek(d, { weekStartsOn: 1 }));
        } else if (viewMode === 'month') {
            majorIntervals = eachMonthOfInterval({ start: ganttStartDate, end: ganttEndDate }).map(d => startOfMonth(d));
        } else if (viewMode === 'quarter') {
            majorIntervals = eachQuarterOfInterval({ start: ganttStartDate, end: ganttEndDate }).map(d => startOfQuarter(d));
        } else if (viewMode === 'year') {
            majorIntervals = eachYearOfInterval({ start: ganttStartDate, end: ganttEndDate }).map(d => startOfYear(d));
        }

        majorIntervals.forEach((intervalStart, index) => {
            const offsetDays = differenceInCalendarDays(intervalStart, ganttStartDate);
            if (offsetDays < 0) return;

            const position = offsetDays * scale;
            if (position < preciseTimelineWidth) {
                lines.push(
                    <div
                        key={`major-grid-col-${viewMode}-${index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-300 dark:border-gray-500"
                        style={{ left: position, width: 0 }}
                    />
                );
            }
        });
        return lines;
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div
                ref={timelineRef} // Added ref
                className="relative"
                style={{ width: `${preciseTimelineWidth}px`, height: `${Math.max(tasks.length, 1) * rowHeight}px` }} // Ensure min height for drop if no tasks
                onDragOver={handleTimelineDragOver} // Changed from handleDragOver
                onDragLeave={handleTimelineDragLeave} // Added
            >
                {renderVerticalGridLines()}

                {showGrid && tasks.map((_, index) => (
                    <div
                        key={`grid-row-${index}`}
                        className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-600"
                        style={{ top: (index + 1) * rowHeight - 1, height: 1, zIndex: 0 }}
                    />
                ))}

                {tasks.map((task, index) => {
                    const { start: taskStart, end: taskEnd } = getTaskDate(task);
                    const effectiveTaskStart = max([taskStart, ganttStartDate]);
                    const effectiveTaskEnd = min([taskEnd, ganttEndDate]);
                    if (effectiveTaskStart > effectiveTaskEnd) return null;
                    const taskStartOffsetDays = differenceInCalendarDays(effectiveTaskStart, ganttStartDate);
                    const taskDurationDays = differenceInCalendarDays(addDays(effectiveTaskEnd, 1), effectiveTaskStart);
                    if (taskDurationDays <= 0) return null;

                    const currentTaskHeight = task.type === 'milestone' ? taskHeight * 0.8 : taskHeight;
                    const x = taskStartOffsetDays * scale;
                    const y = index * rowHeight + (rowHeight - currentTaskHeight) / 2; // Corrected y calculation
                    const width = Math.max(0, taskDurationDays * scale - 1);
                    taskPositions[task.id] = { x, y, width };
                    const baseStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: width,
                        height: currentTaskHeight, // Corrected height usage
                        zIndex: 1,
                    };
                    const finalStyle = getTaskBarStyle(task, index, baseStyle);

                    // Do not render the original task if its ghost is active (and it's the same task)
                    if (ghostPreviewData?.task.id === `ghost-${task.id}`) {
                        return null; // Or apply an "is-ghosted" style to the original
                    }

                    return (
                        <TaskBar
                            key={task.id}
                            task={task}
                            taskBarStyle={finalStyle}
                            scale={scale}
                            onTaskUpdate={onTaskUpdate}
                        />
                    );
                })}

                {/* Render Ghost Preview TaskBar */}
                {ghostPreviewData && (
                    <TaskBar
                        key={ghostPreviewData.task.id}
                        task={ghostPreviewData.task}
                        taskBarStyle={ghostPreviewData.style}
                        scale={scale}
                        onTaskUpdate={() => { }} // Ghost doesn't update, it's a preview
                        onTaskBarClick={() => { }} // Ghost is not clickable
                    />
                )}

                <DependencyArrows
                    tasks={tasks}
                    taskPositions={taskPositions}
                    taskHeight={taskHeight} // Use prop taskHeight
                />
            </div>
        </div>
    );
};

export default Timeline; 