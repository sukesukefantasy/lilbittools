export type AggregationUnit = 'raw' | 'date' | 'task' | 'project';

export type CustomColumnType = 'template' | 'formula' | 'multiply_duration' | 'fixed';

export interface CustomColumn {
  id: string;
  name: string;
  type: CustomColumnType;
  value: string; // テンプレート文字列 (例: "{Description}___{Client}")、計算式、単価、固定値
}

export interface ColumnMapping {
  columnLetter: string; // 'A', 'B', 'C', ...
  sourceField: string; // 'date', 'project', 'task', 'description', 'duration_hhmm', 'duration_hours', またはカスタムカラムID
}

export interface PresetConfig {
  id: string;
  name: string;
  requiredColumns: string[];
  aggregationUnit: AggregationUnit;
  timeFormat: 'hhmm' | 'decimal'; // 'HH:MM:SS' または 小数時間 (例: 1.50)
  customColumns: CustomColumn[];
  startCell: string; // 例: 'A6'
  columnMappings: ColumnMapping[];
  filenamePattern: string; // 例: '{project}_{yyyymm}_勤務表'
}

export interface TogglRawRow {
  [key: string]: string;
}

export interface AggregatedRow {
  date?: string;
  project?: string;
  task?: string;
  description?: string;
  durationSeconds: number;
  durationFormatted: string; // HH:MM:SS
  durationHours: number; // 小数点第2位
  user?: string;
  client?: string;
  customValues: Record<string, string | number>;
  [key: string]: any;
}

export interface ParseResult {
  headers: string[];
  rows: TogglRawRow[];
  missingRequiredColumns: string[];
  isValid: boolean;
  error?: string;
}
