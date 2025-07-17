import {
  LucideIcon,
  ShoppingCart,
  Calculator,
  Send,
  CheckCircle,
  CreditCard,
  Package,
  Truck,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  calculator: Calculator,
  send: Send,
  'check-circle': CheckCircle,
  'credit-card': CreditCard,
  package: Package,
  truck: Truck,
  home: Home,
};

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  const IconComponent = iconMap[name] || ShoppingCart; // Default to ShoppingCart if icon not found

  return <IconComponent className={cn('h-4 w-4', className)} {...props} />;
};
