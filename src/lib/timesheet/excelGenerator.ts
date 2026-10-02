import type { AggregatedRow, ColumnMapping, PresetConfig } from './types';

/**
 * Excelの列記号（例: 'A', 'Z', 'AA'）を 1-indexed の列番号に変換
 */
export function columnLetterToNumber(letter: string): number {
  let num = 0;
  const upper = letter.toUpperCase().trim();
  for (let i = 0; i < upper.length; i++) {
    num = num * 26 + (upper.charCodeAt(i) - 64);
  }
  return num;
}

/**
 * 1-indexed の列番号を列記号（例: 1 -> 'A', 27 -> 'AA'）に変換
 */
export function columnNumberToLetter(num: number): string {
  let letter = '';
  let temp = num;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * セル記号（例: 'A6', 'C10'）を行番号と列番号に分解
 */
export function parseCellAddress(cellAddress: string): { row: number; col: number } {
  const match = cellAddress.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    return { row: 1, col: 1 };
  }
  return {
    col: columnLetterToNumber(match[1]),
    row: parseInt(match[2], 10),
  };
}

/**
 * 集計行からマッピングされたフィールドの値を取得
 */
export function getFieldValueForMapping(
  row: AggregatedRow,
  sourceField: string,
  timeFormat: 'hhmm' | 'decimal'
): string | number {
  if (sourceField === 'date') return row.date || '';
  if (sourceField === 'project') return row.project || '';
  if (sourceField === 'task') return row.task || '';
  if (sourceField === 'description') return row.description || '';
  if (sourceField === 'user') return row.user || '';
  if (sourceField === 'client') return row.client || '';
  if (sourceField === 'duration') {
    return timeFormat === 'decimal' ? row.durationHours : row.durationFormatted;
  }
  if (sourceField === 'duration_hhmm') return row.durationFormatted;
  if (sourceField === 'duration_hours') return row.durationHours;

  // カスタムカラム
  if (row.customValues && row.customValues[sourceField] !== undefined) {
    return row.customValues[sourceField];
  }

  return '';
}

/**
 * Excelワークブックを生成し、Blobとして返す
 */
export async function generateExcelBlob(
  rows: AggregatedRow[],
  config: PresetConfig,
  templateFile?: File | null
): Promise<Blob> {
  // ブラウザ用バンドルを動的インポート
  // @ts-ignore
  const ExcelJSModule = await import('exceljs/dist/exceljs.min.js');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();

  let worksheet: any;

  if (templateFile) {
    const arrayBuffer = await templateFile.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    worksheet = workbook.worksheets[0] || workbook.addWorksheet('勤務表');
  } else {
    worksheet = workbook.addWorksheet('勤務表');
    // デフォルトヘッダー行の挿入
    const headerRow = worksheet.getRow(1);
    config.columnMappings.forEach((mapping) => {
      const colNum = columnLetterToNumber(mapping.columnLetter);
      const cell = headerRow.getCell(colNum);
      cell.value = mapping.sourceField;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  const { row: startRow } = parseCellAddress(config.startCell || 'A2');

  // データ流し込み
  rows.forEach((row, index) => {
    const currentRowNumber = startRow + index;
    const worksheetRow = worksheet.getRow(currentRowNumber);

    config.columnMappings.forEach((mapping) => {
      const colNum = columnLetterToNumber(mapping.columnLetter);
      const cell = worksheetRow.getCell(colNum);
      const val = getFieldValueForMapping(row, mapping.sourceField, config.timeFormat);
      cell.value = val;
    });

    worksheetRow.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 集計データをCSV文字列に変換
 */
export function generateCsvString(
  rows: AggregatedRow[],
  config: PresetConfig
): string {
  const headers = config.columnMappings.map((m) => m.sourceField);
  const lines: string[] = [headers.join(',')];

  rows.forEach((row) => {
    const values = config.columnMappings.map((m) => {
      const val = getFieldValueForMapping(row, m.sourceField, config.timeFormat);
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    });
    lines.push(values.join(','));
  });

  return '\uFEFF' + lines.join('\r\n'); // UTF-8 BOM付き
}

/**
 * ファイル名を動的パターンから解決
 * 例: {project}_{yyyymm}_勤務表.xlsx
 */
export function resolveFilename(
  pattern: string,
  rows: AggregatedRow[],
  extension: 'xlsx' | 'csv'
): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  // 代表プロジェクト名の抽出
  const firstProject = rows.find((r) => r.project)?.project || 'project';

  let name = pattern || '{project}_{yyyymm}_勤務表';
  name = name.replace(/\{project\}/gi, firstProject);
  name = name.replace(/\{yyyy\}/gi, yyyy);
  name = name.replace(/\{mm\}/gi, mm);
  name = name.replace(/\{dd\}/gi, dd);
  name = name.replace(/\{yyyymm\}/gi, `${yyyy}${mm}`);
  name = name.replace(/\{yyyymmdd\}/gi, `${yyyy}${mm}${dd}`);

  return `${name}.${extension}`;
}

/**
 * ブラウザダウンロード用ヘルパー
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
