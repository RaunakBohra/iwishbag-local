import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Command,
  FileText,
  Package,
  Users,
  ShoppingCart,
  Settings,
  BarChart3,
  X,
  Cog,
  Route,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  keywords: string[];
}

const searchItems: SearchItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Admin dashboard overview',
    url: '/admin',
    icon: BarChart3,
    category: 'Overview',
    keywords: ['dashboard', 'overview', 'home', 'main'],
  },
  // Analytics
  {
    id: 'cart-analytics',
    title: 'Cart Analytics',
    description: 'Monitor cart performance and abandonment',
    url: '/admin/cart-analytics',
    icon: ShoppingCart,
    category: 'Analytics',
    keywords: ['cart', 'analytics', 'abandonment', 'performance', 'shopping'],
  },
  {
    id: 'cart-recovery',
    title: 'Cart Recovery',
    description: 'Manage cart abandonment emails',
    url: '/admin/cart-recovery',
    icon: ShoppingCart,
    category: 'Analytics',
    keywords: ['cart', 'recovery', 'emails', 'abandonment', 'marketing'],
  },
  {
    id: 'rejection-analytics',
    title: 'Rejection Analytics',
    description: 'Analyze quote rejection patterns',
    url: '/admin/rejection-analytics',
    icon: BarChart3,
    category: 'Analytics',
    keywords: ['rejection', 'analytics', 'quotes', 'patterns', 'analysis'],
  },
  // Management
  {
    id: 'quotes',
    title: 'Quote Management',
    description: 'Manage customer quotes and requests',
    url: '/admin/quotes',
    icon: FileText,
    category: 'Management',
    keywords: ['quotes', 'management', 'requests', 'customers', 'file'],
  },
  {
    id: 'orders',
    title: 'Order Management',
    description: 'Track and process customer orders',
    url: '/admin/orders',
    icon: Package,
    category: 'Management',
    keywords: ['orders', 'management', 'tracking', 'processing', 'package'],
  },
  {
    id: 'customers',
    title: 'Customer Management',
    description: 'Manage customer accounts and data',
    url: '/admin/customers',
    icon: Users,
    category: 'Management',
    keywords: ['customers', 'management', 'users', 'accounts', 'data'],
  },
  // Settings
  {
    id: 'email-templates',
    title: 'Email Templates',
    description: 'Manage email campaign templates',
    url: '/admin/email-templates',
    icon: Settings,
    category: 'Settings',
    keywords: ['email', 'templates', 'campaigns', 'marketing', 'settings'],
  },
  {
    id: 'templates',
    title: 'Quote Templates',
    description: 'Manage quote response templates',
    url: '/admin/templates',
    icon: FileText,
    category: 'Settings',
    keywords: ['templates', 'quotes', 'responses', 'file', 'settings'],
  },
  {
    id: 'countries',
    title: 'Country Settings',
    description: 'Configure country-specific settings',
    url: '/admin/countries',
    icon: Settings,
    category: 'Settings',
    keywords: ['countries', 'settings', 'configuration', 'regions'],
  },
  {
    id: 'customs',
    title: 'Customs Categories',
    description: 'Manage customs and import categories',
    url: '/admin/customs',
    icon: Settings,
    category: 'Settings',
    keywords: ['customs', 'categories', 'import', 'shipping', 'settings'],
  },
  {
    id: 'bank-accounts',
    title: 'Bank Accounts',
    description: 'Manage payment and bank account settings',
    url: '/admin/bank-accounts',
    icon: Settings,
    category: 'Settings',
    keywords: ['bank', 'accounts', 'payment', 'financial', 'settings'],
  },
  {
    id: 'auto-settings',
    title: 'Auto Quote Settings',
    description: 'Configure automatic quote generation rules',
    url: '/admin/auto-settings',
    icon: Cog,
    category: 'Settings',
    keywords: ['auto', 'quote', 'settings', 'rules', 'configuration', 'automation'],
  },
  {
    id: 'status-management',
    title: 'Status Management',
    description: 'Configure quote and order statuses and workflows',
    url: '/admin/status-management',
    icon: Settings,
    category: 'Settings',
    keywords: ['status', 'workflow', 'quotes', 'orders', 'configuration', 'management'],
  },
  {
    id: 'shipping-routes',
    title: 'Shipping Routes',
    description: 'Manage shipping routes and delivery options',
    url: '/admin/shipping-routes',
    icon: Route,
    category: 'Settings',
    keywords: ['shipping', 'routes', 'delivery', 'logistics', 'settings'],
  },
];

export const AdminSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = searchItems.filter(
    (item) =>
      query === '' ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(query.toLowerCase())),
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelect = (item: SearchItem) => {
    navigate(item.url);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  const handleKeyDownInDialog = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <span className="sr-only">Search</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Search Admin</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search pages, features, or settings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDownInDialog}
              className="pl-10 pr-4"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-5 w-5 p-0"
                onClick={() => setQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors hover:bg-accent',
                        index === selectedIndex && 'bg-accent',
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span>
              {filteredItems.length} result
              {filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
