import React from 'react';
import { Task } from './types';

interface TaskPosition {
    x: number;
    y: number;
    width: number;
}

interface DependencyArrowsProps {
    tasks: Task[];
    taskPositions: Record<string, TaskPosition>;
    taskHeight: number;
    rtl?: boolean;
}

const ARROW_HORIZONTAL_OFFSET = 25; // Offset for horizontal segments
const ARROW_VERTICAL_OFFSET = 12;   // Vertical offset for the main horizontal line from task row edges
const ARROW_HEAD_SIZE = 5;
const ARROW_HEAD_ID = "ganttArrowHeadS"; // Unique ID
const DEFAULT_STROKE_WIDTH = "1.5";
const DEFAULT_STROKE_COLOR = "#A0A0A0"; // Lighter grey for default segments

const DependencyArrows: React.FC<DependencyArrowsProps> = ({
    tasks,
    taskPositions,
    taskHeight,
    rtl = false,
}) => {
    const arrowPaths: React.ReactNode[] = [];

    // Pre-calculate successor counts for each task
    // A task's "successor count" is the number of other tasks that depend on it.
    const successorCounts: Record<string, number> = {};
    tasks.forEach(currentTask => { // Iterate through all tasks to find their dependencies
        if (currentTask.dependencies) {
            currentTask.dependencies.forEach(predecessorId => {
                // If currentTask depends on predecessorId, then predecessorId has currentTask as a successor.
                successorCounts[predecessorId] = (successorCounts[predecessorId] || 0) + 1;
            });
        }
    });

    tasks.forEach((task) => { // task is the successor task
        const deps = task.dependencies;
        if (deps && deps.length > 0) {
            const successorPos = taskPositions[task.id];
            if (!successorPos) return;

            deps.forEach((predecessorId) => {
                const predecessorPos = taskPositions[predecessorId];
                if (!predecessorPos) return;

                // const predecessorTask = tasks.find(t => t.id === predecessorId); // Not strictly needed if we use successorCounts
                // if (!predecessorTask) return;

                const startY = predecessorPos.y + taskHeight / 2;
                const endY = successorPos.y + taskHeight / 2;

                let horizontalConnectingLineY: number;
                if (successorPos.y === predecessorPos.y) {
                    horizontalConnectingLineY = startY;
                } else if (successorPos.y > predecessorPos.y) {
                    horizontalConnectingLineY = predecessorPos.y + taskHeight + ARROW_VERTICAL_OFFSET;
                } else {
                    horizontalConnectingLineY = predecessorPos.y - ARROW_VERTICAL_OFFSET;
                }

                let x1: number, x2: number, x4: number, x6: number;

                if (rtl) {
                    const predecessorX = predecessorPos.x;
                    const successorX = successorPos.x + successorPos.width;
                    x1 = predecessorX;
                    x2 = predecessorX - ARROW_HORIZONTAL_OFFSET;
                    x4 = successorX + ARROW_HORIZONTAL_OFFSET;
                    x6 = successorX;
                } else { // LTR
                    const predecessorX = predecessorPos.x + predecessorPos.width;
                    const successorX = successorPos.x;
                    x1 = predecessorX;
                    x2 = predecessorX + ARROW_HORIZONTAL_OFFSET;
                    x4 = successorX - ARROW_HORIZONTAL_OFFSET;
                    x6 = successorX;
                }

                const pathSegments: React.ReactNode[] = [];
                // const commonStrokeColor = "#8A8A8A"; // Replaced by conditional colors

                // Segment 1: Initial horizontal from predecessor
                pathSegments.push(
                    <path
                        key={`${predecessorId}-${task.id}-s1`}
                        d={`M ${x1},${startY} H ${x2}`}
                        fill="none"
                        stroke={DEFAULT_STROKE_COLOR}
                        strokeWidth={DEFAULT_STROKE_WIDTH}
                    />
                );

                // Segment 2: First vertical (from predecessor)
                pathSegments.push(
                    <path
                        key={`${predecessorId}-${task.id}-v1`}
                        d={`M ${x2},${startY} V ${horizontalConnectingLineY}`}
                        fill="none"
                        stroke={DEFAULT_STROKE_COLOR}
                        strokeWidth={DEFAULT_STROKE_WIDTH}
                    />
                );

                // Segment 3: Main horizontal
                pathSegments.push(
                    <path
                        key={`${predecessorId}-${task.id}-s2`}
                        d={`M ${x2},${horizontalConnectingLineY} H ${x4}`}
                        fill="none"
                        stroke={DEFAULT_STROKE_COLOR}
                        strokeWidth={DEFAULT_STROKE_WIDTH}
                    />
                );

                // Segment 4: Second vertical (to successor)
                pathSegments.push(
                    <path
                        key={`${predecessorId}-${task.id}-v2`}
                        d={`M ${x4},${horizontalConnectingLineY} V ${endY}`}
                        fill="none"
                        stroke={DEFAULT_STROKE_COLOR}
                        strokeWidth={DEFAULT_STROKE_WIDTH}
                    />
                );

                // Segment 5: Final horizontal to successor (with arrowhead)
                pathSegments.push(
                    <path
                        key={`${predecessorId}-${task.id}-s3-arrow`}
                        d={`M ${x4},${endY} H ${x6}`}
                        fill="none"
                        stroke={DEFAULT_STROKE_COLOR} // Arrow segment usually matches default
                        strokeWidth={DEFAULT_STROKE_WIDTH}
                        markerEnd={`url(#${ARROW_HEAD_ID})`}
                    />
                );

                arrowPaths.push(...pathSegments);
            });
        }
    });

    if (arrowPaths.length === 0) {
        return null;
    }

    return (
        <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }} // zIndex 0 to be behind tasks
        >
            <defs>
                <marker
                    id={ARROW_HEAD_ID}
                    viewBox="0 -5 10 10"
                    refX="10" // Tip of the arrow (at x=10 in viewBox) to be at the line end
                    refY="0"
                    markerWidth={ARROW_HEAD_SIZE}
                    markerHeight={ARROW_HEAD_SIZE}
                    orient="auto" // Orient along the path direction
                >
                    <path d="M0,-5L10,0L0,5" fill={DEFAULT_STROKE_COLOR} /> {/* Arrowhead color matches default lines */}
                </marker>
            </defs>
            <g>{arrowPaths}</g>
        </svg>
    );
};

export default DependencyArrows; 