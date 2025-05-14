"use client";

import React, { useRef } from 'react';
import { Task, ViewMode } from './types';
import { TaskBar } from "./TaskBar";
import { useDroppable } from '@dnd-kit/core';
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
} from 'date-fns';
import DependencyArrows from './DependencyArrows';

interface TimelineProps {
    viewMode: ViewMode;
    tasks: Task[];
    startDate: Date;
    endDate: Date;
    rowHeight: number;
    taskHeight: number;
    scale: number;
    getTaskDate: (task: Task) => { start: Date; end: Date };
    getTaskBarStyle: (task: Task, index: number, calculatedStyle: React.CSSProperties) => React.CSSProperties;
    showGrid?: boolean;
}

interface TaskPosition {
    x: number;
    y: number;
    width: number;
}

export const TIMELINE_DROPPABLE_ID = 'timeline-droppable-area';

const Timeline: React.FC<TimelineProps> = ({
    viewMode,
    tasks,
    startDate: ganttStartDate,
    endDate: ganttEndDate,
    rowHeight,
    taskHeight,
    scale,
    getTaskDate,
    getTaskBarStyle,
    showGrid = true,
}) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const { setNodeRef: setDroppableNodeRef, isOver: isDragOverTimeline } = useDroppable({
        id: TIMELINE_DROPPABLE_ID,
    });

    const totalTimelineDays = differenceInCalendarDays(ganttEndDate, ganttStartDate) + 1;
    const preciseTimelineWidth = totalTimelineDays * scale;

    const taskPositions: Record<string, TaskPosition> = {};

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
                ref={(node) => {
                    setDroppableNodeRef(node);
                    (timelineRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                }}
                className={`relative ${isDragOverTimeline ? 'bg-slate-100 dark:bg-slate-700 transition-colors duration-100' : ''}`}
                style={{ width: `${preciseTimelineWidth}px`, height: `${Math.max(tasks.length, 1) * rowHeight}px` }}
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
                    const y = index * rowHeight + (rowHeight - currentTaskHeight) / 2;
                    const width = Math.max(0, taskDurationDays * scale - 1);
                    taskPositions[task.id] = { x, y, width };
                    const baseStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: width,
                        height: currentTaskHeight,
                        zIndex: 1,
                    };
                    const finalStyle = getTaskBarStyle(task, index, baseStyle);

                    return (
                        <TaskBar
                            key={task.id}
                            task={task}
                            taskBarStyle={finalStyle}
                            onTaskBarClick={() => { /* Handle click */ }}
                            isOverlay={false}
                        />
                    );
                })}

                <DependencyArrows
                    tasks={tasks}
                    taskPositions={taskPositions}
                    taskHeight={taskHeight}
                />
            </div>
        </div>
    );
};

export default Timeline; 