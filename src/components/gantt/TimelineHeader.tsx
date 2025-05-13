"use client";

import React, { useLayoutEffect, useRef } from 'react';
import {
    format,
    differenceInCalendarDays,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    endOfWeek,
    endOfMonth,
    endOfQuarter,
    endOfYear,
    getDay,
    getQuarter,
    min,
    max,
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

const getHeaderFormats = (viewMode: ViewMode) => {
    switch (viewMode) {
        case 'day':
            return { top: 'MMMM yyyy', bottom: 'd' };
        case 'week':
            return { top: 'MMMM yyyy', bottom: 'w' };
        case 'month':
            return { top: 'yyyy', bottom: 'MMMM' };
        case 'quarter':
            return { top: 'yyyy', bottom: '' };
        case 'year':
            return { top: '', bottom: 'yyyy' };
        default:
            return { top: 'MMMM yyyy', bottom: 'd' };
    }
};

const getVisibleDays = (d1: Date, d2: Date, ganttStart: Date, ganttEnd: Date): number => {
    const effectiveStart = max([d1, ganttStart]);
    const effectiveEnd = min([d2, ganttEnd]);
    if (effectiveStart > effectiveEnd) return 0;
    return differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
};

const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    viewMode,
    startDate: ganttStartDate,
    endDate: ganttEndDate,
    scale,
    scrollLeft,
}) => {
    const topHeaderRef = useRef<HTMLDivElement>(null);
    const bottomHeaderRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (topHeaderRef.current) {
            topHeaderRef.current.style.transform = `translateX(-${scrollLeft}px)`;
        }
        if (bottomHeaderRef.current) {
            bottomHeaderRef.current.style.transform = `translateX(-${scrollLeft}px)`;
        }
    }, [scrollLeft]);

    const formats = getHeaderFormats(viewMode);
    const topHeaderCells: React.JSX.Element[] = [];
    const bottomHeaderCells: React.JSX.Element[] = [];

    const totalHeaderHeight = GANTT_HEADER_HEIGHT;
    const topHeaderHeight = formats.top ? Math.floor(totalHeaderHeight * 0.4) : 0;
    const bottomHeaderHeight = totalHeaderHeight - topHeaderHeight;

    const commonCellStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '1px solid var(--gantt-border-color, #e5e7eb)',
        fontSize: '0.75rem',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        textOverflow: 'ellipsis',
    };

    const topCellStyle: React.CSSProperties = {
        ...commonCellStyle,
        height: `${topHeaderHeight}px`,
        backgroundColor: 'var(--gantt-header-bg-top, #f9fafb)',
        fontWeight: '600',
        color: 'var(--gantt-header-text-top, #374151)',
        borderBottom: topHeaderHeight > 0 ? '1px solid var(--gantt-border-color, #e5e7eb)' : 'none',
    };

    const bottomCellStyleBase: React.CSSProperties = {
        ...commonCellStyle,
        height: `${bottomHeaderHeight}px`,
        backgroundColor: 'var(--gantt-header-bg-bottom, #ffffff)',
        color: 'var(--gantt-header-text-bottom, #4b5563)',
    };
    if (topHeaderHeight === 0 && bottomHeaderHeight > 0) {
        bottomCellStyleBase.borderTop = '1px solid var(--gantt-border-color, #e5e7eb)';
    }

    const overallTotalDays = differenceInCalendarDays(ganttEndDate, ganttStartDate) + 1;
    const totalWidth = overallTotalDays * scale;

    switch (viewMode) {
        case 'day': {
            const days = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });
            let currentMonthYearLabel = "";
            let currentMonthWidth = 0;

            days.forEach((day, index) => {
                const dayWidth = scale;
                bottomHeaderCells.push(
                    <div
                        key={`day-bottom-${index}`}
                        style={{
                            ...bottomCellStyleBase,
                            width: dayWidth,
                            minWidth: dayWidth,
                            backgroundColor: (getDay(day) === 0 || getDay(day) === 6) ? 'var(--gantt-weekend-bg, #f3f4f6)' : bottomCellStyleBase.backgroundColor,
                        }}
                        title={format(day, 'EEEE, MMM d, yyyy')}
                    >
                        {format(day, formats.bottom)}
                    </div>
                );

                const monthYearLabel = format(day, formats.top);
                if (monthYearLabel !== currentMonthYearLabel) {
                    if (currentMonthYearLabel) {
                        topHeaderCells.push(
                            <div key={`day-top-${currentMonthYearLabel}`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>
                                {currentMonthYearLabel}
                            </div>
                        );
                    }
                    currentMonthYearLabel = monthYearLabel;
                    currentMonthWidth = dayWidth;
                } else {
                    currentMonthWidth += dayWidth;
                }

                if (index === days.length - 1) {
                    topHeaderCells.push(
                        <div key={`day-top-${currentMonthYearLabel}-last`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>
                            {currentMonthYearLabel}
                        </div>
                    );
                }
            });
            break;
        }
        case 'week': {
            const weeks = eachWeekOfInterval({ start: ganttStartDate, end: ganttEndDate }, { weekStartsOn: 1 });
            let currentMonthYearLabel = "";
            let currentMonthWidth = 0;

            weeks.forEach((weekStartOriginal, index) => {
                const weekEndOriginal = endOfWeek(weekStartOriginal, { weekStartsOn: 1 });

                const daysInWeek = getVisibleDays(weekStartOriginal, weekEndOriginal, ganttStartDate, ganttEndDate);
                if (daysInWeek === 0) return;

                const weekWidth = daysInWeek * scale;

                let weekLabel = `W${format(weekStartOriginal, formats.bottom)}`;
                if (weekWidth > 80) {
                    const displayWeekStart = max([weekStartOriginal, ganttStartDate]);
                    const displayWeekEnd = min([weekEndOriginal, ganttEndDate]);
                    weekLabel = `${format(displayWeekStart, 'MMM d')} - ${format(displayWeekEnd, 'MMM d')}`;
                } else if (weekWidth < 30) {
                    weekLabel = format(weekStartOriginal, formats.bottom);
                }

                bottomHeaderCells.push(
                    <div
                        key={`week-bottom-${index}`}
                        style={{ ...bottomCellStyleBase, width: weekWidth, minWidth: weekWidth }}
                        title={`${format(weekStartOriginal, 'MMM d')} - ${format(weekEndOriginal, 'MMM d, yyyy')}`}
                    >
                        {weekLabel}
                    </div>
                );

                const monthYearLabel = format(weekStartOriginal, formats.top);
                if (monthYearLabel !== currentMonthYearLabel) {
                    if (currentMonthYearLabel) {
                        topHeaderCells.push(
                            <div key={`week-top-${currentMonthYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>
                                {currentMonthYearLabel}
                            </div>
                        );
                    }
                    currentMonthYearLabel = monthYearLabel;
                    currentMonthWidth = weekWidth;
                } else {
                    currentMonthWidth += weekWidth;
                }

                if (index === weeks.length - 1) {
                    topHeaderCells.push(
                        <div key={`week-top-${currentMonthYearLabel}-last`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>
                            {currentMonthYearLabel}
                        </div>
                    );
                }
            });
            break;
        }
        case 'month': {
            const months = eachMonthOfInterval({ start: ganttStartDate, end: ganttEndDate });
            let currentYearLabel = "";
            let currentYearWidth = 0;

            months.forEach((monthStartOriginal, index) => {
                const monthEndOriginal = endOfMonth(monthStartOriginal);
                const daysInMonth = getVisibleDays(monthStartOriginal, monthEndOriginal, ganttStartDate, ganttEndDate);
                if (daysInMonth === 0) return;

                const monthWidth = daysInMonth * scale;

                bottomHeaderCells.push(
                    <div
                        key={`month-bottom-${index}`}
                        style={{ ...bottomCellStyleBase, width: monthWidth, minWidth: monthWidth }}
                        title={format(monthStartOriginal, 'MMMM yyyy')}
                    >
                        {format(monthStartOriginal, formats.bottom)}
                    </div>
                );

                const yearLabel = format(monthStartOriginal, formats.top);
                if (yearLabel !== currentYearLabel) {
                    if (currentYearLabel) {
                        topHeaderCells.push(
                            <div key={`month-top-${currentYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>
                                {currentYearLabel}
                            </div>
                        );
                    }
                    currentYearLabel = yearLabel;
                    currentYearWidth = monthWidth;
                } else {
                    currentYearWidth += monthWidth;
                }

                if (index === months.length - 1) {
                    topHeaderCells.push(
                        <div key={`month-top-${currentYearLabel}-last`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>
                            {currentYearLabel}
                        </div>
                    );
                }
            });
            break;
        }
        case 'quarter': {
            const quarters = eachQuarterOfInterval({ start: ganttStartDate, end: ganttEndDate });
            let currentYearLabel = "";
            let currentYearWidth = 0;

            quarters.forEach((quarterStartOriginal, index) => {
                const quarterEndOriginal = endOfQuarter(quarterStartOriginal);
                const daysInQuarter = getVisibleDays(quarterStartOriginal, quarterEndOriginal, ganttStartDate, ganttEndDate);
                if (daysInQuarter === 0) return;

                const quarterWidth = daysInQuarter * scale;
                const quarterNum = getQuarter(quarterStartOriginal);

                bottomHeaderCells.push(
                    <div
                        key={`quarter-bottom-${index}`}
                        style={{ ...bottomCellStyleBase, width: quarterWidth, minWidth: quarterWidth }}
                        title={`Q${quarterNum} ${format(quarterStartOriginal, 'yyyy')}`}
                    >
                        {`Q${quarterNum}`}
                    </div>
                );

                const yearLabel = format(quarterStartOriginal, formats.top);
                if (yearLabel !== currentYearLabel) {
                    if (currentYearLabel) {
                        topHeaderCells.push(
                            <div key={`quarter-top-${currentYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>
                                {currentYearLabel}
                            </div>
                        );
                    }
                    currentYearLabel = yearLabel;
                    currentYearWidth = quarterWidth;
                } else {
                    currentYearWidth += quarterWidth;
                }

                if (index === quarters.length - 1) {
                    topHeaderCells.push(
                        <div key={`quarter-top-${currentYearLabel}-last`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>
                            {currentYearLabel}
                        </div>
                    );
                }
            });
            break;
        }
        case 'year': {
            const years = eachYearOfInterval({ start: ganttStartDate, end: ganttEndDate });
            years.forEach((yearStartOriginal, index) => {
                const yearEndOriginal = endOfYear(yearStartOriginal);
                const daysInYear = getVisibleDays(yearStartOriginal, yearEndOriginal, ganttStartDate, ganttEndDate);
                if (daysInYear === 0) return;

                const yearWidth = daysInYear * scale;

                bottomHeaderCells.push(
                    <div
                        key={`year-bottom-${index}`}
                        style={{ ...bottomCellStyleBase, width: yearWidth, minWidth: yearWidth }}
                        title={format(yearStartOriginal, 'yyyy')}
                    >
                        {format(yearStartOriginal, formats.bottom)}
                    </div>
                );
            });
            break;
        }
        default:
            break;
    }

    return (
        <div
            className="gantt-timeline-header sticky top-0 z-10 select-none"
            style={{
                height: `${totalHeaderHeight}px`,
                borderBottom: '1px solid var(--gantt-border-color, #d1d5db)',
            }}
        >
            {topHeaderHeight > 0 && (
                <div
                    className="gantt-timeline-header-top-row flex"
                    style={{ width: totalWidth, height: `${topHeaderHeight}px` }}
                    ref={topHeaderRef}
                >
                    {topHeaderCells}
                </div>
            )}
            <div
                className="gantt-timeline-header-bottom-row flex"
                style={{ width: totalWidth, height: `${bottomHeaderHeight}px` }}
                ref={bottomHeaderRef}
            >
                {bottomHeaderCells}
            </div>
        </div>
    );
};

export default TimelineHeader; 