"use client";

import * as React from "react";

interface TaskListHeaderProps {
    ganttHeaderHeight: number;
    // TODO: Add props for column resizing, sorting, etc.
}

export function TaskListHeader({ ganttHeaderHeight }: TaskListHeaderProps) {
    return (
        <div
            className="flex font-semibold border-b items-center bg-muted/50 sticky top-0 z-10 text-xs"
            style={{ height: `${ganttHeaderHeight}px`, minHeight: `${ganttHeaderHeight}px` }}
        >
            <div className="w-1/2 pl-4">Task Name</div>
            <div className="w-1/4 text-center">Start</div>
            <div className="w-1/4 text-center pr-4">End</div>
        </div>
    );
} 