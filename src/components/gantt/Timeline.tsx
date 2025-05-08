"use client";

import * as React from "react";
import { Task, ViewMode } from "./types";
import { TaskBar } from "./TaskBar";
import { differenceInDays, differenceInCalendarWeeks, differenceInCalendarMonths, differenceInCalendarYears } from 'date-fns';

interface TimelineProps {
    tasks: Task[];
    startDate: Date;
    endDate: Date;
    columnWidth: number;
    viewMode: ViewMode;
    rowHeight: number;
    getTaskBarStyle: (task: Task, index: number, calculatedStyle: React.CSSProperties) => React.CSSProperties;
    showGrid?: boolean;

}


const Timeline: React.FC<TimelineProps> = ({
    tasks,
    startDate,
    endDate,
    columnWidth,
    viewMode,
    rowHeight,
    getTaskBarStyle,
    showGrid = true,
}) => {
    let numberOfColumns;
    let getPosition;
    let getTaskWidth;

    switch (viewMode) {
        case 'day':
            numberOfColumns = differenceInDays(endDate, startDate) + 1;
            getPosition = (taskStart: Date) => differenceInDays(taskStart, startDate) * columnWidth;
            getTaskWidth = (taskStart: Date, taskEnd: Date) => (differenceInDays(taskEnd, taskStart) + 1) * columnWidth;
            break;
        case 'week':
            numberOfColumns = differenceInCalendarWeeks(endDate, startDate, { weekStartsOn: 1 }) + 1;
            getPosition = (taskStart: Date) => differenceInCalendarWeeks(taskStart, startDate, { weekStartsOn: 1 }) * columnWidth;
            getTaskWidth = (taskStart: Date, taskEnd: Date) => (differenceInCalendarWeeks(taskEnd, taskStart, { weekStartsOn: 1 }) + 1) * columnWidth;
            break;
        case 'month':
            numberOfColumns = differenceInCalendarMonths(endDate, startDate) + 1;
            getPosition = (taskStart: Date) => differenceInCalendarMonths(taskStart, startDate) * columnWidth;
            getTaskWidth = (taskStart: Date, taskEnd: Date) => (differenceInCalendarMonths(taskEnd, taskStart) + 1) * columnWidth;
            break;
        case 'year':
            numberOfColumns = differenceInCalendarYears(endDate, startDate) + 1;
            getPosition = (taskStart: Date) => differenceInCalendarYears(taskStart, startDate) * columnWidth;
            getTaskWidth = (taskStart: Date, taskEnd: Date) => (differenceInCalendarYears(taskEnd, taskStart) + 1) * columnWidth;
            break;
        default:
            numberOfColumns = 0;
            getPosition = () => 0;
            getTaskWidth = () => 0;
    }

    const totalWidth = numberOfColumns * columnWidth;

    return (
        <div className="flex flex-col h-full w-full">

            <div className="relative" style={{ width: `${totalWidth}px`, height: `${tasks.length * rowHeight}px` }}>
                {/* Grid Lines (Vertical) */}
                {showGrid && Array.from({ length: numberOfColumns }).map((_, index) => (
                    <div
                        key={`vline-${index}`}
                        className="absolute top-0 bottom-0 border-r border-dashed border-gray-500 z-10"
                        style={{ left: `${index * columnWidth}px`, width: `${columnWidth}px` }}
                    />
                ))}
                {/* Horizontal Grid Lines (per task row) */}
                {showGrid && tasks.map((_, index) => (
                    <div
                        key={`hline-${index}`}
                        className="absolute left-0 right-0 border-b border-dashed border-gray-500 z-10"
                        style={{ top: `${(index + 1) * rowHeight}px`, height: `0px` }}
                    />
                ))}

                {/* Task Bars */}
                {tasks.map((task, index) => {
                    const taskStart = task.start;
                    const taskEnd = task.end;

                    if (!taskStart || !taskEnd || taskStart > endDate || taskEnd < startDate) {
                        return null;
                    }

                    const left = getPosition(taskStart < startDate ? startDate : taskStart);
                    const effectiveTaskEnd = taskEnd > endDate ? endDate : taskEnd;
                    const effectiveTaskStart = taskStart < startDate ? startDate : taskStart;
                    let width = getTaskWidth(effectiveTaskStart, effectiveTaskEnd);

                    if (width < 0) width = 0; // Ensure width is not negative

                    const taskSpecificStyles: React.CSSProperties = {
                        left: `${left}px`,
                        width: `${width}px`,
                        // height: '80%', // Consider making this configurable or based on rowHeight
                        // top: `${index * rowHeight + (rowHeight * 0.1)}px`, // Centered within the row
                        position: 'absolute'
                    };

                    return (
                        <TaskBar
                            key={task.id}
                            task={task}
                            taskBarStyle={getTaskBarStyle(task, index, taskSpecificStyles)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline; 