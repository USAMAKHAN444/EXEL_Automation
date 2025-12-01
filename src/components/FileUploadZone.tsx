import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  type: 'folder' | 'excel';
  disabled?: boolean;
}

export const FileUploadZone = ({
  onFilesAccepted,
  accept,
  multiple = false,
  type,
  disabled = false,
}: FileUploadZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    disabled,
    noClick: true, // Disable default click to use custom handlers
  });

  const handleFolderClick = () => {
    if (type === 'folder' && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleExcelClick = () => {
    if (type === 'excel' && excelInputRef.current) {
      excelInputRef.current.click();
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesAccepted(files);
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesAccepted(files);
  };

  const Icon = type === 'folder' ? FolderOpen : FileText;

  return (
    <div
      {...getRootProps()}
      onClick={type === 'folder' ? handleFolderClick : handleExcelClick}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {type === 'folder' ? (
        <input
          ref={inputRef}
          type="file"
          {...({webkitdirectory: "", directory: ""} as any)}
          multiple
          onChange={handleFolderChange}
          style={{ display: 'none' }}
        />
      ) : (
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          multiple={multiple}
          onChange={handleExcelChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
      )}
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 rounded-full bg-primary/10">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {isDragActive
              ? `Drop your ${type === 'folder' ? 'folder' : 'Excel file'} here`
              : `Upload ${type === 'folder' ? 'Main Folder' : 'Excel Sheet'}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {type === 'folder'
              ? 'Click to select folder with customer subfolders'
              : 'Accepts .xlsx, .xls files'}
          </p>
        </div>
      </div>
    </div>
  );
};
