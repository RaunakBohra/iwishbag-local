// ============================================================================
// PROFESSIONAL MODE TOGGLE - Edit Mode Switch with Calming Colors
// Features: Single action label, clear visual states, teal indicators for relaxed attention
// Color psychology: Teal promotes focus & reduces stress (blue + green benefits)
// Follows UX best practices: labels show what happens when toggle is ON
// Based on research: NN/g, color psychology studies, GitHub Primer, Figma Dev Mode
// ============================================================================

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Zap } from 'lucide-react';

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
      {/* Edit Mode Badge - Calming teal for relaxed attention */}
      {showBadge && isEditMode && (
        <Badge
          variant="default"
          className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 animate-in slide-in-from-left-2 duration-300 shadow-sm"
        >
          <Zap className="w-3 h-3 mr-1 animate-pulse" />
          EDIT MODE
        </Badge>
      )}

      {/* Professional Toggle Switch - Single Label Following UX Best Practices */}
      <div
        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 ${
          isEditMode
            ? 'border-cyan-200 bg-cyan-50/50'
            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
        }`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Edit Mode Toggle"
      >
        {/* Single Action Label - Shows what happens when toggle is ON */}
        <div className="flex items-center space-x-2">
          <Edit
            className={`w-4 h-4 transition-colors duration-200 ${
              isEditMode ? 'text-cyan-600' : 'text-gray-600'
            }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              isEditMode ? 'text-cyan-600' : 'text-gray-700'
            }`}
          >
            Edit Mode
          </span>
        </div>

        {/* Switch Component */}
        <Switch
          checked={isEditMode}
          onCheckedChange={onToggle}
          disabled={disabled}
          className={`transition-all duration-300 ${
            isEditMode
              ? 'data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500'
              : 'data-[state=unchecked]:bg-gray-400 data-[state=unchecked]:border-gray-400'
          }`}
          aria-label={`${isEditMode ? 'Disable' : 'Enable'} Edit Mode`}
        />
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