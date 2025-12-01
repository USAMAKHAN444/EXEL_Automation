export interface DocumentRow {
  id: string;
  customer: string;
  file: string;
  expectedOutput: string;
  actualOutput: string;
  outputResult: string;
  expectedGroup: string;
  actualGroup: string;
  groupResult: string;
  rowIndex: number;
}

export interface ProcessingStatus {
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentCustomer?: string;
  totalCustomers: number;
  processedCustomers: number;
  message?: string;
}

export interface APIResponse {
  categorize?: Record<string, string>;
  creditCardGroups?: Array<{
    type: string;
    files: string[][];
  }>;
  documentGroups?: Array<{
    group: Array<{
      type: string;
      files: string[];
    }>;
  }>;
}
