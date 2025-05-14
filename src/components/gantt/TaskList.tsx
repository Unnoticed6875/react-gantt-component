"use client";

import * as React from "react";
import { Task } from "./types";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

interface TaskListItemProps {
    task: Task;
    allTasks: Task[];
    rowHeight: number;
    level: number;
    onTaskRowClick?: (task: Task) => void;
    isExpanded: boolean;
    onToggleExpansion: (taskId: string) => void;
    expandedTaskIds: Record<string, boolean>;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
    task,
    allTasks,
    rowHeight,
    level,
    onTaskRowClick,
    isExpanded,
    onToggleExpansion,
    expandedTaskIds,
}) => {
    const children = allTasks.filter((t) => t.parentId === task.id);

    // Base padding for the task name column, chevron adds to this effectively
    const taskNameStyle = { paddingLeft: `${level * 20 + 4}px` }; // +4px base for the content itself
    // For leaf nodes, add padding to where chevron would be for alignment
    const leafNodeIndentStyle = { paddingLeft: `${level * 20 + 4 + 20}px` }; // level_padding + chevron_width_approx (4+16=20)

    if (children.length > 0) {
        return (
            <Collapsible open={isExpanded} onOpenChange={() => onToggleExpansion(task.id)} asChild>
                <div className="collapsible-task-item-wrapper">
                    <div
                        className="flex items-center hover:bg-muted/30 border-b"
                        style={{ height: `${rowHeight}px` }}
                    >
                        <div className="w-1/4 text-xs truncate pl-4 pr-2 cursor-pointer" onClick={() => onTaskRowClick?.(task)}>{task.id}</div>
                        <CollapsibleTrigger asChild>
                            <div
                                className="w-1/2 text-xs truncate pr-2 flex items-center cursor-pointer"
                                style={taskNameStyle}
                            >
                                <ChevronRight
                                    className={`h-4 w-4 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                                {task.name}
                            </div>
                        </CollapsibleTrigger>
                        <div className="w-1/4 text-xs text-center cursor-pointer" onClick={() => onTaskRowClick?.(task)}>{task.start.toLocaleDateString()}</div>
                        <div className="w-1/4 text-xs text-center pr-4 cursor-pointer" onClick={() => onTaskRowClick?.(task)}>{task.end.toLocaleDateString()}</div>
                        <div className="w-1/4 text-xs text-center pr-4 cursor-pointer" onClick={() => onTaskRowClick?.(task)}>{task.dependencies?.join(", ")}</div>
                    </div>
                    <CollapsibleContent>
                        {isExpanded && children.map((child) => (
                            <TaskListItem
                                key={child.id}
                                task={child}
                                allTasks={allTasks}
                                rowHeight={rowHeight}
                                level={level + 1}
                                onTaskRowClick={onTaskRowClick}
                                isExpanded={!!expandedTaskIds[child.id]}
                                onToggleExpansion={onToggleExpansion}
                                expandedTaskIds={expandedTaskIds}
                            />
                        ))}
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    } else {
        return (
            <div
                className="flex items-center hover:bg-muted/30 cursor-pointer border-b"
                style={{ height: `${rowHeight}px` }}
                onClick={() => onTaskRowClick?.(task)}
            >
                <div className="w-1/4 text-xs truncate pl-4 pr-2">{task.id}</div>
                <div className="w-1/2 text-xs truncate pr-2 flex items-center" style={leafNodeIndentStyle}>
                    {task.name}
                </div>
                <div className="w-1/4 text-xs text-center">{task.start.toLocaleDateString()}</div>
                <div className="w-1/4 text-xs text-center pr-4">{task.end.toLocaleDateString()}</div>
                <div className="w-1/4 text-xs text-center pr-4">{task.dependencies?.join(", ")}</div>
            </div>
        );
    }
};

interface TaskListProps {
    tasks: Task[];
    rowHeight: number;
    onTaskRowClick?: (task: Task) => void;
    expandedTaskIds: Record<string, boolean>;
    onToggleExpansion: (taskId: string) => void;
}

export function TaskList({
    tasks,
    rowHeight,
    onTaskRowClick,
    expandedTaskIds,
    onToggleExpansion,
}: TaskListProps) {
    const rootTasks = tasks.filter((task) => !task.parentId);

    return (
        <div className="bg-card border-r">
            {rootTasks.map((task) => (
                <TaskListItem
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    rowHeight={rowHeight}
                    level={0}
                    onTaskRowClick={onTaskRowClick}
                    isExpanded={!!expandedTaskIds[task.id]}
                    onToggleExpansion={onToggleExpansion}
                    expandedTaskIds={expandedTaskIds}
                />
            ))}
        </div>
    );
} 