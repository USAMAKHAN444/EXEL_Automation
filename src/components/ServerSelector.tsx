import { ServerType, API_SERVERS } from '@/config/api';
import { Server, Globe, Monitor } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ServerSelectorProps {
  value: ServerType;
  onChange: (value: ServerType) => void;
  disabled?: boolean;
}

export const ServerSelector = ({
  value,
  onChange,
  disabled = false,
}: ServerSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Server className="w-4 h-4" />
        <span>API Server:</span>
      </div>
      
      <Select
        value={value}
        onValueChange={(val) => onChange(val as ServerType)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select server" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="local">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" />
              <span>Local Server</span>
            </div>
          </SelectItem>
          <SelectItem value="remote">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-500" />
              <span>Remote (Staging)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Badge 
        variant={value === 'local' ? 'secondary' : 'default'}
        className="text-xs font-mono"
      >
        {API_SERVERS[value]}
      </Badge>
    </div>
  );
};

