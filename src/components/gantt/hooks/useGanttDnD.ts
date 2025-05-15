"use client";

import { useState, useCallback, useMemo } from "react";
import {
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { addDays, differenceInCalendarDays, min, max } from "date-fns";
import { Task } from "../types";

export interface ActiveDragItemData {
  task?: Task;
  type: "task-body" | "task-resize-left" | "task-resize-right";
  originalTaskDates?: { start: Date; end: Date };
}

export interface ResizingPreviewTask {
  id: string;
  start: Date;
  end: Date;
}

interface UseGanttDnDProps {
  tasks: Task[];
  currentScale: number;
  onTasksUpdate?: (updatedTasks: Task[]) => void;
  // activeDragDataRef?: React.MutableRefObject<ActiveDragItemData | null>; // If direct ref manipulation is needed
}

export function useGanttDnD({
  tasks,
  currentScale,
  onTasksUpdate,
}: UseGanttDnDProps) {
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(
    null
  );
  const [activeDragData, setActiveDragData] =
    useState<ActiveDragItemData | null>(null);
  const [resizingPreviewTask, setResizingPreviewTask] =
    useState<ResizingPreviewTask | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id);
    const dragItemData = active.data.current as ActiveDragItemData | undefined;
    if (dragItemData) {
      setActiveDragData(dragItemData); // Store the whole data object
      setResizingPreviewTask(null); // Clear any lingering preview
    }
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { delta } = event;

      if (
        !activeDragData ||
        !activeDragData.task ||
        !activeDragData.originalTaskDates ||
        (activeDragData.type !== "task-resize-left" &&
          activeDragData.type !== "task-resize-right")
      ) {
        return;
      }

      const dayOffset = Math.round(delta.x / currentScale);
      let newStartDate = activeDragData.originalTaskDates.start;
      let newEndDate = activeDragData.originalTaskDates.end;

      if (activeDragData.type === "task-resize-left") {
        newStartDate = addDays(
          activeDragData.originalTaskDates.start,
          dayOffset
        );
        newStartDate = min([
          newStartDate,
          addDays(activeDragData.originalTaskDates.end, -1),
        ]); // Ensure min 1 day duration
      } else {
        // task-resize-right
        newEndDate = addDays(activeDragData.originalTaskDates.end, dayOffset);
        newEndDate = max([
          newEndDate,
          addDays(activeDragData.originalTaskDates.start, 1),
        ]); // Ensure min 1 day duration
      }

      if (newStartDate >= newEndDate) {
        if (activeDragData.type === "task-resize-left") {
          newStartDate = addDays(newEndDate, -1);
        } else {
          newEndDate = addDays(newStartDate, 1);
        }
      }

      setResizingPreviewTask({
        id: activeDragData.task.id,
        start: newStartDate,
        end: newEndDate,
      });
    },
    [activeDragData, currentScale]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      setResizingPreviewTask(null); // Clear preview

      // Use a locally scoped variable for activeDragData from the event if possible,
      // or ensure the state `activeDragData` is correctly set from onDragStart
      const draggedItemData = active.data.current as
        | ActiveDragItemData
        | undefined;

      setActiveDragId(null);
      setActiveDragData(null); // Reset state

      if (
        !draggedItemData ||
        !draggedItemData.task ||
        !draggedItemData.originalTaskDates
      )
        return;

      const taskToUpdateId = draggedItemData.task.id;
      let finalStartDate = draggedItemData.originalTaskDates.start;
      let finalEndDate = draggedItemData.originalTaskDates.end;

      if (draggedItemData.type === "task-body") {
        const dayOffset = Math.round(delta.x / currentScale);
        finalStartDate = addDays(
          draggedItemData.originalTaskDates.start,
          dayOffset
        );
        const durationDays = differenceInCalendarDays(
          draggedItemData.originalTaskDates.end,
          draggedItemData.originalTaskDates.start
        );
        finalEndDate = addDays(finalStartDate, durationDays);
      } else if (
        draggedItemData.type === "task-resize-left" ||
        draggedItemData.type === "task-resize-right"
      ) {
        const dayOffset = Math.round(delta.x / currentScale);
        if (draggedItemData.type === "task-resize-left") {
          finalStartDate = addDays(
            draggedItemData.originalTaskDates.start,
            dayOffset
          );
          finalStartDate = min([
            finalStartDate,
            addDays(draggedItemData.originalTaskDates.end, -1),
          ]);
        } else {
          finalEndDate = addDays(
            draggedItemData.originalTaskDates.end,
            dayOffset
          );
          finalEndDate = max([
            finalEndDate,
            addDays(draggedItemData.originalTaskDates.start, 1),
          ]);
        }

        if (finalStartDate >= finalEndDate) {
          if (draggedItemData.type === "task-resize-left")
            finalStartDate = addDays(finalEndDate, -1);
          else finalEndDate = addDays(finalStartDate, 1);
        }
      }

      if (onTasksUpdate) {
        const updatedTasks = tasks.map((t) =>
          t.id === taskToUpdateId
            ? { ...t, start: finalStartDate, end: finalEndDate }
            : t
        );
        onTasksUpdate(updatedTasks);
      }
    },
    [tasks, currentScale, onTasksUpdate]
  ); // Ensure activeDragData is stable or use event.active.data.current

  const getTaskDate = useCallback(
    (task: Task): { start: Date; end: Date } => {
      if (resizingPreviewTask && resizingPreviewTask.id === task.id) {
        return {
          start: resizingPreviewTask.start,
          end: resizingPreviewTask.end,
        };
      }
      return { start: task.start, end: task.end };
    },
    [resizingPreviewTask]
  );

  const draggedTaskForOverlay = useMemo(() => {
    if (!activeDragId || !activeDragData || !activeDragData.task) return null;
    return tasks.find((t) => t.id === String(activeDragId)); // or activeDragData.task.id
  }, [activeDragId, activeDragData, tasks]);

  return {
    activeDragId,
    activeDragData, // Expose this for DragOverlay to determine type
    resizingPreviewTask, // For Timeline to show live updates
    draggedTaskForOverlay, // For DragOverlay
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    getTaskDate, // For Timeline to get correct dates during resize
  };
}
