import React, { useState } from 'react';
import type { AggregatedRow, PresetConfig } from '../../lib/timesheet/types';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  generateCsvString,
  generateExcelBlob,
  getFieldValueForMapping,
  resolveFilename,
  triggerDownload,
} from '../../lib/timesheet/excelGenerator';
import { BASE_SOURCE_FIELDS } from './TemplateMapper';

interface Props {
  rows: AggregatedRow[];
  preset: PresetConfig;
  templateFile: File | null;
  onUpdatePreset: (updated: Partial<PresetConfig>) => void;
}

export const PreviewExport: React.FC<Props> = ({
  rows,
  preset,
  templateFile,
  onUpdatePreset,
}) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // サマリー計算
  const totalSeconds = rows.reduce((acc, r) => acc + r.durationSeconds, 0);
  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  // カスタム単価・数式等の合計計算（数値の場合）
  const totalAmounts: Record<string, number> = {};
  preset.customColumns.forEach((col) => {
    if (col.type === 'multiply_duration' || col.type === 'formula') {
      const sum = rows.reduce((acc, r) => {
        const val = r.customValues[col.id];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
      totalAmounts[col.name] = sum;
    }
  });

  const handleExportExcel = async () => {
    if (rows.length === 0) return;
    setIsExportingExcel(true);
    try {
      const blob = await generateExcelBlob(rows, preset, templateFile);
      const filename = resolveFilename(preset.filenamePattern, rows, 'xlsx');
      triggerDownload(blob, filename);
    } catch (e: any) {
      alert(`Excelエクスポートエラー: ${e.message || String(e)}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    setIsExportingCsv(true);
    try {
      const csvStr = generateCsvString(rows, preset);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const filename = resolveFilename(preset.filenamePattern, rows, 'csv');
      triggerDownload(blob, filename);
    } catch (e: any) {
      alert(`CSVエクスポートエラー: ${e.message || String(e)}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="bg-[#141414] border border-border rounded-lg p-5">
      <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand" />
        4. 集計プレビュー & エクスポート
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#181818] p-3 rounded-lg border border-border">
          <span className="text-[11px] text-[#9ca3af] flex items-center gap-1 mb-1">
            <Layers className="w-3 h-3 text-brand" /> 集計後レコード数
          </span>
          <span className="text-xl font-bold text-white font-mono">
            {rows.length}{' '}
            <span className="text-xs font-normal text-gray-400">件</span>
          </span>
        </div>

        <div className="bg-[#181818] p-3 rounded-lg border border-border">
          <span className="text-[11px] text-[#9ca3af] flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-brand" /> 合計稼働時間
          </span>
          <span className="text-xl font-bold text-white font-mono">
            {hours}h {minutes}m{' '}
            <span className="text-xs font-normal text-gray-400">
              ({totalHours.toFixed(2)}h)
            </span>
          </span>
        </div>

        {Object.entries(totalAmounts).map(([name, sum]) => (
          <div
            key={name}
            className="bg-[#181818] p-3 rounded-lg border border-border"
          >
            <span className="text-[11px] text-[#9ca3af] block truncate mb-1">
              合計: {name}
            </span>
            <span className="text-xl font-bold text-brand font-mono">
              ¥{sum.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* ファイル名パターン設定 & エクスポートボタン */}
      <div className="bg-[#181818] border border-border rounded-lg p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-70">
          <label className="block text-xs font-semibold text-[#9ca3af] mb-1">
            出力ファイル名パターン
          </label>
          <input
            type="text"
            value={preset.filenamePattern}
            onChange={(e) => onUpdatePreset({ filenamePattern: e.target.value })}
            placeholder="{project}_{yyyymm}_勤務表"
            className="w-full bg-[#141414] text-white border border-[#333] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand"
          />
          <p className="text-[10px] text-[#6b7280] mt-1">
            利用可能変数: {'{project}'}, {'{yyyy}'}, {'{mm}'}, {'{yyyymm}'}, {'{yyyymmdd}'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rows.length === 0 || isExportingCsv}
            className="inline-flex items-center gap-1.5 bg-[#222] hover:bg-border text-white border border-[#333] px-3.5 py-2 rounded text-xs font-bold transition disabled:opacity-40 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            CSV出力
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0 || isExportingExcel}
            className="inline-flex items-center gap-2 bg-brand hover:bg-[#c4b096] text-black px-4 py-2 rounded text-xs font-bold transition disabled:opacity-40 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExportingExcel ? '生成中...' : 'Excel出力 (.xlsx)'}
          </button>
        </div>
      </div>

      {/* テーブルプレビュー */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-[#181818] px-4 py-2 text-xs font-semibold text-[#9ca3af] border-b border-border flex justify-between items-center">
          <span>プレビューテーブル (列マッピング連動 / 先頭50件まで表示)</span>
          <span className="text-[11px] text-[#6b7280]">
            集計単位: {preset.aggregationUnit} / 出力列数: {preset.columnMappings.length}列
          </span>
        </div>

        <div className="overflow-x-auto max-h-90">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] text-gray-400 sticky top-0 border-b border-border">
              <tr>
                {preset.columnMappings.map((mapping, idx) => {
                  const baseField = BASE_SOURCE_FIELDS.find((b) => b.id === mapping.sourceField);
                  const customField = preset.customColumns.find((c) => c.id === mapping.sourceField);
                  const label = baseField ? baseField.label : customField ? `[C] ${customField.name}` : mapping.sourceField;
                  const isRight =
                    mapping.sourceField.includes('duration') ||
                    customField?.type === 'multiply_duration' ||
                    customField?.type === 'formula';

                  return (
                    <th
                      key={idx}
                      className={`py-2.5 px-3 whitespace-nowrap ${isRight ? 'text-right' : ''}`}
                    >
                      <span className="font-mono text-brand mr-1.5">{mapping.columnLetter}:</span>
                      <span>{label}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, preset.columnMappings.length)}
                    className="py-8 text-center text-gray-500 italic"
                  >
                    CSVデータがまだ読み込まれていません。上の「1. Toggl Track CSVアップロード」からファイルを選択してください。
                  </td>
                </tr>
              ) : (
                rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    {preset.columnMappings.map((mapping, colIdx) => {
                      const val = getFieldValueForMapping(r, mapping.sourceField, preset.timeFormat);
                      const customField = preset.customColumns.find((c) => c.id === mapping.sourceField);
                      const isRight =
                        mapping.sourceField.includes('duration') ||
                        customField?.type === 'multiply_duration' ||
                        customField?.type === 'formula';
                      const formattedVal =
                        (customField?.type === 'multiply_duration' || customField?.type === 'formula') && typeof val === 'number'
                          ? `¥${val.toLocaleString()}`
                          : mapping.sourceField === 'duration' && preset.timeFormat === 'decimal' && typeof val === 'number'
                          ? `${val.toFixed(2)}h`
                          : String(val ?? '');

                      return (
                        <td
                          key={colIdx}
                          className={`py-2 px-3 whitespace-nowrap font-mono text-gray-300 ${
                            isRight ? 'text-right' : ''
                          }`}
                        >
                          {formattedVal || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
