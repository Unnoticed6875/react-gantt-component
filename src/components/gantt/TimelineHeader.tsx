"use client";

import React from 'react';
import {
    format,
    differenceInDays,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachYearOfInterval,
    startOfWeek,
    startOfMonth,
    getDay,
    getMonth,
    endOfWeek,
    addMonths,
    min,
    max,
    getYear,
} from 'date-fns';
import { ViewMode } from './types';

interface TimelineHeaderProps {
    viewMode: ViewMode;
    startDate: Date;
    endDate: Date;
    scale: number;
    scrollLeft: number;
}

const GANTT_HEADER_HEIGHT = 50;

const getHeaderFormats = (viewMode: ViewMode, /* scale: number */) => {
    switch (viewMode) {
        case 'day':
            return { top: 'MMMM yyyy', bottom: 'd' };
        case 'week':
            return { top: 'MMMM yyyy', bottom: '' };
        case 'month':
            return { top: 'yyyy', bottom: 'MMMM' };
        case 'year':
            return { top: '', bottom: 'yyyy' };
        default:
            return { top: '', bottom: '' };
    }
};

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    viewMode,
    startDate,
    endDate,
    scale,
    scrollLeft,
}) => {
    const topHeaderRef = React.useRef<HTMLDivElement>(null);
    const bottomHeaderRef = React.useRef<HTMLDivElement>(null);

    const formats = getHeaderFormats(viewMode /*, scale */);
    const topHeaders: React.ReactNode[] = [];
    const bottomColumns: React.ReactNode[] = [];

    const totalHeaderHeight = GANTT_HEADER_HEIGHT;
    const topHeaderHeight = viewMode === 'year' ? 0 : Math.floor(totalHeaderHeight * 0.4);
    const bottomHeaderHeight = totalHeaderHeight - topHeaderHeight;

    const totalDays = differenceInDays(endDate, startDate) + 1;
    const totalWidth = totalDays * scale;

    const commonCellStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '1px solid var(--gantt-border-color, #e5e7eb)',
        fontSize: '0.8rem',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
    };

    switch (viewMode) {
        case 'day': {
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            let currentMonth = -1;
            let currentMonthWidth = 0;

            days.forEach((day, index) => {
                bottomColumns.push(
                    <div
                        key={`bottom-${index}`}
                        style={{ ...commonCellStyle, minWidth: scale, width: scale, height: `${bottomHeaderHeight}px`, backgroundColor: (getDay(day) === 0 || getDay(day) === 6) ? 'var(--gantt-weekend-bg, #f9fafb)' : 'inherit', borderTop: '1px solid var(--gantt-border-color, #e5e7eb)' }}
                        className="gantt-timeline-header-column text-xs font-medium text-gray-600 dark:text-gray-400"
                        title={format(day, 'EEEE, MMM d, yyyy')}
                    >
                        {format(day, formats.bottom)}
                    </div>
                );

                const month = getMonth(day);
                if (month !== currentMonth) {
                    if (currentMonth !== -1) {
                        const monthStartDate = startOfMonth(addMonths(day, -1));
                        topHeaders.push(
                            <div
                                key={`top-${currentMonth}`}
                                style={{ ...commonCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                                className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                            >
                                {format(monthStartDate, formats.top)}
                            </div>
                        );
                    }
                    currentMonth = month;
                    currentMonthWidth = scale;
                } else {
                    currentMonthWidth += scale;
                }

                if (index === days.length - 1) {
                    const monthStartDate = startOfMonth(day);
                    topHeaders.push(
                        <div
                            key={`top-${currentMonth}`}
                            style={{ ...commonCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                            className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                        >
                            {format(monthStartDate, formats.top)}
                        </div>
                    );
                }
            });
            break;
        }
        case 'week': {
            const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
            let currentMonthYear = -1;
            let currentMonthYearWidth = 0;

            weeks.forEach((weekStartRaw, index) => {
                const weekStart = startOfWeek(weekStartRaw);
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

                const displayStartDate = max([weekStart, startDate]);
                const displayEndDate = min([weekEnd, endDate]);
                const daysInView = differenceInDays(displayEndDate, displayStartDate) + 1;
                const columnActualWidth = daysInView * scale;

                let label = `W${format(weekStart, 'w')}`;
                if (scale * 7 > 70) {
                    label += ` (${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')})`;
                }

                bottomColumns.push(
                    <div
                        key={`bottom-${index}`}
                        style={{ ...commonCellStyle, minWidth: columnActualWidth, width: columnActualWidth, height: `${bottomHeaderHeight}px`, borderTop: '1px solid var(--gantt-border-color, #e5e7eb)' }}
                        className="gantt-timeline-header-column text-xs font-medium text-gray-600 dark:text-gray-400"
                        title={`${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
                    >
                        {label}
                    </div>
                );

                const monthYearKey = parseInt(format(weekStart, 'yyyyMM'));
                if (monthYearKey !== currentMonthYear) {
                    if (currentMonthYear !== -1) {
                        const spanStartDate = startOfMonth(new Date(Math.floor(currentMonthYear / 100), (currentMonthYear % 100) - 1, 1));
                        topHeaders.push(
                            <div
                                key={`top-${currentMonthYear}`}
                                style={{ ...commonCellStyle, width: currentMonthYearWidth, minWidth: currentMonthYearWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                                className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                            >
                                {format(spanStartDate, formats.top)}
                            </div>
                        );
                    }
                    currentMonthYear = monthYearKey;
                    currentMonthYearWidth = columnActualWidth;
                } else {
                    currentMonthYearWidth += columnActualWidth;
                }

                if (index === weeks.length - 1) {
                    const spanStartDate = startOfMonth(weekStart);
                    topHeaders.push(
                        <div
                            key={`top-${currentMonthYear}`}
                            style={{ ...commonCellStyle, width: currentMonthYearWidth, minWidth: currentMonthYearWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                            className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                        >
                            {format(spanStartDate, formats.top)}
                        </div>
                    );
                }
            });
            break;
        }
        case 'month': {
            const months = eachMonthOfInterval({ start: startDate, end: endDate });
            let currentYear = -1;
            let currentYearWidth = 0;

            months.forEach((monthStartRaw, index) => {
                const monthStart = startOfWeek(monthStartRaw);
                const monthEnd = endOfWeek(monthStart, { weekStartsOn: 1 });

                const displayStartDate = max([monthStart, startDate]);
                const displayEndDate = min([monthEnd, endDate]);
                const daysInView = differenceInDays(displayEndDate, displayStartDate) + 1;
                const columnActualWidth = daysInView * scale;

                bottomColumns.push(
                    <div
                        key={`bottom-${index}`}
                        style={{ ...commonCellStyle, minWidth: columnActualWidth, width: columnActualWidth, height: `${bottomHeaderHeight}px`, borderTop: '1px solid var(--gantt-border-color, #e5e7eb)' }}
                        className="gantt-timeline-header-column text-xs font-medium text-gray-600 dark:text-gray-400"
                    >
                        {format(monthStart, formats.bottom)}
                    </div>
                );

                const year = getYear(monthStart);
                if (year !== currentYear) {
                    if (currentYear !== -1) {
                        const yearStartDate = new Date(currentYear, 0, 1);
                        topHeaders.push(
                            <div
                                key={`top-${currentYear}`}
                                style={{ ...commonCellStyle, width: currentYearWidth, minWidth: currentYearWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                                className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                            >
                                {format(yearStartDate, formats.top)}
                            </div>
                        );
                    }
                    currentYear = year;
                    currentYearWidth = columnActualWidth;
                } else {
                    currentYearWidth += columnActualWidth;
                }

                if (index === months.length - 1) {
                    const yearStartDate = new Date(currentYear, 0, 1);
                    topHeaders.push(
                        <div
                            key={`top-${currentYear}`}
                            style={{ ...commonCellStyle, width: currentYearWidth, minWidth: currentYearWidth, height: `${topHeaderHeight}px`, justifyContent: 'center' }}
                            className="gantt-timeline-header-top text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
                        >
                            {format(yearStartDate, formats.top)}
                        </div>
                    );
                }
            });
            break;
        }
        case 'year': {
            const years = eachYearOfInterval({ start: startDate, end: endDate });
            years.forEach((yearStartRaw, index) => {
                const yearStart = startOfWeek(yearStartRaw);
                const yearEnd = endOfWeek(yearStart, { weekStartsOn: 1 });

                const displayStartDate = max([yearStart, startDate]);
                const displayEndDate = min([yearEnd, endDate]);
                const daysInView = differenceInDays(displayEndDate, displayStartDate) + 1;
                const columnActualWidth = daysInView * scale;

                bottomColumns.push(
                    <div
                        key={`bottom-${index}`}
                        style={{ ...commonCellStyle, minWidth: columnActualWidth, width: columnActualWidth, height: `${bottomHeaderHeight}px`, borderTop: '1px solid var(--gantt-border-color, #e5e7eb)' }}
                        className="gantt-timeline-header-column text-xs font-semibold text-gray-700 dark:text-gray-300"
                    >
                        {format(yearStart, formats.bottom)}
                    </div>
                );
            });
            break;
        }
    }

    return (
        <div
            className="gantt-timeline-header sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-l border-gray-300 dark:border-gray-700 select-none"
            style={{
                height: `${totalHeaderHeight}px`,
                minHeight: `${totalHeaderHeight}px`,
                overflow: 'hidden',
            }}
        >
            <div
                className="relative"
                style={{
                    width: `${totalWidth}px`,
                    height: `${totalHeaderHeight}px`,
                    transform: `translateX(-${scrollLeft}px)`,
                }}
            >
                {topHeaders.length > 0 && (
                    <div
                        ref={topHeaderRef}
                        className="gantt-timeline-topheader absolute top-0 left-0 flex"
                        style={{ width: `${totalWidth}px`, height: `${topHeaderHeight}px` }}
                    >
                        {topHeaders}
                    </div>
                )}
                <div
                    ref={bottomHeaderRef}
                    className="gantt-timeline-bottomheader absolute bottom-0 left-0 flex"
                    style={{ width: `${totalWidth}px`, height: `${bottomHeaderHeight}px` }}
                >
                    {bottomColumns}
                </div>
            </div>
        </div>
    );
};

export default TimelineHeader; 