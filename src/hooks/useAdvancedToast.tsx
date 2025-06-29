
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Undo2, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface AdvancedToastOptions {
  title: string;
  description?: string;
  duration?: number;
  variant?: "default" | "destructive";
  undoAction?: () => void;
  undoTimeout?: number;
  showProgress?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export const useAdvancedToast = () => {
  const { toast } = useToast();

  const showToast = (options: AdvancedToastOptions) => {
    const {
      title,
      description,
      duration = 5000,
      variant = "default",
      undoAction,
      undoTimeout = 5000,
      showProgress = false,
      actionLabel,
      onAction,
    } = options;

    let countdownInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const getIcon = () => {
      switch (variant) {
        case "destructive":
          return <XCircle className="h-4 w-4" />;
        default:
          return <CheckCircle className="h-4 w-4" />;
      }
    };

    const createAction = () => {
      if (undoAction) {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                undoAction();
                if (countdownInterval) clearInterval(countdownInterval);
                if (timeoutId) clearTimeout(timeoutId);
              }}
              className="h-8"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
          </div>
        );
      }

      if (onAction && actionLabel) {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="h-8"
          >
            {actionLabel}
          </Button>
        );
      }

      return null;
    };

    // Use a simple title string and put the icon in the description
    const toastConfig = {
      title: title,
      description: (
        <div className="flex items-center gap-2">
          {getIcon()}
          <span>{description}</span>
        </div>
      ),
      duration,
      action: createAction(),
    };

    return toast(toastConfig);
  };

  const showSuccessToast = (title: string, description?: string, options?: Partial<AdvancedToastOptions>) => {
    return showToast({
      title,
      description,
      variant: "default",
      ...options,
    });
  };

  const showErrorToast = (title: string, description?: string, options?: Partial<AdvancedToastOptions>) => {
    return showToast({
      title,
      description,
      variant: "destructive",
      ...options,
    });
  };

  const showUndoableToast = (
    title: string,
    undoAction: () => void,
    description?: string,
    undoTimeout = 5000
  ) => {
    return showToast({
      title,
      description,
      undoAction,
      undoTimeout,
      variant: "default",
    });
  };

  const showProgressToast = (title: string, description?: string) => {
    return showToast({
      title,
      description,
      showProgress: true,
      duration: 0, // Keep open until manually dismissed
    });
  };

  return {
    showToast,
    showSuccessToast,
    showErrorToast,
    showUndoableToast,
    showProgressToast,
  };
};
