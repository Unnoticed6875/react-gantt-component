// src/components/gantt/types.ts

export interface Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[]; // IDs of tasks this task depends on
  milestone?: boolean;
  type: "task" | "milestone";
}

// Assuming GanttTask might have more specific properties for the Gantt chart itself
// For now, it can extend Task or be similar.
export interface GanttTask extends Task {
  // additional properties specific to Gantt rendering, if any
  x?: number; // example: calculated x position
  width?: number; // example: calculated width
  y?: number; // example: calculated y position
}

export interface GanttLink {
  id: string | number;
  source: string | number; // Task ID
  target: string | number; // Task ID
  type: "FS" | "SS" | "EF" | "SF"; // Finish-to-Start, Start-to-Start, etc.
}

export type ViewMode = "day" | "week" | "month" | "quarter" | "year";
