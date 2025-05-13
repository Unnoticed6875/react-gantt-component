"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Task, ViewMode } from './types';
import { TaskList } from './TaskList';
import { TaskListHeader } from './TaskListHeader';
import Timeline from './Timeline';
import TimelineHeader from './TimelineHeader';
import { addDays, startOfDay, endOfDay, min, max } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface GanttChartProps {
    tasks: Task[];
    rowHeight?: number;
    viewMode?: ViewMode;
}

// Default values
const DEFAULT_ROW_HEIGHT = 50;
const DEFAULT_VIEW_MODE: ViewMode = 'day';
const DEFAULT_SCALE = 50; // pixels per day
const DEFAULT_TASK_HEIGHT = 30; // pixels
const DEFAULT_GANTT_HEADER_HEIGHT = 50; // Add height for TaskListHeader

const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    rowHeight = DEFAULT_ROW_HEIGHT,
    viewMode = DEFAULT_VIEW_MODE,
}) => {
    // Calculate overall date range based on tasks
    const { ganttStartDate, ganttEndDate } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            const today = startOfDay(new Date());
            return {
                ganttStartDate: today,
                ganttEndDate: endOfDay(addDays(today, 30)), // Default 30-day range if no tasks
            };
        }
        const taskStarts = tasks.map(t => t.start);
        const taskEnds = tasks.map(t => t.end);
        return {
            ganttStartDate: startOfDay(min(taskStarts)),
            ganttEndDate: endOfDay(max(taskEnds)),
        };
    }, [tasks]);

    // Define scale and heights
    const scale = DEFAULT_SCALE; // This could be state or a prop for dynamic changes
    const taskHeight = DEFAULT_TASK_HEIGHT; // This could also be state or a prop

    // Function to get task start/end dates
    const getTaskDate = useCallback((task: Task): { start: Date; end: Date } => {
        // Assuming task.start and task.end are already Date objects.
        // If they can be strings, add parsing logic here: e.g., new Date(task.start)
        return { start: task.start, end: task.end };
    }, []);

    // Function to get task bar styles
    const getTaskBarStyle = useCallback((task: Task, index: number, calculatedStyle: React.CSSProperties): React.CSSProperties => {
        return {
            ...calculatedStyle, // Includes position (left, top) and size (width, height)
            backgroundColor: task.type === 'milestone' ? '#a855f7' /* purple-500 */ : '#3b82f6' /* blue-500 */,
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.8rem',
            paddingLeft: '8px', // Add some padding for text
            paddingRight: '8px',
            display: 'flex', // For aligning text or internal elements
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            cursor: 'pointer',
        };
    }, []); // Add dependencies if any custom logic relies on component state or props

    // State for synchronizing horizontal scroll between TimelineHeader and Timeline body
    const [scrollLeft, setScrollLeft] = useState(0);
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(event.currentTarget.scrollLeft);
    };

    return (
        <ResizablePanelGroup direction="horizontal" className="h-full w-full border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
            {/* Task List Panel */}
            <ResizablePanel defaultSize={25} minSize={20} className="bg-gray-50 dark:bg-gray-800">
                <div className="flex flex-col h-full">
                    <TaskListHeader ganttHeaderHeight={DEFAULT_GANTT_HEADER_HEIGHT} />
                    <ScrollArea className="flex-1">
                        <TaskList tasks={tasks} rowHeight={rowHeight} />
                    </ScrollArea>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-gray-200 dark:bg-gray-700" />
            {/* Timeline Panel */}
            <ResizablePanel defaultSize={75} minSize={30}>
                {/* <div className="flex flex-col h-full overflow-hidden"> */}
                <ScrollArea className="flex-1" onScroll={handleScroll}>
                    <TimelineHeader
                        viewMode={viewMode}
                        startDate={ganttStartDate}
                        endDate={ganttEndDate}
                        scale={scale}
                        scrollLeft={scrollLeft}
                    />

                    <Timeline
                        tasks={tasks}
                        startDate={ganttStartDate}
                        endDate={ganttEndDate}
                        rowHeight={rowHeight}
                        taskHeight={taskHeight}
                        scale={scale}
                        getTaskDate={getTaskDate}
                        getTaskBarStyle={getTaskBarStyle}
                        showGrid={true}
                    />
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {/* </div> */}
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

export default GanttChart; 