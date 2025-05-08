import { Task } from "./types";

export const getStartAndEndDates = (tasks: Task[]) => {
  if (!tasks || tasks.length === 0) {
    return { overallMinDate: null, overallMaxDate: null };
  }

  let overallMinDate = tasks[0].start;
  let overallMaxDate = tasks[0].end;

  tasks.forEach((task) => {
    if (task.start < overallMinDate) {
      overallMinDate = task.start;
    }
    if (task.end > overallMaxDate) {
      overallMaxDate = task.end;
    }
  });

  return { overallMinDate, overallMaxDate };
};
