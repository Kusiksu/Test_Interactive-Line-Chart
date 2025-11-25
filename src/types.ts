export interface Variation {
  id?: number;
  name: string;
}

export interface DataPoint {
  date: string;
  visits: Record<string, number>;
  conversions: Record<string, number>;
}

export interface ChartData {
  variations: Variation[];
  data: DataPoint[];
}

export interface ProcessedDataPoint {
  date: string;
  [variationKey: string]: string | number;
}

export type TimeRange = 'day' | 'week';
export type LineStyle = 'line' | 'smooth' | 'area';
export type Theme = 'light' | 'dark';

