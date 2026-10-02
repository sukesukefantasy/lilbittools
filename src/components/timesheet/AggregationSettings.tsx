import React, { useState, useMemo } from 'react';
import type { AggregationUnit, CustomColumn, CustomColumnType, PresetConfig } from '../../lib/timesheet/types';
import { Sliders, Plus, Trash2, HelpCircle, Code2, Calculator, Type, DollarSign } from 'lucide-react';
import { resolvePlaceholders } from '../../lib/timesheet/aggregator';

interface Props {
  preset: PresetConfig;
  onUpdatePreset: (updated: Partial<PresetConfig>) => void;
}

const AVAILABLE_VARIABLES = [
  { tag: '{Description}', label: '作業内容 (Description)' },
  { tag: '{Client}', label: 'クライアント (Client)' },
  { tag: '{Project}', label: 'プロジェクト (Project)' },
  { tag: '{Task}', label: 'タスク (Task)' },
  { tag: '{Date}', label: '日付 (Date)' },
  { tag: '{User}', label: '作業者 (User)' },
  { tag: '{Duration}', label: '時間[h] (Duration)' },
];

export const AggregationSettings: React.FC<Props> = ({ preset, onUpdatePreset }) => {
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<CustomColumnType>('template');
  const [newColValue, setNewColValue] = useState('{Description}___{Client}');
  const [newReqCol, setNewReqCol] = useState('');

  const handleTypeChange = (type: CustomColumnType) => {
    setNewColType(type);
    if (type === 'template') {
      setNewColValue('{Description}___{Client}');
    } else if (type === 'formula') {
      setNewColValue('{Duration} * 3000');
    } else if (type === 'multiply_duration') {
      setNewColValue('3000');
    } else if (type === 'fixed') {
      setNewColValue('固定備考');
    }
  };

  const handleInsertVariable = (tag: string) => {
    setNewColValue((prev) => prev + tag);
  };

  const previewOutput = useMemo(() => {
    const sampleContext = {
      description: 'UI実装',
      client: '株式会社A',
      project: 'Web制作',
      task: 'フロントエンド',
      date: '2026-10-01',
      user: '山田太郎',
      durationHours: 2.5,
      durationFormatted: '02:30:00',
    };

    if (newColType === 'template') {
      return resolvePlaceholders(newColValue, sampleContext);
    } else if (newColType === 'formula') {
      const replaced = resolvePlaceholders(newColValue, sampleContext);
      try {
        const sanitized = replaced.replace(/[^0-9+\-*/().%\s]/g, '');
        if (!sanitized.trim()) return '0';
        const fn = new Function(`"use strict"; return (${sanitized})`);
        const res = fn();
        return typeof res === 'number' && !isNaN(res) ? `¥${res.toLocaleString()}` : '計算エラー';
      } catch {
        return '計算エラー';
      }
    } else if (newColType === 'multiply_duration') {
      const p = parseFloat(newColValue) || 0;
      return `¥${(2.5 * p).toLocaleString()} (稼働2.5hの例)`;
    } else {
      return newColValue;
    }
  }, [newColType, newColValue]);

  const handleAddCustomColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: CustomColumn = {
      id: `custom_${Date.now()}`,
      name: newColName.trim(),
      type: newColType,
      value: newColValue.trim(),
    };

    onUpdatePreset({
      customColumns: [...preset.customColumns, newCol],
    });

    setNewColName('');
    handleTypeChange('template');
  };

  const handleRemoveCustomColumn = (id: string) => {
    onUpdatePreset({
      customColumns: preset.customColumns.filter((col) => col.id !== id),
      columnMappings: preset.columnMappings.filter((m) => m.sourceField !== id),
    });
  };

  const handleAddRequiredColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCol.trim()) return;
    if (preset.requiredColumns.includes(newReqCol.trim())) return;

    onUpdatePreset({
      requiredColumns: [...preset.requiredColumns, newReqCol.trim()],
    });
    setNewReqCol('');
  };

  const handleRemoveRequiredColumn = (colName: string) => {
    onUpdatePreset({
      requiredColumns: preset.requiredColumns.filter((c) => c !== colName),
    });
  };

  return (
    <div className="bg-[#141414] border border-border rounded-lg p-5 mb-6">
      <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-brand" />
        2. 集計ルール & カスタムカラム設定
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 集計単位 & 時間フォーマット */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              集計単位
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'raw', label: '生データ（集計なし）' },
                { id: 'date', label: '日付ごと' },
                { id: 'task', label: 'タスク・作業ごと' },
                { id: 'project', label: 'プロジェクトごと' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdatePreset({ aggregationUnit: item.id as AggregationUnit })}
                  className={`px-3 py-2 rounded text-xs font-semibold border text-left transition ${
                    preset.aggregationUnit === item.id
                      ? 'bg-brand/15 border-brand text-white'
                      : 'bg-[#181818] border-[#333] text-[#9ca3af] hover:border-[#555]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              時間出力フォーマット
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdatePreset({ timeFormat: 'decimal' })}
                className={`px-3 py-2 rounded text-xs font-semibold border text-center transition ${
                  preset.timeFormat === 'decimal'
                    ? 'bg-brand/15 border-brand text-white'
                    : 'bg-[#181818] border-[#333] text-[#9ca3af] hover:border-[#555]'
                }`}
              >
                小数時間（例: 1.50h）
              </button>
              <button
                type="button"
                onClick={() => onUpdatePreset({ timeFormat: 'hhmm' })}
                className={`px-3 py-2 rounded text-xs font-semibold border text-center transition ${
                  preset.timeFormat === 'hhmm'
                    ? 'bg-brand/15 border-brand text-white'
                    : 'bg-[#181818] border-[#333] text-[#9ca3af] hover:border-[#555]'
                }`}
              >
                時分秒（HH:MM:SS）
              </button>
            </div>
          </div>

          {/* 必須カラム設定 */}
          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              取り込み時 必須カラム一覧
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {preset.requiredColumns.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#222] border border-[#333] text-gray-200 text-xs"
                >
                  {col}
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredColumn(col)}
                    className="text-[#888] hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddRequiredColumn} className="flex gap-2">
              <input
                type="text"
                placeholder="必須カラム名を追加..."
                value={newReqCol}
                onChange={(e) => setNewReqCol(e.target.value)}
                className="flex-1 bg-[#181818] text-white border border-[#333] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="bg-border hover:bg-[#333] text-white text-xs px-3 py-1.5 rounded font-semibold border border-[#444]"
              >
                追加
              </button>
            </form>
          </div>
        </div>

        {/* カスタムカラム追加 */}
        <div className="border-t md:border-t-0 md:border-l border-border md:pl-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#9ca3af]">
                カスタムカラム（固定値・単価計算）
              </label>
              <span className="text-[11px] text-[#6b7280]">
                Excelマッピングで使用可能
              </span>
            </div>

            {preset.customColumns.length === 0 ? (
              <p className="text-xs text-[#6b7280] italic py-2">
                追加されたカスタムカラムはありません
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {preset.customColumns.map((col) => {
                  let badge = '';
                  let detail = '';
                  if (col.type === 'template') {
                    badge = '文字列参照';
                    detail = col.value;
                  } else if (col.type === 'formula') {
                    badge = '計算式';
                    detail = col.value;
                  } else if (col.type === 'multiply_duration') {
                    badge = '単価乗算';
                    detail = `稼働時間 × ¥${Number(col.value).toLocaleString()}`;
                  } else {
                    badge = '固定値';
                    detail = `"${col.value}"`;
                  }

                  return (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-2.5 rounded bg-[#181818] border border-border text-xs"
                    >
                      <div className="truncate mr-2">
                        <span className="text-[10px] bg-[#222] text-brand px-1.5 py-0.5 rounded border border-[#333] mr-1.5 font-mono">
                          {badge}
                        </span>
                        <span className="text-white font-bold">{col.name}:</span>
                        <span className="text-[#9ca3af] ml-1.5 font-mono truncate">{detail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomColumn(col.id)}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0 cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 追加フォーム */}
            <form
              onSubmit={handleAddCustomColumn}
              className="p-3 rounded bg-[#181818] border border-border space-y-2.5 text-xs"
            >
              <div className="font-semibold text-white flex items-center justify-between">
                <span>新規カスタムカラム</span>
                <span className="text-[10px] text-[#9ca3af]">Togglデータ参照対応</span>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="カラム名（例: 業務区分、請求金額、管理備考）"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-[#141414] text-white border border-[#333] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9ca3af] mb-1 font-semibold">
                  カラム種別
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    { id: 'template', label: '文字列参照・結合' },
                    { id: 'formula', label: '数値計算式 (合算等)' },
                    { id: 'multiply_duration', label: '時間 × 単価 (円)' },
                    { id: 'fixed', label: '固定値テキスト' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTypeChange(t.id as CustomColumnType)}
                      className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition text-center ${
                        newColType === t.id
                          ? 'bg-brand/15 border-brand text-white'
                          : 'bg-[#141414] border-[#333] text-[#9ca3af] hover:border-[#555]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(newColType === 'template' || newColType === 'formula') && (
                <div>
                  <div className="text-[10px] text-[#9ca3af] mb-1 flex items-center justify-between">
                    <span>クリックして変数を挿入:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertVariable(v.tag)}
                        className="px-1.5 py-0.5 rounded bg-[#222] hover:bg-brand/20 hover:border-brand border border-[#333] text-gray-300 font-mono text-[10px] transition"
                        title={v.label}
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder={
                    newColType === 'template'
                      ? '例: {Description}___{Client}'
                      : newColType === 'formula'
                      ? '例: {Duration} * 3000 + 500'
                      : newColType === 'multiply_duration'
                      ? '単価 (例: 3000)'
                      : '固定値文字列'
                  }
                  value={newColValue}
                  onChange={(e) => setNewColValue(e.target.value)}
                  className="w-full bg-[#141414] text-white border border-[#333] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-brand"
                />
              </div>

              {/* リアルタイム展開プレビュー */}
              <div className="bg-[#121212] p-2 rounded border border-[#222] text-[11px]">
                <span className="text-[#888] mr-1.5">展開プレビュー例:</span>
                <span className="font-mono text-brand font-bold break-all">{previewOutput || '(未入力)'}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-brand hover:bg-[#c4b096] text-black font-bold py-1.5 rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                カラムを追加
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
