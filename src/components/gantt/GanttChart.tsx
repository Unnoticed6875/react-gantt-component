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

    // Fully commenting out this block
    /*
    const { projectStartDate, projectEndDate } = React.useMemo(() => {
        if (!tasks || tasks.length === 0) {
            const today = new Date();
            return {
                projectStartDate: today,
                // projectEndDate: addDays(today, 30), // addDays would be undefined here
                projectEndDate: new Date(today.setDate(today.getDate() + 30)), // simple alternative if needed
            };
        }
        let minDate = tasks[0].start;
        let maxDate = tasks[0].end;
        tasks.forEach(task => {
            if (task.start < minDate) minDate = task.start;
            if (task.end > maxDate) maxDate = task.end;
        });
        // const paddedMinDate = addDays(minDate, -2); // addDays would be undefined
        // const paddedMaxDate = addDays(maxDate, 2); // addDays would be undefined
        const paddedMinDate = new Date(minDate.setDate(minDate.getDate() - 2));
        const paddedMaxDate = new Date(maxDate.setDate(maxDate.getDate() + 2));
        return {
            projectStartDate: paddedMinDate,
            projectEndDate: paddedMaxDate,
        };
    }, [tasks]);
    */

    // const timelineDates = React.useMemo(
    //     () => getDatesBetween(projectStartDate, projectEndDate), // getDatesBetween would be undefined
    //     [projectStartDate, projectEndDate]
    // );

    // const totalTimelineWidth = timelineDates.length * columnWidth;
    const containerHeight = tasks.length * rowHeight + GANTT_HEADER_HEIGHT + 20;
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
        <div className="gantt-chart h-[600px] flex flex-col border rounded-lg" style={{ height: `${containerHeight}px` }}>
            <div className="flex justify-end space-x-2 mb-2 p-2 border-b">
                <button onClick={() => setViewMode("day")} className="p-1 border rounded text-xs hover:bg-gray-100">Day</button>
                <button onClick={() => setViewMode("week")} className="p-1 border rounded text-xs hover:bg-gray-100">Week</button>
                <button onClick={() => setViewMode("month")} className="p-1 border rounded text-xs hover:bg-gray-100">Month</button>
                <button onClick={() => setViewMode("year")} className="p-1 border rounded text-xs hover:bg-gray-100">Year</button>
                <button onClick={handleZoomIn} className="p-1 border rounded text-xs hover:bg-gray-100">Zoom In</button>
                <button onClick={handleZoomOut} className="p-1 border rounded text-xs hover:bg-gray-100">Zoom Out</button>
            </div>
            <ResizablePanelGroup direction="horizontal" className="flex-grow">
                <ResizablePanel defaultSize={taskListWidth} minSize={20} maxSize={50} onResize={setTaskListWidth}>
                    <div className="flex flex-col h-full">
                        <TaskListHeader ganttHeaderHeight={GANTT_HEADER_HEIGHT} />
                        <TaskList tasks={tasks} rowHeight={rowHeight} />
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={100 - taskListWidth}>
                    <div className="flex flex-col h-full w-full overflow-hidden">
                        <TimelineHeader
                            startDate={overallMinDate}
                            endDate={overallMaxDate}
                            columnWidth={columnWidth}
                            viewMode={viewMode}
                            ganttHeaderHeight={GANTT_HEADER_HEIGHT}
                        />
                        <Timeline
                            tasks={tasks}
                            startDate={overallMinDate}
                            endDate={overallMaxDate}
                            columnWidth={columnWidth}
                            viewMode={viewMode}
                            rowHeight={rowHeight}
                            getTaskBarStyle={getTaskBarStyle}
                        />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}

export default GanttChart; 