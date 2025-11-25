import { ChartData, ProcessedDataPoint, Variation, TimeRange } from '../types';

export function calculateConversionRate(conversions: number, visits: number): number {
  if (visits === 0) return 0;
  return (conversions / visits) * 100;
}

export function processData(
  chartData: ChartData,
  selectedVariations: string[],
  timeRange: TimeRange
): ProcessedDataPoint[] {
  const processed: ProcessedDataPoint[] = [];

  chartData.data.forEach((dataPoint) => {
    const point: ProcessedDataPoint = {
      date: dataPoint.date,
    };

    selectedVariations.forEach((variationKey) => {
      const visits = dataPoint.visits[variationKey] || 0;
      const conversions = dataPoint.conversions[variationKey] || 0;
      const conversionRate = calculateConversionRate(conversions, visits);
      const value = Number(conversionRate.toFixed(2));
      // Гарантируем, что значение - валидное число
      point[variationKey] = isNaN(value) || !isFinite(value) ? 0 : value;
    });

    processed.push(point);
  });

  if (timeRange === 'week') {
    return aggregateByWeek(processed);
  }

  return processed;
}

function aggregateByWeek(data: ProcessedDataPoint[]): ProcessedDataPoint[] {
  const weeklyData: ProcessedDataPoint[] = [];
  const weekGroups: ProcessedDataPoint[][] = [];

  // 7 дней в неделю
  for (let i = 0; i < data.length; i += 7) {
    const week = data.slice(i, i + 7);
    if (week.length > 0) {
      weekGroups.push(week);
    }
  }

  weekGroups.forEach((week) => {
    if (week.length === 0) return;

    const weekPoint: ProcessedDataPoint = {
      date: week.length === 1 
        ? week[0].date 
        : `${week[0].date} - ${week[week.length - 1].date}`,
    };

    const variationKeys = Object.keys(week[0]).filter((key) => key !== 'date');

    variationKeys.forEach((key) => {
      const values = week
        .map((point) => point[key] as number)
        .filter((val) => !isNaN(val) && val !== undefined && isFinite(val));
      const average = values.length > 0
        ? values.reduce((sum, val) => sum + val, 0) / values.length
        : 0;
      const value = Number(average.toFixed(2));
      weekPoint[key] = isNaN(value) || !isFinite(value) ? 0 : value;
    });

    weeklyData.push(weekPoint);
  });

  return weeklyData;
}

export function getVariationKey(variation: Variation): string {
  return variation.id?.toString() || '0';
}

export function getVariationName(variation: Variation): string {
  return variation.name;
}

