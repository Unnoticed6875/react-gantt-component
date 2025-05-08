export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const utc1 = Date.UTC(
    dateLeft.getFullYear(),
    dateLeft.getMonth(),
    dateLeft.getDate()
  );
  const utc2 = Date.UTC(
    dateRight.getFullYear(),
    dateRight.getMonth(),
    dateRight.getDate()
  );
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0); // Normalize to start of the day

  const finalEndDate = new Date(endDate);
  finalEndDate.setHours(0, 0, 0, 0); // Normalize

  while (currentDate <= finalEndDate) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  return dates;
}
