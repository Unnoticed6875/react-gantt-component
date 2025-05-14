"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragStartEvent,
    type DragEndEvent,
    type UniqueIdentifier,
    type DragMoveEvent
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
// import { CSS } from '@dnd-kit/utilities'; // Removed, unused for now
// import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'; // Removed, not used yet

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Task, ViewMode } from './types';
import { TaskList } from './TaskList';
import { TaskListHeader } from './TaskListHeader';
import Timeline from './Timeline';
import TimelineHeader from './TimelineHeader';
import { TaskBar } from './TaskBar';
import { addDays, startOfDay, endOfDay, min, max, differenceInCalendarDays } from 'date-fns';
import { getHierarchicalTasks, getVisibleTasks } from './utils'; // Import the new utility function
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface GanttChartProps {
    tasks: Task[];
    rowHeight?: number;
    defaultViewMode?: ViewMode;
    onTasksUpdate?: (updatedTasks: Task[]) => void;
    initialTasksOpen?: boolean; // New prop
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

// Data structure for what we'll store when a drag starts
interface ActiveDragItemData {
    task?: Task;
    type: 'task-body' | 'task-resize-left' | 'task-resize-right';
    originalTaskDates?: { start: Date, end: Date };
    // We might add initial mouse offset or dimensions here if needed for very precise calcs
}

// State for live resizing preview
interface ResizingPreviewTask {
    id: string;
    start: Date;
    end: Date;
}

const GanttChart: React.FC<GanttChartProps> = ({
    tasks,
    rowHeight = DEFAULT_ROW_HEIGHT,
    defaultViewMode = DEFAULT_VIEW_MODE,
    onTasksUpdate,
    initialTasksOpen = true, // Default to true
}) => {
    const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(defaultViewMode);
    const [currentScale, setCurrentScale] = useState<number>(VIEW_MODE_SCALES[defaultViewMode]);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // Process tasks for hierarchical display
    const hierarchicalTasks = useMemo(() => getHierarchicalTasks(tasks), [tasks]);
    console.log("GanttChart - hierarchicalTasks (IDs and parentIDs):", JSON.stringify(hierarchicalTasks.map(t => ({ id: t.id, p: t.parentId }))));

    // State for expanded tasks
    const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        // Initialize based on tasks that are parents
        tasks.forEach(task => {
            if (tasks.some(child => child.parentId === task.id)) {
                initialState[task.id] = initialTasksOpen;
            }
        });
        return initialState;
    });

    const handleToggleTaskExpansion = (taskId: string) => {
        setExpandedTaskIds(prev => ({
            ...prev,
            [taskId]: !prev[taskId],
        }));
    };

    const visibleTimelineTasks = useMemo(() => {
        return getVisibleTasks(tasks, expandedTaskIds, hierarchicalTasks);
    }, [tasks, expandedTaskIds, hierarchicalTasks]);

    // console.log("GanttChart - visibleTimelineTasks:", JSON.stringify(visibleTimelineTasks.map(t => ({ id: t.id, p: t.parentId }))));

    // State for dnd-kit
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
    const [activeDragData, setActiveDragData] = useState<ActiveDragItemData | null>(null);
    const [resizingPreviewTask, setResizingPreviewTask] = useState<ResizingPreviewTask | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }, // User must drag 5px before drag starts
        }),
        useSensor(KeyboardSensor, {
            // coordinateGetter: sortableKeyboardCoordinates, // Requires @dnd-kit/sortable
        })
    );

    // Calculate overall date range based on tasks
    const { ganttStartDate, ganttEndDate } = useMemo(() => {
        if (!hierarchicalTasks || hierarchicalTasks.length === 0) { // Use hierarchicalTasks
            const today = startOfDay(new Date());
            return {
                ganttStartDate: today,
                ganttEndDate: endOfDay(addDays(today, 30)),
            };
        }
        const taskStarts = hierarchicalTasks.map(t => t.start); // Use hierarchicalTasks
        const taskEnds = hierarchicalTasks.map(t => t.end); // Use hierarchicalTasks
        return {
            ganttStartDate: startOfDay(min(taskStarts)),
            ganttEndDate: endOfDay(max(taskEnds)),
        };
    }, [hierarchicalTasks]); // Dependency is now hierarchicalTasks

    // Define heights
    const taskHeight = DEFAULT_TASK_HEIGHT;

    // Update scale when view mode changes
    useEffect(() => {
        setCurrentScale(VIEW_MODE_SCALES[currentViewMode]);
    }, [currentViewMode]);

    // Function to get task start/end dates
    const getTaskDate = useCallback((task: Task): { start: Date; end: Date } => {
        // If this task is being resized, use the preview dates
        if (resizingPreviewTask && resizingPreviewTask.id === task.id) {
            return { start: resizingPreviewTask.start, end: resizingPreviewTask.end };
        }
        return { start: task.start, end: task.end };
    }, [resizingPreviewTask]);

    // Function to get task bar styles
    const getTaskBarStyle = useCallback((task: Task, index: number, calculatedStyle: React.CSSProperties): React.CSSProperties => {
        const isBeingResized = resizingPreviewTask && resizingPreviewTask.id === task.id;
        return {
            ...calculatedStyle, // This already includes left, top, width, height from Timeline
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
            transition: isBeingResized ? 'none' : calculatedStyle.transition, // Disable transition during live resize for snappiness
        };
    }, [resizingPreviewTask]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragId(active.id);
        const dragItemData = active.data.current as ActiveDragItemData | undefined;
        if (dragItemData) {
            setActiveDragData(dragItemData);
            // Clear any lingering resize preview from a previous aborted drag
            setResizingPreviewTask(null);
        }
    };

    const handleDragMove = (event: DragMoveEvent) => {
        const { delta } = event;

        if (!activeDragData || !activeDragData.task || !activeDragData.originalTaskDates ||
            (activeDragData.type !== 'task-resize-left' && activeDragData.type !== 'task-resize-right')) {
            // Not a resize drag or missing necessary data, or drag started on a non-task element
            return;
        }

        const dayOffset = Math.round(delta.x / currentScale);
        let newStartDate = activeDragData.originalTaskDates.start;
        let newEndDate = activeDragData.originalTaskDates.end;

        if (activeDragData.type === 'task-resize-left') {
            newStartDate = addDays(activeDragData.originalTaskDates.start, dayOffset);
            // Ensure start date does not go after original end date (or a minimum duration)
            newStartDate = min([newStartDate, addDays(activeDragData.originalTaskDates.end, -1)]);
        } else { // task-resize-right
            newEndDate = addDays(activeDragData.originalTaskDates.end, dayOffset);
            // Ensure end date does not go before original start date (or a minimum duration)
            newEndDate = max([newEndDate, addDays(activeDragData.originalTaskDates.start, 1)]);
        }

        // Basic validation: ensure start is before end, otherwise clamp to 1 day
        if (newStartDate >= newEndDate) {
            if (activeDragData.type === 'task-resize-left') {
                newStartDate = addDays(newEndDate, -1);
            } else {
                newEndDate = addDays(newStartDate, 1);
            }
        }

        setResizingPreviewTask({
            id: activeDragData.task.id,
            start: newStartDate,
            end: newEndDate
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        setResizingPreviewTask(null); // Clear preview on drag end

        setActiveDragId(null);
        setActiveDragData(null);

        if (!activeDragData || !active.data.current) return;
        const draggedItemData = active.data.current as ActiveDragItemData;

        if (draggedItemData.type === 'task-body' && draggedItemData.task && draggedItemData.originalTaskDates) {
            const dayOffset = Math.round(delta.x / currentScale);
            const newStartDate = addDays(draggedItemData.originalTaskDates.start, dayOffset);
            const durationDays = differenceInCalendarDays(draggedItemData.originalTaskDates.end, draggedItemData.originalTaskDates.start);
            const newEndDate = addDays(newStartDate, durationDays);

            if (onTasksUpdate) {
                const updatedTasks = tasks.map(t =>
                    t.id === draggedItemData.task!.id ? { ...t, start: newStartDate, end: newEndDate } : t
                );
                onTasksUpdate(updatedTasks);
            }
        } else if ((draggedItemData.type === 'task-resize-left' || draggedItemData.type === 'task-resize-right') && draggedItemData.task && draggedItemData.originalTaskDates) {
            const dayOffset = Math.round(delta.x / currentScale);
            let newStartDate = draggedItemData.originalTaskDates.start;
            let newEndDate = draggedItemData.originalTaskDates.end;

            if (draggedItemData.type === 'task-resize-left') {
                newStartDate = addDays(draggedItemData.originalTaskDates.start, dayOffset);
                newStartDate = min([newStartDate, addDays(draggedItemData.originalTaskDates.end, -1)]);
            } else {
                newEndDate = addDays(draggedItemData.originalTaskDates.end, dayOffset);
                newEndDate = max([newEndDate, addDays(draggedItemData.originalTaskDates.start, 1)]);
            }
            if (newStartDate >= newEndDate) {
                if (draggedItemData.type === 'task-resize-left') newStartDate = addDays(newEndDate, -1);
                else newEndDate = addDays(newStartDate, 1);
            }

            if (onTasksUpdate) {
                const updatedTasks = tasks.map(t =>
                    t.id === draggedItemData.task!.id ? { ...t, start: newStartDate, end: newEndDate } : t
                );
                onTasksUpdate(updatedTasks);
            }
        }
    };

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

    const draggedTaskForOverlay = useMemo(() => {
        if (!activeDragId || !activeDragData || !activeDragData.task) return null;
        // Find the task from the main tasks array to ensure we have the most current version
        // The task in activeDragData might be stale if tasks prop updates during drag (though unlikely here)
        return tasks.find(t => t.id === activeDragData.task!.id);
    }, [activeDragId, activeDragData, tasks]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
        >
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
                                <TaskList
                                    tasks={hierarchicalTasks}
                                    rowHeight={rowHeight}
                                    onTaskRowClick={(task) => console.log("Task clicked:", task.name)}
                                    expandedTaskIds={expandedTaskIds}
                                    onToggleExpansion={handleToggleTaskExpansion}
                                />
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
                                    tasks={visibleTimelineTasks}
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
            <DragOverlay dropAnimation={null}>
                {activeDragId && draggedTaskForOverlay && activeDragData ? (
                    activeDragData.type === 'task-body' ? (
                        <TaskBar
                            task={draggedTaskForOverlay}
                            taskBarStyle={{
                                height: taskHeight,
                                width: (differenceInCalendarDays(draggedTaskForOverlay.end, draggedTaskForOverlay.start) + 1) * currentScale - 1,
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
                        // For now, rendering null is simplest.
                        null
                    )
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default GanttChart; 