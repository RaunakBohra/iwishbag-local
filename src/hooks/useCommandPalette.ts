// =============================================
// Command Palette Hook
// =============================================
// Hook for managing command palette state and global keyboard shortcuts.
// Handles Cmd+K/Ctrl+K shortcut detection and palette state management.
// Created: 2025-07-24
// =============================================

import { useState, useEffect, useCallback } from 'react';

interface UseCommandPaletteOptions {
  enableShortcut?: boolean;
  shortcutKey?: string;
  preventDefaultShortcuts?: boolean;
}

export const useCommandPalette = (options: UseCommandPaletteOptions = {}) => {
  const { enableShortcut = true, shortcutKey = 'k', preventDefaultShortcuts = true } = options;

  const [isOpen, setIsOpen] = useState(false);

  // Open the command palette
  const openPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close the command palette
  const closePalette = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle the command palette
  const togglePalette = useCallback(() => {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }, [isOpen, openPalette, closePalette]);

  // Keyboard shortcut handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      const isCommandK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcutKey;

      // Check for standalone shortcuts like "/" for search
      const isSlashSearch =
        event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isInputFocused();

      if (isCommandK || isSlashSearch) {
        // Prevent default browser behavior
        if (preventDefaultShortcuts) {
          event.preventDefault();
          event.stopPropagation();
        }

        // Don't open if we're already in an input field (except for Cmd/Ctrl+K)
        if (!isCommandK && isInputFocused()) {
          return;
        }

        togglePalette();
      }

      // Close on Escape if palette is open
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closePalette();
      }
    },
    [shortcutKey, preventDefaultShortcuts, togglePalette, isOpen, closePalette],
  );

  // Check if an input element is currently focused
  const isInputFocused = (): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
    const isInput = ['input', 'textarea', 'select'].includes(tagName);

    return isInput || isContentEditable;
  };

  // Set up global keyboard listener
  useEffect(() => {
    if (!enableShortcut) return;

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enableShortcut, handleKeyDown]);

  // Prevent body scrolling when palette is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Provide keyboard shortcut info for UI display
  const getShortcutDisplay = (): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? '⌘' : 'Ctrl';
    return `${modifier}+${shortcutKey.toUpperCase()}`;
  };

  return {
    // State
    isOpen,

    // Actions
    openPalette,
    closePalette,
    togglePalette,

    // Utilities
    getShortcutDisplay,
    isInputFocused,
  };
};

// Hook for command palette analytics
export const useCommandPaletteAnalytics = () => {
  const trackPaletteOpen = useCallback(async (method: 'shortcut' | 'button' | 'menu') => {
    await userActivityService.trackActivity(ACTIVITY_TYPES.BUTTON_CLICK, {
      element_id: 'command_palette',
      element_type: 'modal',
      element_text: 'Open Command Palette',
      action: 'open',
      method,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackPaletteSearch = useCallback(async (query: string, resultCount: number) => {
    await userActivityService.trackSearchActivity(query, resultCount, {
      search_source: 'command_palette',
      search_context: 'global_search',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackPaletteSelection = useCallback(
    async (itemType: string, itemId: string, itemTitle: string, searchQuery?: string) => {
      await userActivityService.trackActivity(ACTIVITY_TYPES.LINK_CLICK, {
        element_id: itemId,
        element_type: itemType,
        element_text: itemTitle,
        action: 'select',
        source: 'command_palette',
        search_query: searchQuery,
        timestamp: new Date().toISOString(),
      });
    },
    [],
  );

  return {
    trackPaletteOpen,
    trackPaletteSearch,
    trackPaletteSelection,
  };
};

// Custom hook for managing keyboard shortcuts globally
export const useGlobalKeyboardShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Map<string, () => void>>(new Map());

  const registerShortcut = useCallback(
    (
      key: string,
      modifiers: {
        ctrl?: boolean;
        meta?: boolean;
        alt?: boolean;
        shift?: boolean;
      },
      callback: () => void,
      description?: string,
    ) => {
      const shortcutKey = `${modifiers.ctrl ? 'ctrl+' : ''}${modifiers.meta ? 'meta+' : ''}${modifiers.alt ? 'alt+' : ''}${modifiers.shift ? 'shift+' : ''}${key}`;

      setShortcuts((prev) => new Map(prev).set(shortcutKey, callback));

      return () => {
        setShortcuts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(shortcutKey);
          return newMap;
        });
      };
    },
    [],
  );

  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const shortcutKey = `${event.ctrlKey ? 'ctrl+' : ''}${event.metaKey ? 'meta+' : ''}${event.altKey ? 'alt+' : ''}${event.shiftKey ? 'shift+' : ''}${key}`;

      const callback = shortcuts.get(shortcutKey);
      if (callback) {
        event.preventDefault();
        event.stopPropagation();
        callback();
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleGlobalKeyDown]);

  return {
    registerShortcut,
    shortcuts: Array.from(shortcuts.keys()),
  };
};
