import GanttChart from "@/components/gantt/GanttChart";
import { myTasks } from "./tasks";

export default function Home() {
  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <GanttChart tasks={myTasks} />
    </div>
  );
}
