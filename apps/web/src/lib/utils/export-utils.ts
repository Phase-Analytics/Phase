export function downloadJson(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const CSV_SPECIAL_CHAR_PATTERN = /[",\n\r]/;
const CSV_QUOTE_PATTERN = /"/g;

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (CSV_SPECIAL_CHAR_PATTERN.test(text)) {
    return `"${text.replace(CSV_QUOTE_PATTERN, '""')}"`;
  }
  return text;
}

export function downloadCsv(
  columns: string[],
  rows: unknown[][],
  filename: string
): void {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFileName(prefix: string, rangeLabel: string): string {
  return `${prefix}-${rangeLabel}.json`;
}
