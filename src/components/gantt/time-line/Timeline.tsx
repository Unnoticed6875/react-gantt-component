"use client";

import React, { useRef } from 'react';
import { Task, ViewMode } from '../types';
import { TaskBar } from "../TaskBar";
import { useDroppable } from '@dnd-kit/core';
import {
    differenceInCalendarDays,
    addDays,
    max,
    min,
} from 'date-fns';
import DependencyArrows from '../DependencyArrows';
import TimelineGrid from './TimelineGrid';

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
                <TimelineGrid
                    ganttStartDate={ganttStartDate}
                    ganttEndDate={ganttEndDate}
                    scale={scale}
                    rowHeight={rowHeight}
                    totalRowCount={tasks.length}
                    preciseTimelineWidth={preciseTimelineWidth}
                    viewMode={viewMode}
                    showGrid={showGrid}
                />

                {tasks.map((task, index) => {
                    const { start: taskStart, end: taskEnd } = getTaskDate(task);
                    const effectiveTaskStart = max([taskStart, ganttStartDate]);
                    const effectiveTaskEnd = min([taskEnd, ganttEndDate]);
                    if (effectiveTaskStart > effectiveTaskEnd) return null;
                    const taskStartOffsetDays = differenceInCalendarDays(effectiveTaskStart, ganttStartDate);
                    const taskDurationDays = differenceInCalendarDays(addDays(effectiveTaskEnd, 1), effectiveTaskStart);
                    if (taskDurationDays <= 0 && task.type !== 'milestone') return null;
                    const milestoneDurationDays = 0.2;
                    const displayDurationDays = task.type === 'milestone' && taskDurationDays <= 0 ? milestoneDurationDays : taskDurationDays;
                    if (displayDurationDays <= 0) return null;

                    const currentTaskHeight = task.type === 'milestone' ? taskHeight * 0.8 : taskHeight;
                    const x = taskStartOffsetDays * scale;
                    const y = index * rowHeight + (rowHeight - currentTaskHeight) / 2;
                    const width = Math.max(task.type === 'milestone' ? scale * milestoneDurationDays : 0, displayDurationDays * scale - 1);

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
                            onTaskBarClick={() => { /* TODO: Handle task bar click, e.g., select task, open details */ }}
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