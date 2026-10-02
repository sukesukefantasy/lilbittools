import type { PresetConfig } from './types';

const STORAGE_KEY = 'toggl_timesheet_presets_v1';
const ACTIVE_PRESET_KEY = 'toggl_timesheet_active_preset_id';

export const DEFAULT_PRESET: PresetConfig = {
  id: 'default',
  name: '標準設定（日付別集計）',
  requiredColumns: ['User', 'Project', 'Description', 'Start date', 'Duration'],
  aggregationUnit: 'date',
  timeFormat: 'decimal',
  customColumns: [],
  startCell: 'A2',
  columnMappings: [
    { columnLetter: 'A', sourceField: 'date' },
    { columnLetter: 'B', sourceField: 'project' },
    { columnLetter: 'C', sourceField: 'description' },
    { columnLetter: 'D', sourceField: 'duration' },
  ],
  filenamePattern: '{project}_{yyyymm}_勤務表',
};

export const TASK_PRESET: PresetConfig = {
  id: 'task-summary',
  name: 'タスク別・請求書向け',
  requiredColumns: ['User', 'Project', 'Description', 'Start date', 'Duration'],
  aggregationUnit: 'task',
  timeFormat: 'decimal',
  customColumns: [
    {
      id: 'amount',
      name: '金額（時間×単価）',
      type: 'multiply_duration',
      value: '3000',
    },
  ],
  startCell: 'A2',
  columnMappings: [
    { columnLetter: 'A', sourceField: 'project' },
    { columnLetter: 'B', sourceField: 'task' },
    { columnLetter: 'C', sourceField: 'description' },
    { columnLetter: 'D', sourceField: 'duration' },
    { columnLetter: 'E', sourceField: 'amount' },
  ],
  filenamePattern: '{project}_{yyyymm}_請求書',
};

/**
 * プリセット設定オブジェクトを安全に正規化・補完
 */
export function normalizePresetConfig(raw: any, fallbackId?: string): PresetConfig {
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : (fallbackId || `preset_${Date.now()}`),
    name: typeof raw?.name === 'string' && raw.name ? raw.name : 'カスタムプリセット',
    requiredColumns: Array.isArray(raw?.requiredColumns) && raw.requiredColumns.length > 0
      ? raw.requiredColumns
      : DEFAULT_PRESET.requiredColumns,
    aggregationUnit: ['raw', 'date', 'task', 'project'].includes(raw?.aggregationUnit)
      ? raw.aggregationUnit
      : 'date',
    timeFormat: raw?.timeFormat === 'hhmm' ? 'hhmm' : 'decimal',
    customColumns: Array.isArray(raw?.customColumns) ? raw.customColumns : [],
    startCell: typeof raw?.startCell === 'string' && raw.startCell.trim()
      ? raw.startCell.trim().toUpperCase()
      : 'A2',
    columnMappings: Array.isArray(raw?.columnMappings) && raw.columnMappings.length > 0
      ? raw.columnMappings
      : DEFAULT_PRESET.columnMappings,
    filenamePattern: typeof raw?.filenamePattern === 'string' && raw.filenamePattern.trim()
      ? raw.filenamePattern.trim()
      : '{project}_{yyyymm}_勤務表',
  };
}

export function loadPresets(): PresetConfig[] {
  if (typeof window === 'undefined') return [DEFAULT_PRESET, TASK_PRESET];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [DEFAULT_PRESET, TASK_PRESET];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p, idx) => normalizePresetConfig(p, `preset_${idx}`));
    }
  } catch (e) {
    console.error('Failed to load presets from localStorage', e);
  }
  return [DEFAULT_PRESET, TASK_PRESET];
}

export function savePresets(presets: PresetConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = presets.map((p) => normalizePresetConfig(p));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Failed to save presets to localStorage', e);
  }
}

export function getActivePresetId(): string {
  if (typeof window === 'undefined') return DEFAULT_PRESET.id;
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY) || DEFAULT_PRESET.id;
  } catch {
    return DEFAULT_PRESET.id;
  }
}

export function setActivePresetId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_PRESET_KEY, id);
  } catch (e) {
    console.error('Failed to set active preset id', e);
  }
}

/**
 * プリセット設定をJSONファイルとしてダウンロード
 */
export function downloadPresetConfigJson(preset: PresetConfig): void {
  const normalized = normalizePresetConfig(preset);
  const jsonStr = JSON.stringify(normalized, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const filename = `timesheet-config_${normalized.name.replace(/\s+/g, '_')}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * アップロードされたJSONファイルをPresetConfigとして検証・解析
 */
export function parseUploadedPresetJson(content: string): PresetConfig | PresetConfig[] | null {
  try {
    const data = JSON.parse(content);
    // 配列の場合
    if (Array.isArray(data)) {
      const valid = data.filter((item) => item && typeof item === 'object' && item.name && Array.isArray(item.columnMappings));
      return valid.length > 0 ? (valid.map((item, idx) => normalizePresetConfig(item, `imported_${Date.now()}_${idx}`)) as PresetConfig[]) : null;
    }
    // 単一オブジェクトの場合
    if (data && typeof data === 'object' && data.name && Array.isArray(data.columnMappings)) {
      return normalizePresetConfig(data, `imported_${Date.now()}`);
    }
    return null;
  } catch {
    return null;
  }
}
