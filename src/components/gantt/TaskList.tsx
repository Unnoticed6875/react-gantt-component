"use client";

import * as React from "react";
import { GanttTask } from "./types";

interface TaskListProps {
    tasks: GanttTask[];
    rowHeight: number;

    onTaskRowClick?: (task: GanttTask) => void; // Optional: for future interactions
    // TODO: Add other necessary props like selectedTaskId, etc.
}

export function TaskList({
    tasks,
    rowHeight,

    onTaskRowClick,
}: TaskListProps) {
    return (
        <div className="divide-y">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="flex items-center hover:bg-muted/30 cursor-pointer"
                    style={{ height: `${rowHeight}px` }}
                    onClick={() => onTaskRowClick?.(task)}
                >
                    <div className="w-1/2 truncate pl-4 pr-2">{task.id}</div>
                    <div className="w-1/2 truncate pl-4 pr-2">{task.name}</div>
                    <div className="w-1/4 text-xs text-center">{task.start.toLocaleDateString()}</div>
                    <div className="w-1/4 text-xs text-center pr-4">{task.end.toLocaleDateString()}</div>
                    <div className="w-1/4 text-xs text-center pr-4">{task.dependencies?.join(", ")}</div>
                </div>
            ))}
        </div>
    );
} 