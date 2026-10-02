import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { parseTogglCsv } from '../../lib/timesheet/csvParser';
import type { ParseResult, TogglRawRow } from '../../lib/timesheet/types';

interface Props {
  requiredColumns: string[];
  onDataLoaded: (data: { rows: TogglRawRow[]; headers: string[] }) => void;
  onClearData: () => void;
  isLoaded: boolean;
  loadedRowsCount: number;
}

export const CsvUploader: React.FC<Props> = ({
  requiredColumns,
  onDataLoaded,
  onClearData,
  isLoaded,
  loadedRowsCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg('CSVファイル（.csv）を選択してください。');
      return;
    }
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const result: ParseResult = await parseTogglCsv(file, requiredColumns);
      if (!result.isValid) {
        setErrorMsg(result.error || 'CSVの検証に失敗しました。');
        onClearData();
        return;
      }

      if (result.rows.length === 0) {
        setErrorMsg('有効なデータ行が見つかりませんでした。');
        onClearData();
        return;
      }

      onDataLoaded({ rows: result.rows, headers: result.headers });
    } catch (e: any) {
      setErrorMsg(`ファイル解析エラー: ${e.message || String(e)}`);
      onClearData();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // デモ用のサンプルデータ生成
  const loadSampleData = () => {
    const today = new Date().toISOString().split('T')[0];
    const sampleCsv = `User,Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags,Amount ()
山田 太郎,user@example.com,A社,WEB開発,フロントエンド,UIコンポーネント実装,Yes,${today},09:00:00,${today},12:30:00,03:30:00,Astro,
山田 太郎,user@example.com,A社,WEB開発,バックエンド,API Routes連携設計,Yes,${today},13:30:00,${today},16:00:00,02:30:00,Astro,
山田 太郎,user@example.com,B社,デザイン改善,アイコン,Lucideアイコン導入,Yes,${today},16:15:00,${today},18:15:00,02:00:00,Design,`;

    parseTogglCsv(sampleCsv, requiredColumns).then((result) => {
      if (result.isValid) {
        setFileName('サンプルデータ (Toggl_sample.csv)');
        setErrorMsg(null);
        onDataLoaded({ rows: result.rows, headers: result.headers });
      }
    });
  };

  return (
    <div className="bg-[#141414] border border-border rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          1. Toggl Track CSVアップロード
        </h2>
        <button
          type="button"
          onClick={loadSampleData}
          className="text-xs text-brand hover:underline flex items-center gap-1 font-semibold"
        >
          <RefreshCw className="w-3 h-3" />
          サンプルデータで試す
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragging
            ? 'border-brand bg-brand/10'
            : isLoaded
            ? 'border-emerald-600/60 bg-emerald-950/10 hover:border-emerald-500'
            : 'border-[#333] hover:border-brand/70 bg-[#181818]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          {isLoaded ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
              <p className="text-white text-sm font-semibold">
                {fileName || 'CSV読み込み完了'}
              </p>
              <p className="text-xs text-[#9ca3af]">
                {loadedRowsCount} 件のレコードを正常に読み込みました。クリックで再選択
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-brand mb-1" />
              <p className="text-white text-sm font-medium">
                CSVファイルをここにドラッグ＆ドロップ、または
                <span className="text-brand underline ml-1 font-semibold">
                  ファイルを選択
                </span>
              </p>
              <p className="text-xs text-[#6b7280]">
                Toggl TrackのDetailed Reportから出力したCSVファイルに対応しています
              </p>
            </>
          )}
        </div>
      </div>

      {/* 必須カラムチェック状況 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#9ca3af]">判定対象の必須カラム:</span>
        {requiredColumns.map((col) => (
          <span
            key={col}
            className="px-2 py-0.5 rounded bg-[#222] border border-[#333] text-gray-300 font-mono text-[11px]"
          >
            {col}
          </span>
        ))}
      </div>

      {/* エラー表示 */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">取り込みエラー: </span>
            {errorMsg}
          </div>
        </div>
      )}
    </div>
  );
};
