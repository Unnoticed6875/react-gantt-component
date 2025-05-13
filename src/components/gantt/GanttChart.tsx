"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Task, ViewMode } from './types';
import { TaskList } from './TaskList';
import { TaskListHeader } from './TaskListHeader';
import Timeline from './Timeline';
import TimelineHeader from './TimelineHeader';
import { addDays, startOfDay, endOfDay, min, max } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface GanttChartProps {
    tasks: Task[];
    rowHeight?: number;
    defaultViewMode?: ViewMode;
}

// Default values
const DEFAULT_ROW_HEIGHT = 50;
const DEFAULT_VIEW_MODE: ViewMode = 'day';
const DEFAULT_TASK_HEIGHT = 30; // pixels
const DEFAULT_GANTT_HEADER_HEIGHT = 50; // Add height for TaskListHeader

const VIEW_MODE_SCALES: Record<ViewMode, number> = {
    day: 50, // pixels per day
    week: 10, // pixels per day (effectively 70px per week)
    month: 2, // pixels per day (effectively ~60px per month)
    quarter: 0.5, // pixels per day (effectively ~45px per quarter)
    year: 0.1 // pixels per day (effectively ~36.5px per year)
};

const MIN_SCALE = 0.05; // Minimum zoom out (pixels per day)
const MAX_SCALE = 200;  // Maximum zoom in (pixels per day)

const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    rowHeight = DEFAULT_ROW_HEIGHT,
    defaultViewMode = DEFAULT_VIEW_MODE,
}) => {
    const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(defaultViewMode);
    const [currentScale, setCurrentScale] = useState<number>(VIEW_MODE_SCALES[defaultViewMode]);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

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

    // Define heights
    const taskHeight = DEFAULT_TASK_HEIGHT;

    // Update scale when view mode changes
    useEffect(() => {
        setCurrentScale(VIEW_MODE_SCALES[currentViewMode]);
    }, [currentViewMode]);

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

    // Zoom functionality
    const handleWheel = useCallback((event: WheelEvent) => {
        if (event.ctrlKey) {
            event.preventDefault();
            const zoomIntensity = 0.1;
            const direction = event.deltaY < 0 ? 1 : -1; // 1 for zoom in, -1 for zoom out

            setCurrentScale(prevScale => {
                let newScale = prevScale * (1 + direction * zoomIntensity);
                newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
                return newScale;
            });
        }
    }, []);

    useEffect(() => {
        const container = timelineContainerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => {
                container.removeEventListener('wheel', handleWheel);
            };
        }
    }, [handleWheel]);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="p-2 flex gap-2 bg-gray-100 dark:bg-gray-800 border-b">
                {(Object.keys(VIEW_MODE_SCALES) as ViewMode[]).map(vm => (
                    <Button
                        key={vm}
                        onClick={() => setCurrentViewMode(vm)}
                        variant={currentViewMode === vm ? "default" : "outline"}
                        size="sm"
                    >
                        {vm.charAt(0).toUpperCase() + vm.slice(1)}
                    </Button>
                ))}
            </div>
            <ResizablePanelGroup direction="horizontal" className="flex-1 w-full border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
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
                    <div ref={timelineContainerRef} className="flex flex-col h-full overflow-hidden">
                        <ScrollArea className="flex-1" onScroll={handleScroll}>
                            <TimelineHeader
                                viewMode={currentViewMode}
                                startDate={ganttStartDate}
                                endDate={ganttEndDate}
                                scale={currentScale}
                                scrollLeft={scrollLeft}
                            />

                            <Timeline
                                viewMode={currentViewMode}
                                tasks={tasks}
                                startDate={ganttStartDate}
                                endDate={ganttEndDate}
                                rowHeight={rowHeight}
                                taskHeight={taskHeight}
                                scale={currentScale}
                                getTaskDate={getTaskDate}
                                getTaskBarStyle={getTaskBarStyle}
                                showGrid={true}
                            />
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

export default GanttChart; 