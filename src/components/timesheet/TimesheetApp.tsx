import React, { useState, useEffect, useMemo } from 'react';
import type { PresetConfig, TogglRawRow } from '../../lib/timesheet/types';
import {
  DEFAULT_PRESET,
  getActivePresetId,
  loadPresets,
  savePresets,
  setActivePresetId,
} from '../../lib/timesheet/storage';
import { aggregateTogglRows } from '../../lib/timesheet/aggregator';
import { PresetManager } from './PresetManager';
import { CsvUploader } from './CsvUploader';
import { AggregationSettings } from './AggregationSettings';
import { TemplateMapper } from './TemplateMapper';
import { PreviewExport } from './PreviewExport';

export const TimesheetApp: React.FC = () => {
  const [presets, setPresets] = useState<PresetConfig[]>([DEFAULT_PRESET]);
  const [currentPreset, setCurrentPreset] = useState<PresetConfig>(DEFAULT_PRESET);
  const [rawRows, setRawRows] = useState<TogglRawRow[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // 初期ロード (LocalStorageから)
  useEffect(() => {
    const loaded = loadPresets();
    const activeId = getActivePresetId();
    setPresets(loaded);
    const active = loaded.find((p) => p.id === activeId) || loaded[0] || DEFAULT_PRESET;
    setCurrentPreset(active);
    setIsClientLoaded(true);
  }, []);

  // プリセット更新ハンドラ
  const handleUpdateCurrentPreset = (updatedFields: Partial<PresetConfig>) => {
    setCurrentPreset((prev) => {
      const updated = { ...prev, ...updatedFields };
      // presetsリストも更新
      setPresets((all) =>
        all.map((p) => (p.id === updated.id ? updated : p))
      );
      return updated;
    });
  };

  // プリセット上書き保存ハンドラ
  const handleSaveCurrentPreset = () => {
    const nextPresets = presets.map((p) =>
      p.id === currentPreset.id ? currentPreset : p
    );
    setPresets(nextPresets);
    savePresets(nextPresets);
  };

  // 新規プリセット作成ハンドラ
  const handleCreateNewPreset = (name: string) => {
    const newPreset: PresetConfig = {
      ...currentPreset,
      id: `preset_${Date.now()}`,
      name,
    };
    const nextPresets = [...presets, newPreset];
    setPresets(nextPresets);
    setCurrentPreset(newPreset);
    setActivePresetId(newPreset.id);
    savePresets(nextPresets);
  };

  // プリセット削除ハンドラ
  const handleDeletePreset = (id: string) => {
    if (presets.length <= 1) return;
    const nextPresets = presets.filter((p) => p.id !== id);
    setPresets(nextPresets);
    const nextActive = nextPresets[0];
    setCurrentPreset(nextActive);
    setActivePresetId(nextActive.id);
    savePresets(nextPresets);
  };

  // プリセット切り替えハンドラ
  const handleSelectPreset = (preset: PresetConfig) => {
    setCurrentPreset(preset);
    setActivePresetId(preset.id);
  };

  // プリセットインポートハンドラ
  const handleImportPresets = (imported: PresetConfig | PresetConfig[]) => {
    const listToImport = Array.isArray(imported) ? imported : [imported];
    if (listToImport.length === 0) return;

    // 既存プリセットとIDが重複している場合は上書き、なければ追加
    const merged = [...presets];
    listToImport.forEach((newItem) => {
      const idx = merged.findIndex((p) => p.id === newItem.id);
      if (idx >= 0) {
        merged[idx] = newItem;
      } else {
        merged.push(newItem);
      }
    });

    setPresets(merged);
    const active = listToImport[0];
    setCurrentPreset(active);
    setActivePresetId(active.id);
    savePresets(merged);
  };

  // CSVデータ読み込み
  const handleCsvLoaded = ({ rows }: { rows: TogglRawRow[]; headers: string[] }) => {
    setRawRows(rows);
  };

  // CSVデータクリア
  const handleClearData = () => {
    setRawRows([]);
  };

  // 集計データの計算（rawRowsまたは集計設定が変更されたら自動再計算）
  const aggregatedRows = useMemo(() => {
    if (rawRows.length === 0) return [];
    return aggregateTogglRows(
      rawRows,
      currentPreset.aggregationUnit,
      currentPreset.customColumns
    );
  }, [rawRows, currentPreset.aggregationUnit, currentPreset.customColumns]);

  if (!isClientLoaded) {
    return (
      <div className="py-16 text-center text-gray-500">
        初期設定を読み込み中...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* プリセット管理バー */}
      <PresetManager
        presets={presets}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        onSaveCurrentPreset={handleSaveCurrentPreset}
        onCreateNewPreset={handleCreateNewPreset}
        onDeletePreset={handleDeletePreset}
        onImportPresets={handleImportPresets}
      />

      {/* 1. CSVアップロード */}
      <CsvUploader
        requiredColumns={currentPreset.requiredColumns}
        onDataLoaded={handleCsvLoaded}
        onClearData={handleClearData}
        isLoaded={rawRows.length > 0}
        loadedRowsCount={rawRows.length}
      />

      {/* 2. 集計ルール & カスタムカラム */}
      <AggregationSettings
        preset={currentPreset}
        onUpdatePreset={handleUpdateCurrentPreset}
      />

      {/* 3. テンプレート読込 & マッピング */}
      <TemplateMapper
        preset={currentPreset}
        templateFile={templateFile}
        onSetTemplateFile={setTemplateFile}
        onUpdatePreset={handleUpdateCurrentPreset}
      />

      {/* 4. プレビュー & エクスポート */}
      <PreviewExport
        rows={aggregatedRows}
        preset={currentPreset}
        templateFile={templateFile}
        onUpdatePreset={handleUpdateCurrentPreset}
      />
    </div>
  );
};
