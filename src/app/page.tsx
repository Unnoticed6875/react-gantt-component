'use client'; // Required for useState

import React, { useState } from 'react'; // Import useState
import GanttChart from "@/components/gantt/GanttChart";
import { myTasks as initialTasks } from "./tasks"; // Rename import to avoid conflict
import { Task } from '@/components/gantt/types'; // Import Task type for state

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks); // Use state for tasks

  const handleTasksUpdate = (updatedTasks: Task[]) => {
    setTasks(updatedTasks); // This will trigger a re-render with new task data
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <GanttChart
        tasks={tasks}
        onTasksUpdate={handleTasksUpdate} // Pass the update handler
      />
    </div>
  );
}
