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

interface ArrowPathParams {
    predecessorPos: TaskPosition;
    successorPos: TaskPosition;
    predecessorId: string;
    successorId: string;
    taskHeight: number;
    rtl: boolean;
}

function generateArrowPathSegments({
    predecessorPos,
    successorPos,
    predecessorId,
    successorId,
    taskHeight,
    rtl
}: ArrowPathParams): React.ReactNode[] {
    const startY = predecessorPos.y + taskHeight / 2;
    const endY = successorPos.y + taskHeight / 2;

    let horizontalConnectingLineY: number;
    if (successorPos.y === predecessorPos.y) {
        // For same-row tasks, try to route slightly differently if they are very close or overlapping
        // This simple version keeps it on the same line, adjust if complex routing is needed.
        horizontalConnectingLineY = startY;
    } else if (successorPos.y > predecessorPos.y) {
        horizontalConnectingLineY = predecessorPos.y + taskHeight + ARROW_VERTICAL_OFFSET;
        // Ensure horizontalConnectingLineY is not too close to successorPos.y if successor is just one row below
        if (horizontalConnectingLineY > endY - ARROW_VERTICAL_OFFSET) {
            horizontalConnectingLineY = (startY + endY) / 2; // Midpoint if too close
        }
    } else { // successorPos.y < predecessorPos.y
        horizontalConnectingLineY = predecessorPos.y - ARROW_VERTICAL_OFFSET;
        if (horizontalConnectingLineY < endY + ARROW_VERTICAL_OFFSET) {
            horizontalConnectingLineY = (startY + endY) / 2;
        }
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

    // Prevent lines from crossing back over themselves too much if tasks are very close
    // If x2 (first turn) is beyond x4 (second turn), it means tasks are too close for normal routing.
    // This is a simplified check. More complex scenarios might need advanced pathfinding.
    if ((!rtl && x2 > x4) || (rtl && x2 < x4)) {
        x2 = (x1 + x6) / 2;
        x4 = x2;
        // If tasks are in the same row and too close, the horizontal connecting line might be very short or negative.
        // In this case, directly connect or use a simpler path.
        if (successorPos.y === predecessorPos.y) {
            horizontalConnectingLineY = startY; // Keep on same line
        }
    }

    const pathSegments: React.ReactNode[] = [];

    pathSegments.push(
        <path
            key={`${predecessorId}-${successorId}-s1`}
            d={`M ${x1},${startY} H ${x2}`}
            fill="none" stroke={DEFAULT_STROKE_COLOR} strokeWidth={DEFAULT_STROKE_WIDTH}
        />
    );
    pathSegments.push(
        <path
            key={`${predecessorId}-${successorId}-v1`}
            d={`M ${x2},${startY} V ${horizontalConnectingLineY}`}
            fill="none" stroke={DEFAULT_STROKE_COLOR} strokeWidth={DEFAULT_STROKE_WIDTH}
        />
    );
    pathSegments.push(
        <path
            key={`${predecessorId}-${successorId}-s2`}
            d={`M ${x2},${horizontalConnectingLineY} H ${x4}`}
            fill="none" stroke={DEFAULT_STROKE_COLOR} strokeWidth={DEFAULT_STROKE_WIDTH}
        />
    );
    pathSegments.push(
        <path
            key={`${predecessorId}-${successorId}-v2`}
            d={`M ${x4},${horizontalConnectingLineY} V ${endY}`}
            fill="none" stroke={DEFAULT_STROKE_COLOR} strokeWidth={DEFAULT_STROKE_WIDTH}
        />
    );
    pathSegments.push(
        <path
            key={`${predecessorId}-${successorId}-s3-arrow`}
            d={`M ${x4},${endY} H ${x6}`}
            fill="none" stroke={DEFAULT_STROKE_COLOR} strokeWidth={DEFAULT_STROKE_WIDTH}
            markerEnd={`url(#${ARROW_HEAD_ID})`}
        />
    );
    return pathSegments;
}

const DependencyArrows: React.FC<DependencyArrowsProps> = ({
    tasks,
    taskPositions,
    taskHeight,
    rtl = false,
}) => {
    const arrowPathElements: React.ReactNode[] = [];

    tasks.forEach((successorTask) => {
        const deps = successorTask.dependencies;
        if (deps && deps.length > 0) {
            const successorPos = taskPositions[successorTask.id];
            if (!successorPos) return;

            deps.forEach((predecessorId) => {
                const predecessorPos = taskPositions[predecessorId];
                if (!predecessorPos) return;

                arrowPathElements.push(...generateArrowPathSegments({
                    predecessorPos,
                    successorPos,
                    predecessorId,
                    successorId: successorTask.id,
                    taskHeight,
                    rtl
                }));
            });
        }
    });

    if (arrowPathElements.length === 0) {
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
            <g>{arrowPathElements}</g>
        </svg>
    );
};

export default DependencyArrows; 