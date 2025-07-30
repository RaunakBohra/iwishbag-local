/**
 * This file wraps the Radix Select components to add automatic timing fixes
 * Import from here instead of the base select.tsx file
 */

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './auto-select';

// Re-export the type
export type { SelectProps } from '@radix-ui/react-select';