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
import { ViewMode } from '../types';

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
        case 'day': return { top: 'MMMM yyyy', bottom: 'd' };
        case 'week': return { top: 'MMMM yyyy', bottom: 'w' }; // 'w' for week number, might need custom logic for date range
        case 'month': return { top: 'yyyy', bottom: 'MMMM' };
        case 'quarter': return { top: 'yyyy', bottom: '' }; // Quarter might be Q1, Q2 etc.
        case 'year': return { top: '', bottom: 'yyyy' };
        default: return { top: 'MMMM yyyy', bottom: 'd' };
    }
};

const getVisibleDays = (d1: Date, d2: Date, ganttStart: Date, ganttEnd: Date): number => {
    const effectiveStart = max([d1, ganttStart]);
    const effectiveEnd = min([d2, ganttEnd]);
    if (effectiveStart > effectiveEnd) return 0;
    return differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
};

interface HeaderCellProps {
    ganttStartDate: Date;
    ganttEndDate: Date;
    scale: number;
    formats: { top: string; bottom: string };
    topCellStyle: React.CSSProperties;
    bottomCellStyle: React.CSSProperties;
}

// --- Helper function for Day View ---
const generateDayViewHeaders = (props: HeaderCellProps) => {
    const { ganttStartDate, ganttEndDate, scale, formats, topCellStyle, bottomCellStyle } = props;
    const topCells: React.JSX.Element[] = [];
    const bottomCells: React.JSX.Element[] = [];
    const days = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });
    let currentMonthYearLabel = "";
    let currentMonthWidth = 0;

    days.forEach((day, index) => {
        const dayWidth = scale;
        bottomCells.push(
            <div
                key={`day-bottom-${index}`}
                style={{
                    ...bottomCellStyle,
                    width: dayWidth, minWidth: dayWidth,
                    backgroundColor: (getDay(day) === 0 || getDay(day) === 6) ? 'var(--gantt-weekend-bg, #f3f4f6)' : bottomCellStyle.backgroundColor,
                }}
                title={format(day, 'EEEE, MMM d, yyyy')}
            >
                {format(day, formats.bottom)}
            </div>
        );
        const monthYearLabel = format(day, formats.top);
        if (monthYearLabel !== currentMonthYearLabel) {
            if (currentMonthYearLabel) {
                topCells.push(<div key={`day-top-${currentMonthYearLabel}`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>{currentMonthYearLabel}</div>);
            }
            currentMonthYearLabel = monthYearLabel;
            currentMonthWidth = dayWidth;
        } else {
            currentMonthWidth += dayWidth;
        }
        if (index === days.length - 1) {
            topCells.push(<div key={`day-top-${currentMonthYearLabel}-last`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>{currentMonthYearLabel}</div>);
        }
    });
    return { topHeaderCells: topCells, bottomHeaderCells: bottomCells };
};

// --- Helper function for Week View ---
const generateWeekViewHeaders = (props: HeaderCellProps) => {
    const { ganttStartDate, ganttEndDate, scale, formats, topCellStyle, bottomCellStyle } = props;
    const topCells: React.JSX.Element[] = [];
    const bottomCells: React.JSX.Element[] = [];
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
        bottomCells.push(
            <div key={`week-bottom-${index}`} style={{ ...bottomCellStyle, width: weekWidth, minWidth: weekWidth }} title={`${format(weekStartOriginal, 'MMM d')} - ${format(weekEndOriginal, 'MMM d, yyyy')}`}>
                {weekLabel}
            </div>
        );
        const monthYearLabel = format(weekStartOriginal, formats.top);
        if (monthYearLabel !== currentMonthYearLabel) {
            if (currentMonthYearLabel) {
                topCells.push(<div key={`week-top-${currentMonthYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>{currentMonthYearLabel}</div>);
            }
            currentMonthYearLabel = monthYearLabel;
            currentMonthWidth = weekWidth;
        } else {
            currentMonthWidth += weekWidth;
        }
        if (index === weeks.length - 1) {
            topCells.push(<div key={`week-top-${currentMonthYearLabel}-last`} style={{ ...topCellStyle, width: currentMonthWidth, minWidth: currentMonthWidth }}>{currentMonthYearLabel}</div>);
        }
    });
    return { topHeaderCells: topCells, bottomHeaderCells: bottomCells };
};

// --- Helper function for Month View ---
const generateMonthViewHeaders = (props: HeaderCellProps) => {
    const { ganttStartDate, ganttEndDate, scale, formats, topCellStyle, bottomCellStyle } = props;
    const topCells: React.JSX.Element[] = [];
    const bottomCells: React.JSX.Element[] = [];
    const months = eachMonthOfInterval({ start: ganttStartDate, end: ganttEndDate });
    let currentYearLabel = "";
    let currentYearWidth = 0;

    months.forEach((monthStartOriginal, index) => {
        const monthEndOriginal = endOfMonth(monthStartOriginal);
        const daysInMonth = getVisibleDays(monthStartOriginal, monthEndOriginal, ganttStartDate, ganttEndDate);
        if (daysInMonth === 0) return;
        const monthWidth = daysInMonth * scale;
        bottomCells.push(
            <div key={`month-bottom-${index}`} style={{ ...bottomCellStyle, width: monthWidth, minWidth: monthWidth }} title={format(monthStartOriginal, 'MMMM yyyy')}>
                {format(monthStartOriginal, formats.bottom)}
            </div>
        );
        const yearLabel = format(monthStartOriginal, formats.top);
        if (yearLabel !== currentYearLabel) {
            if (currentYearLabel) {
                topCells.push(<div key={`month-top-${currentYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>{currentYearLabel}</div>);
            }
            currentYearLabel = yearLabel;
            currentYearWidth = monthWidth;
        } else {
            currentYearWidth += monthWidth;
        }
        if (index === months.length - 1) {
            topCells.push(<div key={`month-top-${currentYearLabel}-last`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>{currentYearLabel}</div>);
        }
    });
    return { topHeaderCells: topCells, bottomHeaderCells: bottomCells };
};

// --- Helper function for Quarter View ---
const generateQuarterViewHeaders = (props: HeaderCellProps) => {
    const { ganttStartDate, ganttEndDate, scale, formats, topCellStyle, bottomCellStyle } = props;
    const topCells: React.JSX.Element[] = [];
    const bottomCells: React.JSX.Element[] = [];
    const quarters = eachQuarterOfInterval({ start: ganttStartDate, end: ganttEndDate });
    let currentYearLabel = "";
    let currentYearWidth = 0;

    quarters.forEach((quarterStartOriginal, index) => {
        const quarterEndOriginal = endOfQuarter(quarterStartOriginal);
        const daysInQuarter = getVisibleDays(quarterStartOriginal, quarterEndOriginal, ganttStartDate, ganttEndDate);
        if (daysInQuarter === 0) return;
        const quarterWidth = daysInQuarter * scale;
        const quarterLabel = `Q${getQuarter(quarterStartOriginal)}`;
        bottomCells.push(
            <div key={`quarter-bottom-${index}`} style={{ ...bottomCellStyle, width: quarterWidth, minWidth: quarterWidth }} title={`${quarterLabel} ${format(quarterStartOriginal, 'yyyy')}`}>
                {quarterLabel}
            </div>
        );
        const yearLabel = format(quarterStartOriginal, formats.top);
        if (yearLabel !== currentYearLabel) {
            if (currentYearLabel) {
                topCells.push(<div key={`quarter-top-${currentYearLabel}-${index - 1}`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>{currentYearLabel}</div>);
            }
            currentYearLabel = yearLabel;
            currentYearWidth = quarterWidth;
        } else {
            currentYearWidth += quarterWidth;
        }
        if (index === quarters.length - 1) {
            topCells.push(<div key={`quarter-top-${currentYearLabel}-last`} style={{ ...topCellStyle, width: currentYearWidth, minWidth: currentYearWidth }}>{currentYearLabel}</div>);
        }
    });
    return { topHeaderCells: topCells, bottomHeaderCells: bottomCells };
};

// --- Helper function for Year View ---
const generateYearViewHeaders = (props: HeaderCellProps) => {
    const { ganttStartDate, ganttEndDate, scale, formats, bottomCellStyle } = props;
    const topCells: React.JSX.Element[] = []; // No top cells for year view based on current formats
    const bottomCells: React.JSX.Element[] = [];
    const years = eachYearOfInterval({ start: ganttStartDate, end: ganttEndDate });

    years.forEach((yearStartOriginal, index) => {
        const yearEndOriginal = endOfYear(yearStartOriginal);
        const daysInYear = getVisibleDays(yearStartOriginal, yearEndOriginal, ganttStartDate, ganttEndDate);
        if (daysInYear === 0) return;
        const yearWidth = daysInYear * scale;
        bottomCells.push(
            <div key={`year-bottom-${index}`} style={{ ...bottomCellStyle, width: yearWidth, minWidth: yearWidth }} title={format(yearStartOriginal, 'yyyy')}>
                {format(yearStartOriginal, formats.bottom || 'yyyy')}
            </div>
        );
    });
    return { topHeaderCells: topCells, bottomHeaderCells: bottomCells };
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
        if (topHeaderRef.current) topHeaderRef.current.style.transform = `translateX(-${scrollLeft}px)`;
        if (bottomHeaderRef.current) bottomHeaderRef.current.style.transform = `translateX(-${scrollLeft}px)`;
    }, [scrollLeft]);

    const formats = getHeaderFormats(viewMode);
    const totalHeaderHeight = GANTT_HEADER_HEIGHT;
    const topHeaderHeight = formats.top ? Math.floor(totalHeaderHeight * 0.4) : 0;
    const bottomHeaderHeight = totalHeaderHeight - topHeaderHeight;

    const commonCellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--gantt-border-color, #e5e7eb)', fontSize: '0.75rem', overflow: 'hidden', whiteSpace: 'nowrap', boxSizing: 'border-box', textOverflow: 'ellipsis' };

    const bottomCellStyleBase: React.CSSProperties = { ...commonCellStyle, height: `${bottomHeaderHeight}px`, backgroundColor: 'var(--gantt-header-bg-bottom, #ffffff)', color: 'var(--gantt-header-text-bottom, #4b5563)' };
    if (topHeaderHeight === 0 && bottomHeaderHeight > 0) bottomCellStyleBase.borderTop = '1px solid var(--gantt-border-color, #e5e7eb)';

    const helperProps: HeaderCellProps = {
        ganttStartDate,
        ganttEndDate,
        scale,
        formats,
        topCellStyle: {
            ...commonCellStyle,
            height: `${topHeaderHeight}px`,
            backgroundColor: 'var(--gantt-header-bg-top, #f9fafb)',
            fontWeight: '600',
            color: 'var(--gantt-header-text-top, #374151)',
            borderBottom: topHeaderHeight > 0 ? '1px solid var(--gantt-border-color, #e5e7eb)' : 'none'
        },
        bottomCellStyle: bottomCellStyleBase
    };

    let cells;
    switch (viewMode) {
        case 'day': cells = generateDayViewHeaders(helperProps); break;
        case 'week': cells = generateWeekViewHeaders(helperProps); break;
        case 'month': cells = generateMonthViewHeaders(helperProps); break;
        case 'quarter': cells = generateQuarterViewHeaders(helperProps); break;
        case 'year': cells = generateYearViewHeaders(helperProps); break;
        default: cells = generateDayViewHeaders(helperProps); // Fallback
    }

    const overallTotalDays = differenceInCalendarDays(ganttEndDate, ganttStartDate) + 1;
    const totalWidth = overallTotalDays * scale;

    return (
        <div style={{ height: `${totalHeaderHeight}px`, minHeight: `${totalHeaderHeight}px`, width: '100%', overflow: 'hidden', position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'var(--gantt-header-bg-bottom, #ffffff)' }}>
            {topHeaderHeight > 0 && (
                <div ref={topHeaderRef} style={{ width: `${totalWidth}px`, display: 'flex', position: 'relative' }}>
                    {cells.topHeaderCells}
                </div>
            )}
            {bottomHeaderHeight > 0 && (
                <div ref={bottomHeaderRef} style={{ width: `${totalWidth}px`, display: 'flex', position: 'relative' }}>
                    {cells.bottomHeaderCells}
                </div>
            )}
        </div>
    );
};

export default TimelineHeader; 