"use client";

import * as React from "react";
import { useMemo, CSSProperties } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Task, ViewMode } from "./types";
import { TaskListHeader } from "./TaskListHeader";
import { TaskList } from "./TaskList";
import TimelineHeader from "./TimelineHeader";
import Timeline from "./Timeline";
import { getStartAndEndDates } from "./utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface GanttChartProps {
    tasks: Task[];
    rowHeight?: number;
    dayWidth?: number; // Width for each day column in the timeline
    // ... other props
}

const GANTT_HEADER_HEIGHT = 50;
const DEFAULT_ROW_HEIGHT = 40; // Define a default row height
const TASK_BAR_HEIGHT_PERCENTAGE = 0.6; // Task bar height as a percentage of rowHeight

const GanttChart: React.FC<GanttChartProps> = ({ tasks, rowHeight = DEFAULT_ROW_HEIGHT }) => {
    const [taskListWidth, setTaskListWidth] = React.useState(30);
    const [columnWidth, setColumnWidth] = React.useState(50);
    const [viewMode, setViewMode] = React.useState<ViewMode>("day"); // Default to day view
    const [showGrid, setShowGrid] = React.useState(true); // State for grid visibility, default to true

    // Calculate the total height needed for the scrollable content (headers + task rows)
    const scrollableContentHeight = tasks.length * rowHeight + GANTT_HEADER_HEIGHT;
    const { overallMinDate, overallMaxDate } = useMemo(() => getStartAndEndDates(tasks), [tasks]);

    const getTaskBarStyle = (task: Task, index: number, calculatedStyle: CSSProperties): CSSProperties => {
        const top = index * rowHeight + (rowHeight * (1 - TASK_BAR_HEIGHT_PERCENTAGE)) / 2;
        const height = rowHeight * TASK_BAR_HEIGHT_PERCENTAGE;

        return {
            ...calculatedStyle,
            top: `${top}px`,
            height: `${height}px`,
            backgroundColor: task.milestone ? "hsl(var(--primary))" : "hsl(var(--secondary))",
            borderRadius: "4px", // Example style
            color: "white",       // Example style
        };
    };

    const handleZoomIn = () => {
        setColumnWidth((prev) => Math.min(prev + 10, 200)); // Max width 200
    };

    const handleZoomOut = () => {
        setColumnWidth((prev) => Math.max(prev - 10, 20)); // Min width 20
    };

    if (!overallMinDate || !overallMaxDate) {
        return <div>No tasks to display or tasks have invalid dates.</div>;
    }

    return (
        <div className="gantt-chart h-[600px] flex flex-col border rounded-lg">
            <div className="flex justify-end space-x-2 mb-2 p-2 border-b">
                <button onClick={() => setViewMode("day")} className="p-1 border rounded text-xs hover:bg-gray-100">Day</button>
                <button onClick={() => setViewMode("week")} className="p-1 border rounded text-xs hover:bg-gray-100">Week</button>
                <button onClick={() => setViewMode("month")} className="p-1 border rounded text-xs hover:bg-gray-100">Month</button>
                <button onClick={() => setViewMode("year")} className="p-1 border rounded text-xs hover:bg-gray-100">Year</button>
                <button onClick={handleZoomIn} className="p-1 border rounded text-xs hover:bg-gray-100">Zoom In</button>
                <button onClick={handleZoomOut} className="p-1 border rounded text-xs hover:bg-gray-100">Zoom Out</button>
                <button onClick={() => setShowGrid(!showGrid)} className="p-1 border rounded text-xs hover:bg-gray-100">
                    {showGrid ? "Hide Grid" : "Show Grid"}
                </button>
            </div>
            <div className="overflow-y-auto">
                <div style={{ height: `${scrollableContentHeight}px` }}>
                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        <ResizablePanel defaultSize={taskListWidth} minSize={20} maxSize={50} onResize={setTaskListWidth}>
                            <div className="flex flex-col h-full">
                                <TaskListHeader ganttHeaderHeight={GANTT_HEADER_HEIGHT} />
                                <TaskList tasks={tasks} rowHeight={rowHeight} />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={100 - taskListWidth}>
                            <ScrollArea>
                                <ScrollBar orientation="horizontal" />
                                <TimelineHeader
                                    startDate={overallMinDate}
                                    endDate={overallMaxDate}
                                    columnWidth={columnWidth}
                                    viewMode={viewMode}
                                    ganttHeaderHeight={GANTT_HEADER_HEIGHT}
                                />
                                <Timeline
                                    key={`timeline-${showGrid}`}
                                    tasks={tasks}
                                    startDate={overallMinDate}
                                    endDate={overallMaxDate}
                                    columnWidth={columnWidth}
                                    viewMode={viewMode}
                                    rowHeight={rowHeight}
                                    getTaskBarStyle={getTaskBarStyle}
                                    showGrid={showGrid}
                                />

                            </ScrollArea>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </div>
    );
}

export default GanttChart; 