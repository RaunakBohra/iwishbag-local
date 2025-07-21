// ============================================================================
// ADMIN SCROLL PROTECTION HOOK - Smart scroll locking for admin operations
// Automatically manages scroll state during critical admin tasks
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useGlobalScrollLock } from './useGlobalScrollLock';

interface AdminScrollProtectionOptions {
  autoLockOnEdit?: boolean;
  allowedSelectors?: string[];
  lockDuringOperations?: string[]; // operation types that require scroll lock
}

interface AdminOperation {
  type: string;
  description: string;
  requiresScrollLock: boolean;
  startTime: number;
}

interface UseAdminScrollProtectionReturn {
  startOperation: (type: string, description?: string, requiresLock?: boolean) => string;
  endOperation: (operationId: string) => void;
  lockDuringCallback: <T>(callback: () => T | Promise<T>) => Promise<T>;
  activeOperations: AdminOperation[];
  isOperationInProgress: boolean;
  emergencyUnlock: () => void;
}

export const useAdminScrollProtection = (
  options: AdminScrollProtectionOptions = {},
): UseAdminScrollProtectionReturn => {
  const {
    autoLockOnEdit = true,
    allowedSelectors = [
      '.scroll-area', // Allow scroll areas
      '[data-radix-scroll-area-viewport]', // Radix scroll areas
      '.modal-content', // Modal content
      '.dropdown-content', // Dropdown content
      '.popover-content', // Popover content
      '.combobox-content', // Combobox content
    ],
    lockDuringOperations = [
      'form-submit',
      'quote-calculation',
      'payment-processing',
      'file-upload',
      'bulk-operation',
      'data-export',
      'route-editing',
    ],
  } = options;

  const [activeOperations, setActiveOperations] = useState<Map<string, AdminOperation>>(new Map());

  const { lockScroll, unlockScroll, forceUnlock } = useGlobalScrollLock({
    preserveScrollbarGutter: true,
    allowedScrollContainers: allowedSelectors,
  });

  // Check if any operation requires scroll lock
  const shouldBeLocked = Array.from(activeOperations.values()).some((op) => op.requiresScrollLock);

  // Start an admin operation
  const startOperation = useCallback(
    (type: string, description: string = type, requiresLock?: boolean): string => {
      const operationId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const operation: AdminOperation = {
        type,
        description,
        requiresScrollLock: requiresLock ?? lockDuringOperations.includes(type),
        startTime: Date.now(),
      };

      setActiveOperations((prev) => {
        const newMap = new Map(prev);
        newMap.set(operationId, operation);
        return newMap;
      });

      // Auto-lock if this operation requires it
      if (operation.requiresScrollLock) {
        lockScroll();
        console.log(`[AdminScrollProtection] Locked scroll for operation: ${description}`);
      }

      return operationId;
    },
    [lockDuringOperations, lockScroll],
  );

  // End an admin operation
  const endOperation = useCallback(
    (operationId: string) => {
      setActiveOperations((prev) => {
        const newMap = new Map(prev);
        const operation = newMap.get(operationId);

        if (operation) {
          const duration = Date.now() - operation.startTime;
          console.log(
            `[AdminScrollProtection] Operation ${operation.description} completed in ${duration}ms`,
          );

          newMap.delete(operationId);

          // Unlock if this was the last operation requiring lock
          if (operation.requiresScrollLock) {
            const stillNeedsLock = Array.from(newMap.values()).some((op) => op.requiresScrollLock);
            if (!stillNeedsLock) {
              unlockScroll();
              console.log(
                `[AdminScrollProtection] Unlocked scroll after operation: ${operation.description}`,
              );
            }
          }
        }

        return newMap;
      });
    },
    [unlockScroll],
  );

  // Execute a callback with scroll lock
  const lockDuringCallback = useCallback(
    async <T>(callback: () => T | Promise<T>): Promise<T> => {
      const operationId = startOperation('callback-execution', 'Callback with scroll lock', true);

      try {
        const result = await callback();
        return result;
      } finally {
        endOperation(operationId);
      }
    },
    [startOperation, endOperation],
  );

  // Emergency unlock all operations
  const emergencyUnlock = useCallback(() => {
    console.warn('[AdminScrollProtection] Emergency unlock triggered');
    setActiveOperations(new Map());
    forceUnlock();
  }, [forceUnlock]);

  // Cleanup stale operations (older than 30 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActiveOperations((prev) => {
        const newMap = new Map();
        let hasStaleOperations = false;

        prev.forEach((operation, id) => {
          if (now - operation.startTime > 30000) {
            // 30 seconds
            console.warn(
              `[AdminScrollProtection] Cleaning up stale operation: ${operation.description}`,
            );
            hasStaleOperations = true;
          } else {
            newMap.set(id, operation);
          }
        });

        if (hasStaleOperations) {
          // Check if we should still be locked
          const stillNeedsLock = Array.from(newMap.values()).some((op) => op.requiresScrollLock);
          if (!stillNeedsLock && shouldBeLocked) {
            unlockScroll();
          }
        }

        return newMap;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanup);
  }, [shouldBeLocked, unlockScroll]);

  // Auto-unlock on component unmount
  useEffect(() => {
    return () => {
      if (activeOperations.size > 0) {
        console.log('[AdminScrollProtection] Component unmounting, cleaning up operations');
        emergencyUnlock();
      }
    };
  }, [activeOperations.size, emergencyUnlock]);

  return {
    startOperation,
    endOperation,
    lockDuringCallback,
    activeOperations: Array.from(activeOperations.values()),
    isOperationInProgress: activeOperations.size > 0,
    emergencyUnlock,
  };
};
