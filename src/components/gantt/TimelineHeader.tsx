"use client";

import * as React from "react";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval } from 'date-fns';
import { ViewMode } from './types';

interface TimelineHeaderProps {
    startDate: Date;
    endDate: Date;
    columnWidth: number;
    viewMode: ViewMode;
    ganttHeaderHeight: number;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ startDate, endDate, columnWidth, viewMode, ganttHeaderHeight }) => {
    let columns: React.ReactNode[] = [];
    // subHeaders might be used later for more complex headers (e.g. Year > Month > Week)
    // const subHeaders: React.ReactNode[] = []; 

    // This is a placeholder. Actual logic will be more complex.
    // You'll need to adjust how dates are generated and formatted based on viewMode.
    switch (viewMode) {
        case 'day':
            columns = eachDayOfInterval({ start: startDate, end: endDate }).map((day, index) => {
                let dayFormat = 'MMM d';
                if (columnWidth < 35) {
                    dayFormat = 'd';
                }
                return (
                    <div key={index} style={{ minWidth: columnWidth, width: columnWidth }} className="gantt-timeline-header-column border-r border-gray-300 flex items-center justify-center text-xs">
                        {format(day, dayFormat)}
                    </div>
                );
            });
            break;
        case 'week':
            columns = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 }).map((weekStart, index) => {
                // Let's adjust for clarity:
                let label;
                if (columnWidth < 40) {
                    label = format(weekStart, 'w'); // "16"
                } else if (columnWidth < 70) {
                    label = format(weekStart, 'MMM d'); // "Apr 14"
                } else {
                    label = `W${format(weekStart, 'w')} ${format(weekStart, 'MMM d')}`; // "W16 Apr 14"
                }
                return (
                    <div key={index} style={{ minWidth: columnWidth, width: columnWidth }} className="gantt-timeline-header-column border-r border-gray-300 flex items-center justify-center text-xs">
                        {label}
                    </div>
                );
            });
            break;
        case 'month':
            columns = eachMonthOfInterval({ start: startDate, end: endDate }).map((monthStart, index) => {
                let monthFormat = 'MMM yyyy';
                if (columnWidth < 40) {
                    monthFormat = 'MMM';
                } else if (columnWidth < 70) {
                    monthFormat = 'MMM yy';
                }
                return (
                    <div key={index} style={{ minWidth: columnWidth, width: columnWidth }} className="gantt-timeline-header-column border-r border-gray-300 flex items-center justify-center text-xs">
                        {format(monthStart, monthFormat)}
                    </div>
                );
            });
            break;
        case 'year':
            columns = eachYearOfInterval({ start: startDate, end: endDate }).map((yearStart, index) => {
                let yearFormat = 'yyyy';
                if (columnWidth < 40) {
                    yearFormat = 'yy';
                }
                return (
                    <div key={index} style={{ minWidth: columnWidth, width: columnWidth }} className="gantt-timeline-header-column border-r border-gray-300 flex items-center justify-center text-xs">
                        {format(yearStart, yearFormat)}
                    </div>
                );
            });
            break;
        default:
            break;
    }

    return (
        <div
            className="gantt-timeline-header sticky top-0 z-10 bg-gray-200 flex border-b border-gray-300 select-none"
            style={{ height: `${ganttHeaderHeight}px`, minHeight: `${ganttHeaderHeight}px` }}
        >
            {/* Render sub-headers if needed, e.g., months above weeks, or years above months */}
            {/* <div className="gantt-timeline-subheader flex">{subHeaders}</div> */}
            <div className="gantt-timeline-mainheader flex">
                {columns}
            </div>
        </div>
    );
};

export default TimelineHeader; 