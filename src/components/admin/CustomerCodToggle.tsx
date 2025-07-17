import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CustomerCodToggleProps {
  customerId: string;
  codEnabled: boolean;
  onToggle: (userId: string, codEnabled: boolean) => void;
  isUpdating: boolean;
}

export const CustomerCodToggle = ({
  customerId,
  codEnabled,
  onToggle,
  isUpdating,
}: CustomerCodToggleProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`cod-${customerId}`}
        checked={codEnabled}
        onCheckedChange={(checked) => onToggle(customerId, checked)}
        disabled={isUpdating}
      />
      <Label htmlFor={`cod-${customerId}`}>COD Enabled</Label>
    </div>
  );
};
