import { ProcessingStatus } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingPanelProps {
  status: ProcessingStatus;
  onStartProcessing: () => void;
  canProcess: boolean;
}

export const ProcessingPanel = ({
  status,
  onStartProcessing,
  canProcess,
}: ProcessingPanelProps) => {
  const progress =
    status.totalCustomers > 0
      ? (status.processedCustomers / status.totalCustomers) * 100
      : 0;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Processing Status</h3>
        {status.status === 'idle' && (
          <Button
            onClick={onStartProcessing}
            disabled={!canProcess}
            className="gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Start Processing
          </Button>
        )}
        {status.status === 'processing' && (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        )}
        {status.status === 'complete' && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Complete</span>
          </div>
        )}
        {status.status === 'error' && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
        )}
      </div>

      {status.status !== 'idle' && (
        <>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Customer {status.processedCustomers} of {status.totalCustomers}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </>
      )}

      {status.currentCustomer && (
        <div className="text-sm">
          <span className="text-muted-foreground">Currently processing: </span>
          <span className="font-medium text-foreground">
            {status.currentCustomer}
          </span>
        </div>
      )}

      {status.message && (
        <div
          className={cn(
            'text-sm p-3 rounded-md',
            status.status === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-foreground'
          )}
        >
          {status.message}
        </div>
      )}

      {!canProcess && status.status === 'idle' && (
        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
          Upload both a folder and an Excel file to begin processing.
        </div>
      )}
    </div>
  );
};
