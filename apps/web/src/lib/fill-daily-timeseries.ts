export type DailyTimeseriesPoint = {
  date: string;
  value: number;
};

function toDateKey(date: string): string {
  return date.slice(0, 10);
}

export function getChartPeriodDates(range: string): {
  startDate: Date;
  endDate: Date;
} {
  const days = Number.parseInt(range, 10);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

export function fillDailyTimeseriesGaps(
  points: DailyTimeseriesPoint[],
  period: { startDate: Date; endDate: Date }
): DailyTimeseriesPoint[] {
  const dataMap = new Map(
    points.map((point) => [toDateKey(point.date), point.value])
  );

  const filled: DailyTimeseriesPoint[] = [];
  const currentDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0] ?? '';
    filled.push({
      date: dateStr,
      value: dataMap.get(dateStr) ?? 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return filled;
}
