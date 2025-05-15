"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Task, ViewMode } from './types';
import { TaskList } from './task-list/TaskList';
import { TaskListHeader } from './task-list/TaskListHeader';
import Timeline from './time-line/Timeline';
import TimelineHeader from './time-line/TimelineHeader';
import { TaskBar } from './TaskBar';
import { addDays, startOfDay, endOfDay, min, max, differenceInCalendarDays } from 'date-fns';
import { getHierarchicalTasks, getVisibleTasks } from './utils';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import hooks
import { useGanttDnD } from './hooks/useGanttDnD';
import { useTimelineZoom } from './hooks/useTimelineZoom';

interface GanttChartProps {
    tasks: Task[];
    rowHeight?: number;
    defaultViewMode?: ViewMode;
    onTasksUpdate?: (updatedTasks: Task[]) => void;
    initialTasksOpen?: boolean;
}

const DEFAULT_ROW_HEIGHT = 50;
const DEFAULT_VIEW_MODE: ViewMode = 'day';
const DEFAULT_TASK_HEIGHT = 30;
const DEFAULT_GANTT_HEADER_HEIGHT = 50;

const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    rowHeight = DEFAULT_ROW_HEIGHT,
    defaultViewMode = DEFAULT_VIEW_MODE,
    onTasksUpdate,
    initialTasksOpen = true,
}) => {
    const {
        timelineContainerRef,
        currentViewMode,
        setCurrentViewMode,
        currentScale,
        // setCurrentScale, // Not directly setting scale from here for now, zoom hook manages it
        VIEW_MODE_SCALES
    } = useTimelineZoom({ initialViewMode: defaultViewMode });

    const {
        activeDragId,
        activeDragData,
        // resizingPreviewTask, // used internally by getTaskDate
        draggedTaskForOverlay,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        getTaskDate,
    } = useGanttDnD({ tasks, currentScale, onTasksUpdate });

    const hierarchicalTasks = useMemo(() => getHierarchicalTasks(tasks), [tasks]);

    const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        if (initialTasksOpen) {
            tasks.forEach(task => {
                if (tasks.some(child => child.parentId === task.id)) {
                    initialState[task.id] = true;
                }
            });
        }
        return initialState;
    });

    const handleToggleTaskExpansion = (taskId: string) => {
        setExpandedTaskIds(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const visibleTimelineTasks = useMemo(() => {
        return getVisibleTasks(tasks, expandedTaskIds, hierarchicalTasks);
    }, [tasks, expandedTaskIds, hierarchicalTasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const { ganttStartDate, ganttEndDate } = useMemo(() => {
        if (!hierarchicalTasks || hierarchicalTasks.length === 0) {
            const today = startOfDay(new Date());
            return { ganttStartDate: today, ganttEndDate: endOfDay(addDays(today, 30)) };
        }
        const taskStarts = hierarchicalTasks.map(t => t.start);
        const taskEnds = hierarchicalTasks.map(t => t.end);
        return { ganttStartDate: startOfDay(min(taskStarts)), ganttEndDate: endOfDay(max(taskEnds)) };
    }, [hierarchicalTasks]);

    const taskHeight = DEFAULT_TASK_HEIGHT;

    const getTaskBarStyle = useCallback((task: Task, index: number, calculatedStyle: React.CSSProperties): React.CSSProperties => {
        // getTaskDate from the hook will provide the correct dates for width calculation if resizing
        // const {start: currentTaskStart, end: currentTaskEnd} = getTaskDate(task); // Removed unused variables

        return {
            ...calculatedStyle,
            backgroundColor: task.type === 'milestone' ? '#a855f7' : '#3b82f6',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.8rem',
            paddingLeft: '8px',
            paddingRight: '8px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            transition: calculatedStyle.transition,
        };
    }, []);

    const [scrollLeft, setScrollLeft] = useState(0);
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(event.currentTarget.scrollLeft);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
        >
            <TooltipProvider>
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
                        <ResizablePanel defaultSize={25} minSize={20} className="bg-gray-50 dark:bg-gray-800">
                            <div className="flex flex-col h-full">
                                <TaskListHeader ganttHeaderHeight={DEFAULT_GANTT_HEADER_HEIGHT} />
                                <ScrollArea className="flex-1">
                                    <TaskList
                                        tasks={tasks} // Pass original tasks to TaskList
                                        rowHeight={rowHeight}
                                        expandedTaskIds={expandedTaskIds}
                                        onToggleExpansion={handleToggleTaskExpansion}
                                        onTasksUpdate={onTasksUpdate || (() => { })}
                                    />
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle className="bg-gray-200 dark:bg-gray-700" />
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
                                        tasks={visibleTimelineTasks} // Pass visible tasks to Timeline
                                        startDate={ganttStartDate}
                                        endDate={ganttEndDate}
                                        rowHeight={rowHeight}
                                        taskHeight={taskHeight}
                                        scale={currentScale}
                                        getTaskDate={getTaskDate} // Pass from DnD hook
                                        getTaskBarStyle={getTaskBarStyle} // Pass updated style getter
                                        showGrid={true}
                                    />
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
                <DragOverlay dropAnimation={null}>
                    {activeDragId && draggedTaskForOverlay && activeDragData && activeDragData.type === 'task-body' ? (
                        <TaskBar
                            task={draggedTaskForOverlay} // Use task from DnD hook
                            taskBarStyle={{
                                height: taskHeight,
                                // Width calculation for overlay should use the task's original or previewed dates via getTaskDate
                                width: (differenceInCalendarDays(getTaskDate(draggedTaskForOverlay).end, getTaskDate(draggedTaskForOverlay).start) + 1) * currentScale - 1,
                                backgroundColor: draggedTaskForOverlay.type === 'milestone' ? '#a855f7' : '#3b82f6',
                                opacity: 0.75,
                                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '0.8rem',
                                paddingLeft: '8px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            isOverlay={true}
                        />
                    ) : (
                        // For resize handles, render nothing or a minimal line/handle indicator
                        activeDragId && activeDragData && (activeDragData.type === 'task-resize-left' || activeDragData.type === 'task-resize-right') ? (
                            // Optionally render a visual cue for resizing
                            <div style={{
                                height: taskHeight,
                                width: '5px',
                                backgroundColor: 'rgba(0,0,255,0.5)',
                                opacity: 0.75,
                                // Position would ideally match the handle being dragged,
                                // but dnd-kit overlay positions based on cursor by default.
                                // For simplicity, this is just a small indicator.
                            }} />
                        ) : null
                    )}
                </DragOverlay>
            </TooltipProvider>
        </DndContext>
    );
};

export default GanttChart; 