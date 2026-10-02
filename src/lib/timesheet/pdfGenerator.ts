import type { AggregatedRow, PresetConfig } from './types';
import { getFieldValueForMapping, resolveFilename } from './excelGenerator';
import { BASE_SOURCE_FIELDS } from '../../components/timesheet/TemplateMapper';

/**
 * 帳票PDFを生成してダウンロード
 */
export async function exportTimesheetPdf(
  rows: AggregatedRow[],
  preset: PresetConfig
): Promise<void> {
  if (typeof window === 'undefined') return;

  // 動的インポート（SSR対策）
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const jspdfModule = await import('jspdf');
  const { jsPDF } = jspdfModule;

  // サマリー計算
  const totalSeconds = rows.reduce((acc, r) => acc + r.durationSeconds, 0);
  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  // カスタム金額等の合計
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

  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  // 帳票HTMLの構築
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '820px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#111111';
  container.style.fontFamily = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';

  // タイトル & ヘッダー
  const headerHtml = `
    <div style="border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: bold; color: #111;">勤務表 / 作業実績書</h1>
        <p style="margin: 0; font-size: 12px; color: #666;">集計設定: ${preset.name}（集計単位: ${preset.aggregationUnit}）</p>
      </div>
      <div style="text-align: right; font-size: 11px; color: #555;">
        <p style="margin: 0 0 3px 0;">出力日: ${dateStr}</p>
        <p style="margin: 0;">対象件数: ${rows.length} 件</p>
      </div>
    </div>
  `;

  // サマリーボックス
  let summaryAmountsHtml = '';
  Object.entries(totalAmounts).forEach(([name, sum]) => {
    summaryAmountsHtml += `
      <div style="background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; min-width: 140px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600;">${name}</div>
        <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px;">¥${sum.toLocaleString()}</div>
      </div>
    `;
  });

  const summaryHtml = `
    <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
      <div style="background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; min-width: 130px;">
        <div style="font-size: 10px; color: #64748b; font-weight: 600;">合計稼働時間</div>
        <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px;">${hours}h ${minutes}m <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${totalHours.toFixed(2)}h)</span></div>
      </div>
      ${summaryAmountsHtml}
    </div>
  `;

  // テーブルヘッダー
  let thsHtml = '';
  preset.columnMappings.forEach((mapping) => {
    const base = BASE_SOURCE_FIELDS.find((b) => b.id === mapping.sourceField);
    const custom = preset.customColumns.find((c) => c.id === mapping.sourceField);
    const label = base ? base.label.split(' ')[0] : custom ? custom.name : mapping.sourceField;
    const isRight = mapping.sourceField.includes('duration') || custom?.type === 'multiply_duration' || custom?.type === 'formula';

    thsHtml += `
      <th style="padding: 7px 10px; font-size: 11px; font-weight: bold; border-bottom: 2px solid #cbd5e1; background-color: #f1f5f9; color: #334155; text-align: ${isRight ? 'right' : 'left'};">
        ${label}
      </th>
    `;
  });

  // テーブル行
  let trsHtml = '';
  rows.forEach((row, i) => {
    let tdsHtml = '';
    preset.columnMappings.forEach((mapping) => {
      const val = getFieldValueForMapping(row, mapping.sourceField, preset.timeFormat);
      const custom = preset.customColumns.find((c) => c.id === mapping.sourceField);
      const isRight = mapping.sourceField.includes('duration') || custom?.type === 'multiply_duration' || custom?.type === 'formula';
      const formatted =
        (custom?.type === 'multiply_duration' || custom?.type === 'formula') && typeof val === 'number'
          ? `¥${val.toLocaleString()}`
          : mapping.sourceField === 'duration' && preset.timeFormat === 'decimal' && typeof val === 'number'
          ? `${val.toFixed(2)}h`
          : String(val ?? '');

      tdsHtml += `
        <td style="padding: 7px 10px; font-size: 10.5px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: ${isRight ? 'right' : 'left'}; word-break: break-word;">
          ${formatted || '-'}
        </td>
      `;
    });

    const bg = i % 2 === 1 ? '#fafafa' : '#ffffff';
    trsHtml += `<tr style="background-color: ${bg};">${tdsHtml}</tr>`;
  });

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <thead><tr>${thsHtml}</tr></thead>
      <tbody>${trsHtml}</tbody>
    </table>
  `;

  container.innerHTML = `
    ${headerHtml}
    ${summaryHtml}
    ${tableHtml}
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // A4 サイズ: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // 1ページ目
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 複数ページにまたがる場合
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filename = resolveFilename(preset.filenamePattern, rows, 'pdf');
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
