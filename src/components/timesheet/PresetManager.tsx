import React, { useState, useRef } from 'react';
import type { PresetConfig } from '../../lib/timesheet/types';
import {
  Save,
  Plus,
  Trash2,
  Check,
  Download,
  Upload,
  Settings,
  X,
  FileJson,
  Layers,
} from 'lucide-react';
import { downloadPresetConfigJson, parseUploadedPresetJson } from '../../lib/timesheet/storage';

interface Props {
  presets: PresetConfig[];
  currentPreset: PresetConfig;
  onSelectPreset: (preset: PresetConfig) => void;
  onSaveCurrentPreset: () => void;
  onCreateNewPreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onImportPresets: (imported: PresetConfig | PresetConfig[]) => void;
}

export const PresetManager: React.FC<Props> = ({
  presets,
  currentPreset,
  onSelectPreset,
  onSaveCurrentPreset,
  onCreateNewPreset,
  onDeletePreset,
  onImportPresets,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSaveCurrentPreset();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onCreateNewPreset(newPresetName.trim());
    setNewPresetName('');
    setIsCreating(false);
  };

  const handleDownloadConfig = () => {
    downloadPresetConfigJson(currentPreset);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseUploadedPresetJson(content);
      if (parsed) {
        onImportPresets(parsed);
        setImportMessage('設定ファイルを正常に読み込みました。');
      } else {
        alert('有効な設定JSONファイルではありません。');
      }
      setTimeout(() => setImportMessage(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-[#141414] border border-border rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#9ca3af] font-bold">
            設定プリセット:
          </span>
          <select
            value={currentPreset.id}
            onChange={(e) => {
              const selected = presets.find((p) => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            className="bg-[#1f1f1f] text-white border border-[#333] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-brand"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 上書き保存ボタン */}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-border text-white border border-[#333] hover:border-brand px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer"
            title="現在の変更をこのプリセットに上書き保存"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">保存完了</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-brand" />
                <span>上書き保存</span>
              </>
            )}
          </button>

          {/* 新規別名保存 */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 bg-brand hover:bg-[#c4b096] text-black px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>別名保存</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="inline-flex items-center gap-1.5">
              <input
                type="text"
                placeholder="プリセット名..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="bg-[#1f1f1f] text-white border border-brand rounded px-2 py-1 text-xs focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="bg-brand text-black px-2.5 py-1 rounded text-xs font-bold cursor-pointer"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[#9ca3af] hover:text-white text-xs px-1 cursor-pointer"
              >
                取消
              </button>
            </form>
          )}

          {/* JSONダウンロード */}
          <button
            type="button"
            onClick={handleDownloadConfig}
            className="inline-flex items-center gap-1 bg-[#1f1f1f] hover:bg-border text-gray-300 hover:text-white border border-[#333] px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer"
            title="現在の設定をJSONファイルとしてダウンロード"
          >
            <Download className="w-3.5 h-3.5 text-brand" />
            <span>Config出力</span>
          </button>

          {/* JSONアップロード */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 bg-[#1f1f1f] hover:bg-border text-gray-300 hover:text-white border border-[#333] px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer"
            title="保存済みのJSON設定ファイルを読み込み"
          >
            <Upload className="w-3.5 h-3.5 text-brand" />
            <span>Config読込</span>
          </button>

          {/* プリセット一覧管理 */}
          <button
            type="button"
            onClick={() => setIsManageOpen(!isManageOpen)}
            className={`inline-flex items-center gap-1 border px-2.5 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
              isManageOpen
                ? 'bg-brand/20 border-brand text-white'
                : 'bg-[#1f1f1f] hover:bg-border text-gray-300 hover:text-white border-[#333]'
            }`}
            title="登録済みプリセットの一覧管理・整理"
          >
            <Settings className="w-3.5 h-3.5 text-brand" />
            <span>一覧管理</span>
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="mt-3 text-xs text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded border border-emerald-800/40 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>{importMessage}</span>
        </div>
      )}

      {/* プリセット一覧管理パネル */}
      {isManageOpen && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand" />
              登録プリセット一覧（削除・整理）
            </h3>
            <button
              type="button"
              onClick={() => setIsManageOpen(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isCurrent = preset.id === currentPreset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition ${
                    isCurrent
                      ? 'bg-brand/10 border-brand text-white'
                      : 'bg-[#181818] border-border text-gray-300'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      {preset.name}
                      {isCurrent && (
                        <span className="text-[10px] bg-brand text-black font-bold px-1.5 py-0.2 rounded">
                          選択中
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#888] mt-0.5">
                      集計: {preset.aggregationUnit} / 開始セル: {preset.startCell || 'A2'} / 列数: {preset.columnMappings.length}列 / カスタム: {preset.customColumns.length}個
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onSelectPreset(preset)}
                        className="px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-gray-200 border border-[#444] text-[11px] font-semibold cursor-pointer"
                      >
                        切替
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadPresetConfigJson(preset)}
                      className="p-1.5 rounded bg-[#222] hover:bg-[#333] text-gray-300 hover:text-brand border border-[#333] text-xs cursor-pointer"
                      title="このプリセットをJSONで保存"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    {presets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`「${preset.name}」を完全に削除しますか？`)) {
                            onDeletePreset(preset.id);
                          }
                        }}
                        className="p-1.5 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 text-xs cursor-pointer"
                        title="このプリセットを削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
