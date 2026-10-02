import type {
  AggregationUnit,
  AggregatedRow,
  CustomColumn,
  TogglRawRow,
} from './types';

/**
 * 柔軟にカラム名を取得（大文字小文字や揺れを吸収）
 */
function getFieldValue(row: TogglRawRow, candidateKeys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const candidate of candidateKeys) {
    const foundKey = rowKeys.find(
      (k) => k.trim().toLowerCase() === candidate.toLowerCase()
    );
    if (foundKey && row[foundKey] !== undefined) {
      return String(row[foundKey]).trim();
    }
  }
  return '';
}

/**
 * HH:MM:SS または HH:MM または 秒数文字列を秒（数値）に変換
 */
export function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const clean = durationStr.trim();

  // HH:MM:SS または HH:MM 形式
  if (clean.includes(':')) {
    const parts = clean.split(':').map((p) => parseFloat(p) || 0);
    if (parts.length === 3) {
      return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    } else if (parts.length === 2) {
      return Math.round(parts[0] * 3600 + parts[1] * 60);
    }
  }

  // 小数時間 (例: 1.5 または 1.5h) の場合
  if (clean.endsWith('h') || clean.endsWith('H')) {
    const val = parseFloat(clean.slice(0, -1));
    return isNaN(val) ? 0 : Math.round(val * 3600);
  }

  // 秒数としての直接の数値
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    // Togglエクスポートで秒単位になっている場合
    return Math.round(num);
  }

  return 0;
}

/**
 * 秒数を HH:MM:SS 形式に変換
 */
export function formatSecondsToHHMMSS(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * 秒数を小数時間（例: 1.50）に変換
 */
export function formatSecondsToHours(totalSeconds: number): number {
  return Math.round((totalSeconds / 3600) * 100) / 100;
}

interface RowContext {
  date?: string;
  project?: string;
  task?: string;
  description?: string;
  user?: string;
  client?: string;
  durationHours: number;
  durationFormatted: string;
}

/**
 * 安全な算術式の計算
 */
function evaluateMathExpression(expr: string): number {
  const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
  if (!sanitized.trim()) return 0;
  try {
    const fn = new Function(`"use strict"; return (${sanitized})`);
    const val = fn();
    return typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.round(val * 100) / 100 : 0;
  } catch {
    return 0;
  }
}

/**
 * プレースホルダーの置換処理
 * 例: { Description }___{ Client } -> タスク説明___株式会社○○
 */
export function resolvePlaceholders(
  template: string,
  context: RowContext,
  customValues: Record<string, string | number> = {}
): string {
  return template.replace(/\{([^}]+)\}/g, (match, rawKey) => {
    const key = rawKey.trim().toLowerCase();
    if (key === 'description' || key === '説明' || key === '概要' || key === '内容') {
      return context.description || '';
    }
    if (key === 'client' || key === 'クライアント') {
      return context.client || '';
    }
    if (key === 'project' || key === 'プロジェクト') {
      return context.project || '';
    }
    if (key === 'task' || key === 'タスク') {
      return context.task || '';
    }
    if (key === 'date' || key === '日付') {
      return context.date || '';
    }
    if (key === 'user' || key === 'ユーザー') {
      return context.user || '';
    }
    if (key === 'duration' || key === '時間' || key === 'duration_hours' || key === '小数時間') {
      return String(context.durationHours);
    }
    if (key === 'duration_hhmm' || key === '時分秒') {
      return context.durationFormatted;
    }

    // 先に計算されたカスタムカラムの参照
    const trimmed = rawKey.trim();
    if (customValues[trimmed] !== undefined) {
      return String(customValues[trimmed]);
    }
    return match;
  });
}

/**
 * カスタムカラムの値の計算
 */
