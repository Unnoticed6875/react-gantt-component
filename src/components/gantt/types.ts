// src/components/gantt/types.ts

export interface Task {
  id: string;
  name: string;
  type: "task" | "milestone" | "project";
  start: Date;
  end: Date;
  progress: number; // Percentage, 0-100
  dependencies?: string[]; // IDs of tasks this task depends on
  parentId?: string | null; // For sub-tasks
  // isOpen?: boolean; // For expandable tasks, if needed in the future
  // customStyles?: React.CSSProperties; // For custom styling of individual tasks
  order: number; // To define the display order
  backgroundColor?: string;
  // milestone?: boolean; // This seems redundant if 'type' includes 'milestone'
}

export interface GanttLink {
  id: string | number;
  source: string | number; // Task ID
  target: string | number; // Task ID
  type: "FS" | "SS" | "EF" | "SF"; // Finish-to-Start, Start-to-Start, etc.
}

export type ViewMode = "day" | "week" | "month" | "quarter" | "year";
