// ============================================================================
// PROFESSIONAL MODE TOGGLE - Stripe-inspired Edit/View Mode Switch
// Features: Clear visual states, orange indicators, smooth animations
// Based on industry standards: Stripe, GitHub Primer, Figma Dev Mode
// ============================================================================

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Zap } from 'lucide-react';

interface ModeToggleProps {
  isEditMode: boolean;
  onToggle: (isEditMode: boolean) => void;
  disabled?: boolean;
  showBadge?: boolean;
  size?: 'default' | 'sm';
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  isEditMode,
  onToggle,
  disabled = false,
  showBadge = true,
  size = 'default',
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Keyboard shortcut: Ctrl+E / Cmd+E
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
      event.preventDefault();
      if (!disabled) {
        onToggle(!isEditMode);
      }
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        if (!disabled) {
          onToggle(!isEditMode);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isEditMode, onToggle, disabled]);

  return (
    <div className="flex items-center space-x-3">
      {/* Edit Mode Badge - Stripe-style indicator */}
      {showBadge && isEditMode && (
        <Badge
          variant="default"
          className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 animate-in slide-in-from-left-2 duration-300 shadow-sm"
        >
          <Zap className="w-3 h-3 mr-1 animate-pulse" />
          EDIT MODE
        </Badge>
      )}

      {/* Professional Toggle Switch */}
      <div
        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
          isEditMode
            ? 'border-orange-200 bg-orange-50/50'
            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
        }`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Mode Toggle Control"
      >
        {/* View Mode Label */}
        <div className="flex items-center space-x-2">
          <Eye
            className={`w-4 h-4 transition-colors duration-200 ${
              !isEditMode ? 'text-blue-600' : 'text-gray-400'
            }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              !isEditMode ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            View Mode
          </span>
        </div>

        {/* Switch Component */}
        <Switch
          checked={isEditMode}
          onCheckedChange={onToggle}
          disabled={disabled}
          className={`transition-all duration-300 ${
            isEditMode
              ? 'data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500'
              : 'data-[state=unchecked]:bg-blue-500 data-[state=unchecked]:border-blue-500'
          }`}
          aria-label={`Switch to ${isEditMode ? 'View' : 'Edit'} Mode`}
        />

        {/* Edit Mode Label */}
        <div className="flex items-center space-x-2">
          <Edit
            className={`w-4 h-4 transition-colors duration-200 ${
              isEditMode ? 'text-orange-600' : 'text-gray-400'
            }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              isEditMode ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            Edit Mode
          </span>
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      {size === 'default' && (
        <div className="text-xs text-gray-400 select-none">
          {navigator.platform.includes('Mac') ? '⌘+E' : 'Ctrl+E'}
        </div>
      )}
    </div>
  );
};

export default ModeToggle;