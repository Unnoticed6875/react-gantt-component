This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## About This Project

This project features a dynamic and interactive Gantt chart component built with React and TypeScript, designed for modern web applications. It allows for clear visualization and management of project timelines and tasks. Key functionalities include drag-and-drop for adjusting task start/end dates and duration, task resizing, and visual representation of task dependencies. The component supports various view modes (day, week, month, etc.) and timeline zooming for flexible project overview. It's structured with a clear separation of concerns, utilizing custom hooks for managing drag-and-drop interactions (`useGanttDnD`) and timeline zoom/scaling (`useTimelineZoom`), making it adaptable and maintainable.

## Key Features & Functionality

- **Interactive Task Manipulation:**
  - Drag-and-drop functionality to adjust task start dates and effectively move tasks along the timeline.
  - Resize task bars directly on the timeline to modify their duration.
- **Dependency Visualization:** Clearly renders dependency lines between tasks, helping to visualize project flow and task relationships.
- **Multiple View Modes:** Offers various timeline perspectives, including Day, Week, Month, Quarter and Year views, to accommodate different levels of planning detail.
- **Timeline Zoom & Navigation:**
  - Smooth zoom in/out capabilities (Ctrl + Mouse Wheel) for adjusting the timeline scale.
  - Horizontal scrolling for easy navigation across the project timeline.
- **Hierarchical Task Structure:** Supports nested tasks (parent-child relationships) with expand/collapse functionality for better organization of complex projects.
- **Resizable Panel Layout:** The interface is divided into a task list and a timeline area, with a draggable handle to resize these panels according to user preference.
- **Customizable Task Appearance & Progress Tracking:**
  - Task bars can be styled (e.g., color for milestones vs. regular tasks).
  - Displays task progress directly on the task bars.
- **Drag Overlay for Enhanced UX:** Utilizes a drag overlay during drag-and-drop operations for a smoother and more intuitive user experience.
- **Built with Modern Tech:** Leverages React, TypeScript, and dnd-kit for a robust, type-safe, and interactive component.

## How to Reuse the Gantt Component

This Gantt chart is designed as a reusable React component. Here's how you can integrate it into your project:

### 1. Installation / Setup

Currently, the simplest way to use this component is to copy the entire `src/components/gantt` directory into your project's components folder.

Ensure you have the necessary dependencies installed. This component relies on:

- `@dnd-kit/core` and `@dnd-kit/modifiers` for drag-and-drop functionality.
- `date-fns` for date manipulations.
- Shadcn UI components (or your own equivalents for): `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`, `ScrollArea`, `ScrollBar`, `Button`, `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `Progress`.
  You can typically add these via the Shadcn CLI, e.g., `npx shadcn-ui@latest add resizable`.

Make sure your project is set up to handle TypeScript and Tailwind CSS (if you're using the default Shadcn styling).

### 2. Importing the Component and Types

```typescript
import GanttChart from "[path-to-your-components]/gantt/GanttChart";
import { Task, ViewMode } from "[path-to-your-components]/gantt/types";
```

### 3. Basic Usage Example

```tsx
import React, { useState } from "react";
import GanttChart from "./components/gantt/GanttChart"; // Adjust path as needed
import { Task, ViewMode } from "./components/gantt/types"; // Adjust path as needed

const MyProjectView: React.FC = () => {
  const initialTasks: Task[] = [
    {
      id: "task-1",
      name: "Develop Feature A",
      start: new Date(2024, 6, 1), // July 1, 2024
      end: new Date(2024, 6, 10),
      progress: 60,
      type: "task",
    },
    {
      id: "task-2",
      name: "Test Feature A",
      start: new Date(2024, 6, 11),
      end: new Date(2024, 6, 15),
      dependencies: ["task-1"],
      type: "task",
    },
    {
      id: "milestone-1",
      name: "Feature A Complete",
      start: new Date(2024, 6, 15),
      end: new Date(2024, 6, 15),
      type: "milestone",
      dependencies: ["task-2"],
    },
    // Add more tasks as needed
  ];

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleTasksUpdate = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    // Optionally, save updatedTasks to your backend or state management solution
    console.log("Tasks updated:", updatedTasks);
  };

  return (
    <div style={{ height: "600px", width: "100%" }}>
      {" "}
      {/* Ensure container has dimensions */}
      <GanttChart
        tasks={tasks}
        defaultViewMode="week"
        onTasksUpdate={handleTasksUpdate}
        initialTasksOpen={true}
      />
    </div>
  );
};

export default MyProjectView;
```

### 4. Component Props (`GanttChartProps`)

- `tasks: Task[]` (Required): An array of task objects to display on the Gantt chart.
  - Each `Task` object should conform to the following structure (see `src/components/gantt/types.ts` for full details):
    ```typescript
    interface Task {
      id: string;
      name: string;
      start: Date;
      end: Date;
      progress?: number; // Optional: 0-100
      dependencies?: string[]; // Optional: Array of task IDs this task depends on
      parentId?: string; // Optional: ID of the parent task for hierarchical view
      type?: "task" | "milestone"; // Optional: Defaults to 'task'
      // ... other custom fields can be added as needed
    }
    ```
- `rowHeight?: number`: The height of each task row in pixels. Defaults to `50`.
- `defaultViewMode?: ViewMode`: The initial view mode for the timeline. `ViewMode` can be `'day'`, `'week'`, `'month'`, `'quarter'`, or `'year'`. Defaults to `'day'`.
- `onTasksUpdate?: (updatedTasks: Task[]) => void`: A callback function that is invoked when tasks are modified (e.g., by dragging or resizing). It receives the array of updated tasks. This is crucial for persisting changes.
- `initialTasksOpen?: boolean`: If `true`, parent tasks in a hierarchical structure will be expanded by default. Defaults to `true`.

### 5. Styling

The component uses Tailwind CSS for styling, primarily through Shadcn UI components. You can customize the appearance by:

- Modifying the Tailwind classes within the component files.
- Overriding Shadcn UI component styles as per their documentation.

Make sure your project's Tailwind CSS setup includes the paths to these components if you copy them directly.

## Future Updates

While this Gantt component is already quite functional, here are some potential enhancements and features planned for future development:

- **Advanced Dependency Types:** Extend support beyond basic Finish-to-Start dependencies to include Start-to-Start (SS), Finish-to-Finish (FF), and Start-to-Finish (SF) with optional lag times.
- **Export Options:** Add options to export the Gantt chart view to common formats like PNG or PDF.
- **Performance Enhancements:** Further optimize rendering and interactions, especially for projects with a very large number of tasks (e.g., through virtualization techniques).
- **Enhanced Theming and Customization:** Provide more granular control over the appearance of task bars, timeline, and grid without direct code modification.
- **Keyboard Navigation & Accessibility:** Improve keyboard navigation and ARIA attributes for better usability for all users.
- **Undo/Redo Functionality:** Implement an undo/redo stack for task manipulations.
- **Configurable Task List Columns:** Allow users to select which task data fields are visible in the task list area and potentially add custom columns.

Contributions and suggestions for new features are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
