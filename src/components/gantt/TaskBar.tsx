"use client";

import * as React from "react";
import { Task } from "./types";
import { Progress } from "@/components/ui/progress";

interface TaskBarProps {
    task: Task;
    taskBarStyle: React.CSSProperties;
    onTaskBarClick?: (task: Task) => void; // Optional: for future interactions
    // TODO: Add props for resizing, dragging, etc.
}

export function TaskBar({ task, taskBarStyle, onTaskBarClick }: TaskBarProps) {
    return (
        <div
            style={taskBarStyle}
            className="group cursor-pointer"
            onClick={() => onTaskBarClick?.(task)}
            title={`${task.name} (${task.progress !== undefined ? task.progress + '%' : ''})`}
        >
            <div className="relative h-full bg-primary rounded overflow-hidden text-primary-foreground text-xs px-2 flex items-center">
                <span className="truncate">{task.name}</span>
                {task.progress !== undefined && (
                    <Progress
                        value={task.progress}
                        className="absolute top-0 left-0 h-full w-full !bg-primary/70 rounded-none opacity-50 group-hover:opacity-40 transition-opacity duration-150"
                    />
                )}
                <span className="truncate relative z-10 pl-1">
                    {task.progress !== undefined ? `(${task.progress}%)` : ''}
                </span>
            </div>
        </div>
    );
} 