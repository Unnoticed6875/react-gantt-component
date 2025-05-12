"use client";

import React from 'react';
import { Task } from './types';
import { TaskBar } from "./TaskBar";
import { differenceInDays, addDays } from 'date-fns';
import DependencyArrows from './DependencyArrows';

interface TimelineProps {
    // viewMode: 'Day' | 'Week' | 'Month' | 'Year'; // Removed as it's unused in this component
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

const Timeline: React.FC<TimelineProps> = ({
    // viewMode, // Removed
    tasks,
    startDate,
    endDate,
    rowHeight,
    taskHeight,
    scale,
    getTaskDate,
    getTaskBarStyle,
    showGrid = true,
}) => {
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const preciseTimelineWidth = totalDays * scale;

    const taskPositions: Record<string, TaskPosition> = {};

    return (
        <div className="flex flex-col h-full w-full">
            <div className="relative" style={{ width: `${preciseTimelineWidth}px`, height: `${tasks.length * rowHeight}px` }}>
                {/* Grid Lines (Vertical) */}
                {showGrid && Array.from({ length: totalDays }).map((_, index) => (
                    <div
                        key={`grid-col-${index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-600"
                        style={{ left: index * scale, width: scale }}
                    />
                ))}
                {/* Horizontal Grid Lines (per task row) */}
                {showGrid && tasks.map((_, index) => (
                    <div
                        key={`grid-row-${index}`}
                        className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-600"
                        style={{ top: (index + 1) * rowHeight - 1, height: 1, zIndex: 0 }}
                    />
                ))}

                {/* Task Bars */}
                {tasks.map((task, index) => {
                    const { start: taskStart, end: taskEnd } = getTaskDate(task);
                    const taskStartOffsetDays = differenceInDays(taskStart, startDate);
                    const taskDurationDays = differenceInDays(addDays(taskEnd, 1), taskStart);

                    if (taskStartOffsetDays < 0 || taskStart > endDate) {
                        console.warn(`Task ${task.id} is outside the current timeline range.`);
                        return null;
                    }

                    const x = taskStartOffsetDays * scale;
                    const y = index * rowHeight + (rowHeight - taskHeight) / 2;
                    const width = taskDurationDays * scale;

                    taskPositions[task.id] = { x, y, width };

                    const baseStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: width,
                        height: taskHeight,
                        zIndex: 1,
                    };

                    const finalStyle = getTaskBarStyle(task, index, baseStyle);

                    return (
                        <TaskBar
                            key={task.id}
                            task={task}
                            taskBarStyle={finalStyle}
                        />
                    );
                })}

                {/* Render Dependency Arrows */}
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