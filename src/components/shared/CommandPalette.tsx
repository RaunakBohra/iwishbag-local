// =============================================
// Command Palette Component
// =============================================
// A powerful command palette with global search, quick actions, and keyboard navigation
// for the iwishBag platform. Supports Cmd+K/Ctrl+K shortcut and real-time search.
// Created: 2025-07-24
// =============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  FileText,
  Package,
  User,
  Users,
  MessageSquare,
  Plus,
  MapPin,
  HelpCircle,
  BarChart3,
  Command,
  ArrowRight,
  Loader2,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/design-system';
import {
  useCommandPaletteData,
  useSearchAnalytics,
  SearchResult,
  QuickAction,
} from '@/hooks/useGlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Icon mapping for search results and quick actions
const iconMap = {
  // Search result types
  quote: FileText,
  user: User,
  support_ticket: MessageSquare,
  product: Package,
  order: Package,

  // Quick action icons
  Plus,
  FileText,
  Package,
  MapPin,
  HelpCircle,
  User,
  BarChart3,
  Users,
  MessageSquare,
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  type: 'search_result' | 'quick_action' | 'suggestion';
  title: string;
  description: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
  category?: string;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { logSearchSelection } = useSearchAnalytics();

  // Get command palette data
  const { searchResults, quickActions, suggestions, isSearching, isLoading } =
    useCommandPaletteData(query, {
      enabled: isOpen,
      searchLimit: 12,
      showQuickActions: true,
    });

  // Combine all items for unified navigation
  const allItems: CommandItem[] = React.useMemo(() => {
    const items: CommandItem[] = [];

    // Add search results first (highest priority)
    if (searchResults.length > 0) {
      searchResults.forEach((result) => {
        items.push({
          id: result.id,
          type: 'search_result',
          title: result.title,
          description: result.description,
          url: result.url,
          icon: result.type,
          metadata: result.metadata,
          category: 'Search Results',
        });
      });
    }

    // Add quick actions
    if (quickActions.length > 0) {
      quickActions.forEach((action) => {
        items.push({
          id: action.id,
          type: 'quick_action',
          title: action.title,
          description: action.description,
          url: action.url,
          icon: action.icon,
          category:
            action.category === 'creation'
              ? 'Create'
              : action.category === 'navigation'
                ? 'Navigate'
                : 'Manage',
          shortcut: action.shortcut,
        });
      });
    }

    return items;
  }, [searchResults, quickActions]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[selectedIndex] && !isNavigating) {
            handleItemSelect(allItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        default:
          // Focus input for typing
          if (
            e.key.length === 1 &&
            inputRef.current &&
            document.activeElement !== inputRef.current
          ) {
            inputRef.current.focus();
          }
          break;
      }
    },
    [isOpen, allItems, selectedIndex, isNavigating],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const selectedElement = scrollContainer?.children[selectedIndex] as HTMLElement;

    if (selectedElement && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = selectedElement.getBoundingClientRect();

      if (elementRect.bottom > containerRect.bottom) {
        selectedElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } else if (elementRect.top < containerRect.top) {
        selectedElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleClose = () => {
    setQuery('');
    setSelectedIndex(0);
    setIsNavigating(false);
    onClose();
  };

  const handleItemSelect = async (item: CommandItem) => {
    if (isNavigating) return;

    setIsNavigating(true);

    try {
      // Log search selection for analytics
      if (item.type === 'search_result' && user?.id) {
        const searchResult: SearchResult = {
          id: item.id,
          type: item.icon as any,
          title: item.title,
          description: item.description,
          url: item.url,
          metadata: item.metadata || {},
          relevance_score: 1,
          created_at: new Date().toISOString(),
        };
        await logSearchSelection(query, searchResult);
      }

      // Navigate to the selected item
      navigate(item.url);
      handleClose();
    } catch (error) {
      console.error('Error selecting command palette item:', error);
      setIsNavigating(false);
    }
  };

  const getItemIcon = (iconName: string) => {
    const Icon = iconMap[iconName as keyof typeof iconMap] || Search;
    return Icon;
  };

  const getItemBadge = (item: CommandItem) => {
    if (item.type === 'search_result' && item.metadata?.status) {
      return (
        <Badge variant="secondary" className="text-xs">
          {item.metadata.status}
        </Badge>
      );
    }

    if (item.shortcut) {
      return (
        <Badge variant="outline" className="text-xs">
          {item.shortcut}
        </Badge>
      );
    }

    return null;
  };

  const groupedItems = React.useMemo(() => {
    const groups: { [category: string]: CommandItem[] } = {};

    allItems.forEach((item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }, [allItems]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Search Results':
        return Search;
      case 'Create':
        return Plus;
      case 'Navigate':
        return ArrowRight;
      case 'Manage':
        return BarChart3;
      default:
        return Command;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <Input
              ref={inputRef}
              placeholder="Search for quotes, orders, users... or type a command"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 p-0 text-base bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
            />
            {isSearching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin ml-2" />}
            <div className="flex items-center gap-1 ml-3 text-xs text-gray-500">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>

          {/* Results */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-2 max-h-96">
            {isLoading && allItems.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Searching...</span>
              </div>
            ) : allItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {query.trim() ? (
                  <div>
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search or browse quick actions below
                    </p>
                  </div>
                ) : (
                  <div>
                    <Command className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Start typing to search or browse quick actions</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(groupedItems).map(([category, items], groupIndex) => (
                  <div key={category}>
                    {groupIndex > 0 && <Separator className="my-2" />}

                    {/* Category header */}
                    <div className="px-4 py-1 text-xs font-medium text-gray-500 flex items-center gap-2">
                      {React.createElement(getCategoryIcon(category), { className: 'w-3 h-3' })}
                      {category}
                      <span className="text-gray-400">({items.length})</span>
                    </div>

                    {/* Category items */}
                    <AnimatePresence>
                      {items.map((item, itemIndex) => {
                        const globalIndex = allItems.findIndex((i) => i.id === item.id);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = getItemIcon(item.icon);

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: itemIndex * 0.05 }}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative',
                              isSelected
                                ? 'bg-teal-50 border-r-2 border-teal-500'
                                : 'hover:bg-gray-50',
                            )}
                            onClick={() => handleItemSelect(item)}
                          >
                            {/* Icon */}
                            <div
                              className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                                isSelected ? 'bg-teal-100' : 'bg-gray-100',
                              )}
                            >
                              <Icon
                                className={cn(
                                  'w-4 h-4',
                                  isSelected ? 'text-teal-600' : 'text-gray-600',
                                )}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p
                                  className={cn(
                                    'font-medium truncate text-sm',
                                    isSelected ? 'text-teal-900' : 'text-gray-900',
                                  )}
                                >
                                  {item.title}
                                </p>
                                {getItemBadge(item)}
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {item.description}
                              </p>
                            </div>

                            {/* Arrow or loading indicator */}
                            <div className="flex-shrink-0">
                              {isNavigating && isSelected ? (
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                              ) : (
                                <ArrowRight
                                  className={cn(
                                    'w-4 h-4 transition-colors',
                                    isSelected ? 'text-teal-600' : 'text-gray-400',
                                  )}
                                />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">⏎</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div>{user ? `${allItems.length} results` : 'Sign in to search'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
