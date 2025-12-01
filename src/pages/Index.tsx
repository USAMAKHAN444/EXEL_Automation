import { useState } from 'react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { DataTable } from '@/components/DataTable';
import { ProcessingPanel } from '@/components/ProcessingPanel';
import { DocumentRow, ProcessingStatus } from '@/types/document';
import { parseExcelFile, exportToExcel } from '@/utils/excelParser';
import { groupByCustomer, processCustomerFiles } from '@/utils/documentProcessor';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: 'idle',
    totalCustomers: 0,
    processedCustomers: 0,
  });
  const { toast } = useToast();

  const handleFolderUpload = (files: File[]) => {
    setFolderFiles(files);
    toast({
      title: 'Folder uploaded',
      description: `${files.length} files loaded from folder`,
    });
  };

  const handleExcelUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const parsedRows = await parseExcelFile(file);
      setRows(parsedRows);
      setExcelFile(file);
      toast({
        title: 'Excel file loaded',
        description: `${parsedRows.length} rows parsed successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse Excel file',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCell = (
    rowId: string,
    field: 'actualOutput' | 'actualGroup',
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleStartProcessing = async () => {
    if (rows.length === 0 || folderFiles.length === 0) return;

    const customerGroups = groupByCustomer(rows);
    setProcessingStatus({
      status: 'processing',
      totalCustomers: customerGroups.length,
      processedCustomers: 0,
      message: 'Starting document processing...',
    });

    try {
      let processedCount = 0;
      const updatedRowsMap = new Map<string, DocumentRow>();

      for (const [customer, customerRows] of customerGroups) {
        setProcessingStatus((prev) => ({
          ...prev,
          currentCustomer: customer,
          message: `Processing customer: ${customer}`,
        }));

        const processedRows = await processCustomerFiles(
          customerRows,
          folderFiles,
          (message) => {
            setProcessingStatus((prev) => ({
              ...prev,
              message: `${customer}: ${message}`,
            }));
          }
        );

        processedRows.forEach((row) => {
          updatedRowsMap.set(row.id, row);
        });

        processedCount++;
        setProcessingStatus((prev) => ({
          ...prev,
          processedCustomers: processedCount,
        }));

        // Update rows incrementally after each customer
        setRows((prev) =>
          prev.map((row) => updatedRowsMap.get(row.id) || row)
        );

        // Add delay between customers to prevent overwhelming backend
        // and allow connections to reset (500ms delay)
        if (processedCount < customerGroups.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setProcessingStatus({
        status: 'complete',
        totalCustomers: customerGroups.length,
        processedCustomers: customerGroups.length,
        message: 'All customers processed successfully!',
      });

      toast({
        title: 'Processing complete',
        description: `Successfully processed ${customerGroups.length} customers`,
      });
    } catch (error) {
      setProcessingStatus({
        status: 'error',
        totalCustomers: customerGroups.length,
        processedCustomers: processingStatus.processedCustomers,
        message: 'An error occurred during processing',
      });

      toast({
        title: 'Processing error',
        description: 'Failed to process documents',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    if (rows.length === 0) return;
    exportToExcel(rows, 'processed_documents.xlsx');
    toast({
      title: 'Export complete',
      description: 'Excel file downloaded successfully',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Document Classifier
              </h1>
              <p className="text-muted-foreground mt-1">
                Upload, categorize, and group customer documents automatically
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={rows.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Results
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="w-4 h-4" />
              <span>Main Folder</span>
              {folderFiles.length > 0 && (
                <span className="text-muted-foreground">
                  ({folderFiles.length} files)
                </span>
              )}
            </div>
            <FileUploadZone
              onFilesAccepted={handleFolderUpload}
              multiple={true}
              type="folder"
              disabled={processingStatus.status === 'processing'}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Sheet</span>
              {excelFile && (
                <span className="text-muted-foreground">
                  ({excelFile.name})
                </span>
              )}
            </div>
            <FileUploadZone
              onFilesAccepted={handleExcelUpload}
              accept={{
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls'],
              }}
              type="excel"
              disabled={processingStatus.status === 'processing'}
            />
          </div>
        </div>

        <ProcessingPanel
          status={processingStatus}
          onStartProcessing={handleStartProcessing}
          canProcess={rows.length > 0 && folderFiles.length > 0}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Document Data</h2>
            <span className="text-sm text-muted-foreground">
              {rows.length} rows
            </span>
          </div>
          <DataTable data={rows} onUpdateCell={handleUpdateCell} />
        </div>
      </div>
    </div>
  );
};

export default Index;
