import * as XLSX from 'xlsx';
import { DocumentRow } from '@/types/document';

export const parseExcelFile = async (file: File): Promise<DocumentRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

        // Skip header row and parse data
        const rows: DocumentRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[0]) {
            // Only process rows with customer data
            rows.push({
              id: `row-${i}`,
              customer: row[0] || '',
              file: row[1] || '',
              expectedOutput: row[2] || '',
              actualOutput: row[3] || '',
              outputResult: row[4] || '',
              expectedGroup: row[5] || '',
              actualGroup: row[6] || '',
              groupResult: row[7] || '',
              rowIndex: i,
            });
          }
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: DocumentRow[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((row) => ({
      Customer: row.customer,
      File: row.file,
      'Expected Output': row.expectedOutput,
      'Actual Output': row.actualOutput,
      'Result': row.outputResult,
      'Expected Group': row.expectedGroup,
      'Actual Group': row.actualGroup,
      'Result ': row.groupResult,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
};
