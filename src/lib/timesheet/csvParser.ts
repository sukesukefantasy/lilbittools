import Papa from 'papaparse';
import type { ParseResult, TogglRawRow } from './types';

export function parseTogglCsv(
  fileOrText: File | string,
  requiredColumns: string[]
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const handleComplete = (results: Papa.ParseResult<Record<string, string>>) => {
      if (results.errors && results.errors.length > 0 && results.data.length === 0) {
        resolve({
          headers: [],
          rows: [],
          missingRequiredColumns: [],
          isValid: false,
          error: results.errors.map((e) => e.message).join(', '),
        });
        return;
      }

      const headers = (results.meta.fields || []).map((h) => h.trim());
      const normalizedHeaders = headers.map((h) => h.toLowerCase());

      // 必須カラム判定（大文字小文字の差異を許容）
      const missingRequiredColumns: string[] = [];
      for (const req of requiredColumns) {
        const trimmedReq = req.trim();
        if (!trimmedReq) continue;
        const exists = normalizedHeaders.some((h) => h === trimmedReq.toLowerCase());
        if (!exists) {
          missingRequiredColumns.push(trimmedReq);
        }
      }

      // 空白行を除去
      const rows: TogglRawRow[] = results.data.filter((row) => {
        return Object.values(row).some((val) => val && String(val).trim() !== '');
      });

      resolve({
        headers,
        rows,
        missingRequiredColumns,
        isValid: missingRequiredColumns.length === 0,
        error:
          missingRequiredColumns.length > 0
            ? `必須カラムが見つかりません: ${missingRequiredColumns.join(', ')}`
            : undefined,
      });
    };

    if (typeof fileOrText === 'string') {
      Papa.parse<Record<string, string>>(fileOrText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: handleComplete,
        error: (error: Error) => {
          resolve({
            headers: [],
            rows: [],
            missingRequiredColumns: [],
            isValid: false,
            error: error.message,
          });
        },
      });
    } else {
      Papa.parse<Record<string, string>>(fileOrText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: handleComplete,
        error: (error: Error) => {
          resolve({
            headers: [],
            rows: [],
            missingRequiredColumns: [],
            isValid: false,
            error: error.message,
          });
        },
      });
    }
  });
}
