import React, { useRef, useState } from 'react';
import type { ColumnMapping, PresetConfig } from '../../lib/timesheet/types';
import { FileSpreadsheet, Plus, Trash2, Upload, Check, GripVertical, ArrowDownUp } from 'lucide-react';
import { columnNumberToLetter } from '../../lib/timesheet/excelGenerator';

interface Props {
  preset: PresetConfig;
  templateFile: File | null;
  onSetTemplateFile: (file: File | null) => void;
  onUpdatePreset: (updated: Partial<PresetConfig>) => void;
}

export const BASE_SOURCE_FIELDS = [
  { id: 'date', label: '日付 (date)' },
  { id: 'project', label: 'プロジェクト名 (project)' },
  { id: 'task', label: 'タスク名 (task)' },
  { id: 'description', label: '作業内容・説明 (description)' },
  { id: 'duration', label: '稼働時間 (設定フォーマット通り)' },
  { id: 'duration_hours', label: '稼働時間 (小数時間: 1.50h)' },
  { id: 'duration_hhmm', label: '稼働時間 (HH:MM:SS)' },
  { id: 'user', label: 'ユーザー名 (user)' },
  { id: 'client', label: 'クライアント名 (client)' },
];

export const TemplateMapper: React.FC<Props> = ({
  preset,
  templateFile,
  onSetTemplateFile,
  onUpdatePreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startCellInput, setStartCellInput] = useState(preset.startCell || 'A2');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // カスタムカラムもマッピング候補に加える
  const availableFields = [
    ...BASE_SOURCE_FIELDS,
    ...preset.customColumns.map((c) => ({
      id: c.id,
      label: `[カスタム] ${c.name}`,
    })),
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx')) {
        onSetTemplateFile(file);
      } else {
        alert('.xlsx 形式のExcelファイルを選択してください。');
      }
    }
  };

  const handleStartCellBlur = () => {
    const clean = startCellInput.trim().toUpperCase();
    if (/^[A-Z]+\d+$/.test(clean)) {
      onUpdatePreset({ startCell: clean });
    } else {
      setStartCellInput(preset.startCell || 'A2');
    }
  };

  const handleUpdateMapping = (index: number, patch: Partial<ColumnMapping>) => {
    const updated = [...preset.columnMappings];
    updated[index] = { ...updated[index], ...patch };
    onUpdatePreset({ columnMappings: updated });
  };

  const handleAddMapping = () => {
    const nextColNum = preset.columnMappings.length + 1;
    const nextLetter = columnNumberToLetter(nextColNum);
    const newMapping: ColumnMapping = {
      columnLetter: nextLetter,
      sourceField: availableFields[0]?.id || 'date',
    };
    onUpdatePreset({ columnMappings: [...preset.columnMappings, newMapping] });
  };

  const handleRemoveMapping = (index: number) => {
    const updated = preset.columnMappings.filter((_, i) => i !== index);
    onUpdatePreset({ columnMappings: updated });
  };

  // ドラッグ＆ドロップ並べ替え処理
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const items = [...preset.columnMappings];
    const [movedItem] = items.splice(draggedIdx, 1);
    items.splice(targetIndex, 0, movedItem);

    // 列記号（A, B, C...）を順番通りに再割り当て
    const reindexed = items.map((item, idx) => ({
      ...item,
      columnLetter: columnNumberToLetter(idx + 1),
    }));

    onUpdatePreset({ columnMappings: reindexed });
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleAutoReindexLetters = () => {
    const reindexed = preset.columnMappings.map((item, idx) => ({
      ...item,
      columnLetter: columnNumberToLetter(idx + 1),
    }));
    onUpdatePreset({ columnMappings: reindexed });
  };

  return (
    <div className="bg-[#141414] border border-border rounded-lg p-5 mb-6">
      <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-4 h-4 text-brand" />
        3. テンプレート読込 & 列マッピング
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* テンプレートExcelアップロード */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
            既存Excelテンプレート (.xlsx)
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-[#181818] hover:bg-[#222] border border-[#333] hover:border-brand px-4 py-2 rounded text-xs font-semibold text-white transition"
            >
              <Upload className="w-4 h-4 text-brand" />
              {templateFile ? 'テンプレートを変更' : 'テンプレートを選択 (.xlsx)'}
            </button>
            {templateFile && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded border border-emerald-800/40">
                <Check className="w-3.5 h-3.5" />
                <span className="font-medium truncate max-w-50">{templateFile.name}</span>
                <button
                  type="button"
                  onClick={() => onSetTemplateFile(null)}
                  className="text-gray-400 hover:text-red-400 ml-1 text-xs"
                >
                  解除
                </button>
              </div>
            )}
            {!templateFile && (
              <span className="text-xs text-[#6b7280]">
                未指定の場合は新規シートに書き出されます
              </span>
            )}
          </div>
        </div>

        {/* データ流し込み開始セル */}
        <div>
          <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
            流し込み開始セル (例: A2, C6)
          </label>
          <input
            type="text"
            value={startCellInput}
            onChange={(e) => setStartCellInput(e.target.value)}
            onBlur={handleStartCellBlur}
            placeholder="A2"
            className="w-full bg-[#181818] text-white border border-[#333] rounded px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* 列マッピング設定テーブル */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#9ca3af]">
              列（カラム）出力マッピング
            </label>
            <span className="text-[11px] text-[#6b7280]">
              （左端のアイコンをドラッグして並べ替え可能）
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAutoReindexLetters}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
              title="列記号を上から A, B, C... で再割り当て"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              列記号を自動整序
            </button>
            <button
              type="button"
              onClick={handleAddMapping}
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              出力列を追加
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-[#9ca3af] border-b border-border">
              <tr>
                <th className="py-2 px-2 w-10 text-center">移動</th>
                <th className="py-2 px-2 w-10 text-center">#</th>
                <th className="py-2 px-3 w-28">Excel列記号</th>
                <th className="py-2 px-3">出力項目 (フィールド)</th>
                <th className="py-2 px-3 w-16 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {preset.columnMappings.map((mapping, idx) => {
                const isDragging = draggedIdx === idx;
                const isOver = dragOverIdx === idx;
                return (
                  <tr
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`transition-colors cursor-move ${
                      isDragging
                        ? 'opacity-40 bg-brand/10'
                        : isOver
                        ? 'bg-brand/20 border-t-2 border-brand'
                        : 'hover:bg-surface-2'
                    }`}
                  >
                    <td className="py-2 px-2 text-center text-gray-500 hover:text-brand cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="py-2 px-2 text-center text-[#666] font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={mapping.columnLetter}
                        onChange={(e) =>
                          handleUpdateMapping(idx, {
                            columnLetter: e.target.value.toUpperCase().trim(),
                          })
                        }
                        className="w-16 bg-[#141414] text-white font-mono text-center border border-[#333] rounded px-2 py-1 text-xs focus:outline-none focus:border-brand"
                      />
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={mapping.sourceField}
                        onChange={(e) =>
                          handleUpdateMapping(idx, { sourceField: e.target.value })
                        }
                        className="w-full bg-[#141414] text-white border border-[#333] rounded px-3 py-1 text-xs focus:outline-none focus:border-brand"
                      >
                        {availableFields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveMapping(idx)}
                        disabled={preset.columnMappings.length <= 1}
                        className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:hover:text-red-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
