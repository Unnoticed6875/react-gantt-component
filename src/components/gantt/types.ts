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

export interface GanttLink {
  id: string | number;
  source: string | number; // Task ID
  target: string | number; // Task ID
  type: "FS" | "SS" | "EF" | "SF"; // Finish-to-Start, Start-to-Start, etc.
}

export type ViewMode = "day" | "week" | "month" | "quarter" | "year";
