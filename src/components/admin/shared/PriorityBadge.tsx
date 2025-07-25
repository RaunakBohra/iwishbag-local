/**
 * Shared Priority Badge component for admin interface
 * Extracted from duplicate implementations in quote components
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type QuotePriority = Tables<'quotes'>['priority'];

interface PriorityBadgeProps {
  priority: QuotePriority;
  className?: string;
}

interface PriorityConfig {
  label: string;
  className: string;
}

const getPriorityConfig = (priority: QuotePriority): PriorityConfig | null => {
  if (!priority) return null;

  const configs: Record<NonNullable<QuotePriority>, PriorityConfig> = {
    low: {
      label: 'Low',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    medium: {
      label: 'Medium',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    high: {
      label: 'High',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  return configs[priority] || null;
};

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const config = getPriorityConfig(priority);

  if (!config) return null;

  return (
    <Badge className={cn('text-xs font-medium', config.className, className)}>{config.label}</Badge>
  );
};
