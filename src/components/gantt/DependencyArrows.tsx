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
}

const ARROW_HORIZONTAL_OFFSET = 10; // Offset for horizontal segments
// const ARROW_VERTICAL_OFFSET = 12;   // Removed: Not used in the new path logic
const ARROW_HEAD_SIZE = 5;
const ARROW_HEAD_ID = "ganttArrowHeadS"; // Unique ID

const DependencyArrows: React.FC<DependencyArrowsProps> = ({
    tasks,
    taskPositions,
    taskHeight,
}) => {
    const arrowPaths: React.ReactNode[] = [];

    tasks.forEach((task) => {
        if (task.dependencies && task.dependencies.length > 0) {
            const dependentPos = taskPositions[task.id];
            if (!dependentPos) return;

            task.dependencies.forEach((depId) => {
                const dependencyPos = taskPositions[depId];
                if (!dependencyPos) return;

                const startX = dependencyPos.x + dependencyPos.width;
                const startY = dependencyPos.y + taskHeight / 2;
                const endX = dependentPos.x;
                const endY = dependentPos.y + taskHeight / 2;

                const intermediateY = (startY + endY) / 2;

                // Path based on the user's diagram:
                // Start -> Right -> Vertical -> Left -> Vertical -> Right into End
                const points = [
                    `${startX},${startY}`,                         // 1. Start
                    `${startX + ARROW_HORIZONTAL_OFFSET},${startY}`, // 2. Move Right
                    `${startX + ARROW_HORIZONTAL_OFFSET},${intermediateY}`, // 3. Move Vertical down/up to midpoint Y
                    `${endX - ARROW_HORIZONTAL_OFFSET},${intermediateY}`,   // 4. Move Horizontal left across midpoint Y
                    `${endX - ARROW_HORIZONTAL_OFFSET},${endY}`,      // 5. Move Vertical down/up to target Y
                    `${endX},${endY}`,                         // 6. Move Right into Target
                ].join(' ');

                arrowPaths.push(
                    <polyline
                        key={`${depId}-${task.id}`}
                        points={points}
                        fill="none"
                        stroke="#8A8A8A" // Gray color
                        strokeWidth="1.5"
                        markerEnd={`url(#${ARROW_HEAD_ID})`}
                    />
                );
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
                    refX="5" // Center marker tip
                    refY="0"
                    markerWidth={ARROW_HEAD_SIZE}
                    markerHeight={ARROW_HEAD_SIZE}
                    orient="auto-start-reverse"
                >
                    <path d="M0,-5L10,0L0,5" fill="#8A8A8A" />
                </marker>
            </defs>
            <g>{arrowPaths}</g>
        </svg>
    );
};

export default DependencyArrows; 