function calculateCustomValues(
  context: RowContext,
  customColumns: CustomColumn[]
): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  for (const col of customColumns) {
    if (col.type === 'fixed') {
      result[col.id] = col.value;
    } else if (col.type === 'multiply_duration') {
      const unitPrice = parseFloat(col.value) || 0;
      result[col.id] = Math.round(context.durationHours * unitPrice);
    } else if (col.type === 'template') {
      result[col.id] = resolvePlaceholders(col.value, context, result);
    } else if (col.type === 'formula') {
      const replacedExpr = resolvePlaceholders(col.value, context, result);
      result[col.id] = evaluateMathExpression(replacedExpr);
    }
  }

  return result;
}

/**
 * Togglの生データを指定の集計単位で加工・集計する
 */
export function aggregateTogglRows(
  rows: TogglRawRow[],
  unit: AggregationUnit,
  customColumns: CustomColumn[]
): AggregatedRow[] {
  if (unit === 'raw') {
    return rows.map((row) => {
      const durationStr = getFieldValue(row, ['duration', '所要時間']);
      const sec = parseDurationToSeconds(durationStr);
      const hours = formatSecondsToHours(sec);
      const formatted = formatSecondsToHHMMSS(sec);
      const context: RowContext = {
        date: getFieldValue(row, ['start date', 'date', '日付', '開始日']),
        project: getFieldValue(row, ['project', 'プロジェクト']),
        task: getFieldValue(row, ['task', 'タスク']),
        description: getFieldValue(row, ['description', '説明', '概要', '内容']),
        user: getFieldValue(row, ['user', 'ユーザー']),
        client: getFieldValue(row, ['client', 'クライアント']),
        durationHours: hours,
        durationFormatted: formatted,
      };

      return {
        ...context,
        durationSeconds: sec,
        customValues: calculateCustomValues(context, customColumns),
      };
    });
  }

  // グループ化キーの決定
  const groups: Map<
    string,
    {
      date?: string;
      project?: string;
      task?: string;
      descriptions: Set<string>;
      user?: string;
      client?: string;
      totalSeconds: number;
    }
  > = new Map();

  for (const row of rows) {
    const date = getFieldValue(row, ['start date', 'date', '日付', '開始日']);
    const project = getFieldValue(row, ['project', 'プロジェクト']);
    const task = getFieldValue(row, ['task', 'タスク']);
    const description = getFieldValue(row, ['description', '説明', '概要', '内容']);
    const user = getFieldValue(row, ['user', 'ユーザー']);
    const client = getFieldValue(row, ['client', 'クライアント']);
    const durationStr = getFieldValue(row, ['duration', '所要時間']);
    const sec = parseDurationToSeconds(durationStr);

    let groupKey = '';
    if (unit === 'date') {
      groupKey = `${date || '未設定'}`;
    } else if (unit === 'task') {
      groupKey = `${project || 'なし'}_${task || 'なし'}_${description || 'なし'}`;
    } else if (unit === 'project') {
      groupKey = `${project || 'なし'}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        date,
        project,
        task,
        descriptions: new Set(description ? [description] : []),
        user,
        client,
        totalSeconds: 0,
      });
    }

    const grp = groups.get(groupKey)!;
    grp.totalSeconds += sec;
    if (description) {
      grp.descriptions.add(description);
    }
  }

  const result: AggregatedRow[] = [];
  for (const [, grp] of groups.entries()) {
    const hours = formatSecondsToHours(grp.totalSeconds);
    const descText = Array.from(grp.descriptions).join(', ');
    const formatted = formatSecondsToHHMMSS(grp.totalSeconds);
    const context: RowContext = {
      date: grp.date,
      project: grp.project,
      task: grp.task,
      description: descText,
      user: grp.user,
      client: grp.client,
      durationHours: hours,
      durationFormatted: formatted,
    };

    result.push({
      ...context,
      durationSeconds: grp.totalSeconds,
      customValues: calculateCustomValues(context, customColumns),
    });
  }

  // 日付順や名前順でソート
  if (unit === 'date') {
    result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } else if (unit === 'project') {
    result.sort((a, b) => (a.project || '').localeCompare(b.project || ''));
  }

  return result;
}
