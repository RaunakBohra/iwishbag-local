import React, { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Eye, EyeOff, Layers, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

// Disclosure levels
export enum DisclosureLevel {
  SUMMARY = 1,
  ESSENTIAL = 2,
  ADVANCED = 3,
  EXPERT = 4,
}

// Context for managing disclosure state
interface DisclosureContextValue {
  level: DisclosureLevel;
  setLevel: (level: DisclosureLevel) => void;
  expandedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  isExpanded: (sectionId: string) => boolean;
  globalExpanded: boolean;
  setGlobalExpanded: (expanded: boolean) => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

export function useDisclosure() {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error('useDisclosure must be used within DisclosureProvider');
  }
  return context;
}

// Provider component
interface DisclosureProviderProps {
  children: ReactNode;
  defaultLevel?: DisclosureLevel;
  persistKey?: string; // For localStorage persistence
}

export function DisclosureProvider({
  children,
  defaultLevel = DisclosureLevel.ESSENTIAL,
  persistKey,
}: DisclosureProviderProps) {
  // Load persisted level if available
  const getInitialLevel = () => {
    if (persistKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`disclosure-level-${persistKey}`);
      return saved ? (parseInt(saved) as DisclosureLevel) : defaultLevel;
    }
    return defaultLevel;
  };

  const [level, setLevelState] = useState<DisclosureLevel>(getInitialLevel);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [globalExpanded, setGlobalExpanded] = useState(false);

  const setLevel = (newLevel: DisclosureLevel) => {
    setLevelState(newLevel);
    if (persistKey && typeof window !== 'undefined') {
      localStorage.setItem(`disclosure-level-${persistKey}`, newLevel.toString());
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isExpanded = (sectionId: string) => {
    return globalExpanded || expandedSections.has(sectionId);
  };

  return (
    <DisclosureContext.Provider
      value={{
        level,
        setLevel,
        expandedSections,
        toggleSection,
        isExpanded,
        globalExpanded,
        setGlobalExpanded,
      }}
    >
      {children}
    </DisclosureContext.Provider>
  );
}

// Level control component
interface LevelControlProps {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function DisclosureLevelControl({
  className,
  showLabels = true,
  compact = false,
}: LevelControlProps) {
  const { level, setLevel } = useDisclosure();

  const levels = [
    { value: DisclosureLevel.SUMMARY, label: 'Summary', icon: Eye },
    { value: DisclosureLevel.ESSENTIAL, label: 'Essential', icon: Layers },
    { value: DisclosureLevel.ADVANCED, label: 'Advanced', icon: Settings2 },
    { value: DisclosureLevel.EXPERT, label: 'Expert', icon: EyeOff },
  ];

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {levels.map((l) => (
          <Button
            key={l.value}
            variant={level === l.value ? 'default' : 'outline'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setLevel(l.value)}
            title={l.label}
          >
            <l.icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {levels.map((l) => (
        <Button
          key={l.value}
          variant={level === l.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLevel(l.value)}
          className={cn(
            'transition-all',
            level === l.value && 'shadow-sm'
          )}
        >
          <l.icon className="h-4 w-4 mr-1.5" />
          {showLabels && l.label}
        </Button>
      ))}
    </div>
  );
}

// Progressive disclosure container
interface DisclosureContainerProps {
  children: ReactNode;
  minLevel: DisclosureLevel;
  className?: string;
  animate?: boolean;
}

export function DisclosureContainer({
  children,
  minLevel,
  className,
  animate = true,
}: DisclosureContainerProps) {
  const { level } = useDisclosure();
  const isVisible = level >= minLevel;

  if (!animate) {
    return isVisible ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Collapsible section component
interface DisclosureSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  minLevel?: DisclosureLevel;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function DisclosureSection({
  id,
  title,
  subtitle,
  minLevel = DisclosureLevel.ESSENTIAL,
  children,
  className,
  defaultExpanded = false,
  badge,
  icon: Icon,
}: DisclosureSectionProps) {
  const { level, isExpanded, toggleSection } = useDisclosure();
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  
  // Use context expansion state if available, otherwise local state
  const expanded = isExpanded(id) || localExpanded;
  const isVisible = level >= minLevel;

  if (!isVisible) return null;

  const handleToggle = () => {
    toggleSection(id);
    setLocalExpanded(!expanded);
  };

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              expanded && 'rotate-90'
            )}
          />
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <div className="text-left">
            <div className="font-medium">{title}</div>
            {subtitle && (
              <div className="text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        {badge && (
          <Badge variant="secondary" className="ml-2">
            {badge}
          </Badge>
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility component for conditional rendering based on level
interface ShowAtLevelProps {
  minLevel: DisclosureLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ShowAtLevel({ minLevel, children, fallback }: ShowAtLevelProps) {
  const { level } = useDisclosure();
  return level >= minLevel ? <>{children}</> : <>{fallback}</>;
}

// Level indicator badge
export function DisclosureLevelBadge({ className }: { className?: string }) {
  const { level } = useDisclosure();
  
  const levelInfo = {
    [DisclosureLevel.SUMMARY]: { label: 'Summary', color: 'bg-blue-100 text-blue-700' },
    [DisclosureLevel.ESSENTIAL]: { label: 'Essential', color: 'bg-green-100 text-green-700' },
    [DisclosureLevel.ADVANCED]: { label: 'Advanced', color: 'bg-orange-100 text-orange-700' },
    [DisclosureLevel.EXPERT]: { label: 'Expert', color: 'bg-purple-100 text-purple-700' },
  };

  const info = levelInfo[level];

  return (
    <Badge className={cn('text-xs', info.color, className)}>
      {info.label} View
    </Badge>
  );
}

// Quick toggle for expand/collapse all
export function DisclosureExpandToggle({ className }: { className?: string }) {
  const { globalExpanded, setGlobalExpanded } = useDisclosure();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setGlobalExpanded(!globalExpanded)}
      className={className}
    >
      {globalExpanded ? (
        <>
          <EyeOff className="h-4 w-4 mr-1.5" />
          Collapse All
        </>
      ) : (
        <>
          <Eye className="h-4 w-4 mr-1.5" />
          Expand All
        </>
      )}
    </Button>
  );
}