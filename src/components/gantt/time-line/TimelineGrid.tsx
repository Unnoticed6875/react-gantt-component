"use client";

import React from 'react';
import { ViewMode } from '../types';
import {
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    startOfWeek,
    startOfMonth,
    startOfQuarter,
    startOfYear,
    differenceInCalendarDays,
} from 'date-fns';

interface TimelineGridProps {
    ganttStartDate: Date;
    ganttEndDate: Date;
    scale: number;
    rowHeight: number;
    totalRowCount: number; // tasks.length or similar
    preciseTimelineWidth: number;
    viewMode: ViewMode;
    showGrid?: boolean;
}

const TimelineGrid: React.FC<TimelineGridProps> = ({
    ganttStartDate,
    ganttEndDate,
    scale,
    rowHeight,
    totalRowCount,
    preciseTimelineWidth,
    viewMode,
    showGrid = true,
}) => {
    if (!showGrid) return null;

    const renderVerticalGridLines = () => {
        const lines: React.JSX.Element[] = [];

        // Fine grid lines for high zoom levels (e.g., daily when scale is large)
        if (scale >= 3) { // Threshold for showing daily lines even in week/month view if zoomed in enough
            const days = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });
            days.forEach((day, index) => {
                lines.push(
                    <div
                        key={`fine-grid-col-${index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-200 dark:border-gray-700 opacity-50"
                        style={{ left: index * scale, width: scale }} // width: scale creates a fill for the day cell
                    />
                );
            });
        }

        // Major interval lines based on viewMode
        let majorIntervals: Date[] = [];
        if (viewMode === 'day' && scale < 3) { // Show daily only if not covered by fine grid
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
            if (offsetDays < 0) return; // Interval starts before ganttStartDate

            const position = offsetDays * scale;
            if (position < preciseTimelineWidth) { // Ensure line is within bounds
                lines.push(
                    <div
                        key={`major-grid-col-${viewMode}-${index}`}
                        className="absolute top-0 bottom-0 border-r border-gray-300 dark:border-gray-500"
                        style={{ left: position, width: 0 }} // Vertical line, width 0
                    />
                );
            }
        });
        return lines;
    };

    const renderHorizontalGridLines = () => {
        const lines: React.JSX.Element[] = [];
        for (let i = 0; i < totalRowCount; i++) {
            lines.push(
                <div
                    key={`grid-row-${i}`}
                    className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-600"
                    style={{ top: (i + 1) * rowHeight - 1, height: 1, zIndex: 0 }}
                />
            );
        }
        return lines;
    };

    return (
        <>
            {renderVerticalGridLines()}
            {renderHorizontalGridLines()}
        </>
    );
};

export default TimelineGrid; 