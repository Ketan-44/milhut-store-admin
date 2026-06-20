import * as XLSX from 'xlsx';

export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export function exportToExcel<T>(
  rows: T[],
  columns: ExcelColumn<T>[],
  sheetName: string,
  fileName: string,
): void {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.header, column.value(row)])),
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

export function buildExportFileName(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10);

  return `${prefix}-${date}.xlsx`;
}
