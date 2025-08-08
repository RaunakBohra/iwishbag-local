/**
 * Standard Modal Pattern - Unified modal interface
 * 
 * Replaces inconsistent modal implementations with a single,
 * standardized pattern that handles all common modal scenarios
 */

import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  Loader2,
  Save,
  Trash2,
  Download,
  Upload,
  Eye,
  Edit,
  Plus,
  Settings
} from 'lucide-react';

// Modal configuration types
export interface StandardModalConfig {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'form' | 'confirmation' | 'info' | 'warning' | 'error' | 'success';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  persistent?: boolean; // Prevent closing during operations
  scrollable?: boolean;
  headerActions?: ModalAction[];
  footerLayout?: 'left' | 'right' | 'center' | 'spread';
}

export interface ModalAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  hidden?: boolean;
  tooltip?: string;
}

export interface StandardModalProps {
  // Core properties
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  
  // Configuration
  config?: StandardModalConfig;
  
  // Content sections
  icon?: ReactNode;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  
  // Actions
  primaryAction?: ModalAction;
  secondaryActions?: ModalAction[];
  
  // State management
  isLoading?: boolean;
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
  
  // Advanced features
  onBeforeClose?: () => boolean | Promise<boolean>; // Return false to prevent closing
  onAfterClose?: () => void;
  onBeforeOpen?: () => boolean | Promise<boolean>;
  onAfterOpen?: () => void;
}

const MODAL_ICONS = {
  default: <Info className="w-5 h-5" />,
  form: <Edit className="w-5 h-5" />,
  confirmation: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
};

const MODAL_SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[90vw] max-h-[90vh]',
};

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  config = {},
  icon,
  badge,
  primaryAction,
  secondaryActions = [],
  isLoading = false,
  error,
  success,
  warning,
  info,
  onBeforeClose,
  onAfterClose,
  onBeforeOpen,
  onAfterOpen,
}) => {
  const {
    size = 'md',
    variant = 'default',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    persistent = false,
    scrollable = true,
    headerActions = [],
    footerLayout = 'right',
  } = config;

  // Handle modal close with before/after hooks
  const handleClose = async () => {
    if (persistent && isLoading) return;
    
    if (onBeforeClose) {
      const canClose = await onBeforeClose();
      if (!canClose) return;
    }
    
    onClose();
    
    if (onAfterClose) {
      onAfterClose();
    }
  };

  // Handle modal open
  const handleOpenChange = async (open: boolean) => {
    if (open) {
      if (onBeforeOpen) {
        const canOpen = await onBeforeOpen();
        if (!canOpen) return;
      }
      
      if (onAfterOpen) {
        onAfterOpen();
      }
    } else {
      await handleClose();
    }
  };

  // Render action button with loading state
  const renderAction = (action: ModalAction) => {
    if (action.hidden) return null;
    
    return (
      <Button
        key={action.id}
        variant={action.variant || 'default'}
        size={action.size || 'md'}
        disabled={action.disabled || isLoading}
        onClick={action.onClick}
        title={action.tooltip}
      >
        {action.loading || (isLoading && action.id === primaryAction?.id) ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          action.icon && <span className="mr-2">{action.icon}</span>
        )}
        {action.label}
      </Button>
    );
  };

  // Get modal icon
  const modalIcon = icon || MODAL_ICONS[variant];

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent 
        className={`${MODAL_SIZES[size]} ${scrollable ? 'overflow-hidden flex flex-col' : ''}`}
        onInteractOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {modalIcon && (
                <div className={`p-2 rounded-lg ${
                  variant === 'error' ? 'bg-red-100 text-red-600' :
                  variant === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  variant === 'success' ? 'bg-green-100 text-green-600' :
                  variant === 'info' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {modalIcon}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <DialogTitle className="text-lg font-semibold">
                    {title}
                  </DialogTitle>
                  
                  {badge && (
                    <Badge variant={badge.variant || 'default'}>
                      {badge.text}
                    </Badge>
                  )}
                </div>
                
                {description && (
                  <DialogDescription className="text-sm text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {headerActions.map(renderAction)}
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={persistent && isLoading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Status Messages */}
        {(error || success || warning || info) && (
          <div className="flex-shrink-0 space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            {warning && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">{warning}</AlertDescription>
              </Alert>
            )}
            
            {info && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">{info}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Separator className="flex-shrink-0" />

        {/* Content */}
        <div className={scrollable ? 'flex-1 overflow-hidden' : 'flex-shrink-0'}>
          {scrollable ? (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {children}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        {(primaryAction || secondaryActions.length > 0) && (
          <>
            <Separator className="flex-shrink-0" />
            <DialogFooter className={`flex-shrink-0 ${
              footerLayout === 'left' ? 'justify-start' :
              footerLayout === 'center' ? 'justify-center' :
              footerLayout === 'spread' ? 'justify-between' :
              'justify-end'
            } gap-2`}>
              {footerLayout === 'spread' && (
                <div className="flex gap-2">
                  {secondaryActions.map(renderAction)}
                </div>
              )}
              
              {footerLayout !== 'spread' && secondaryActions.map(renderAction)}
              
              {primaryAction && renderAction(primaryAction)}
              
              {footerLayout === 'spread' && primaryAction && (
                <div>
                  {renderAction(primaryAction)}
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Specialized modal variants
export const ConfirmationModal: React.FC<Omit<StandardModalProps, 'config'> & {
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'warning' | 'error' | 'info';
}> = ({
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  ...props
}) => {
  return (
    <StandardModal
      {...props}
      config={{
        variant,
        size: 'sm',
        footerLayout: 'right',
      }}
      primaryAction={{
        id: 'confirm',
        label: confirmLabel,
        variant: variant === 'error' ? 'destructive' : 'default',
        onClick: onConfirm,
      }}
      secondaryActions={[
        {
          id: 'cancel',
          label: cancelLabel,
          variant: 'outline',
          onClick: onCancel || props.onClose,
        },
      ]}
    />
  );
};

export const FormModal: React.FC<Omit<StandardModalProps, 'config'> & {
  onSave: () => void | Promise<void>;
  saveLabel?: string;
  showSaveIcon?: boolean;
}> = ({
  onSave,
  saveLabel = 'Save',
  showSaveIcon = true,
  ...props
}) => {
  return (
    <StandardModal
      {...props}
      config={{
        variant: 'form',
        size: 'lg',
        scrollable: true,
      }}
      primaryAction={{
        id: 'save',
        label: saveLabel,
        icon: showSaveIcon ? <Save className="w-4 h-4" /> : undefined,
        onClick: onSave,
      }}
      secondaryActions={[
        {
          id: 'cancel',
          label: 'Cancel',
          variant: 'outline',
          onClick: props.onClose,
        },
      ]}
    />
  );
};

export const InfoModal: React.FC<Omit<StandardModalProps, 'config'> & {
  closeLabel?: string;
}> = ({
  closeLabel = 'Close',
  ...props
}) => {
  return (
    <StandardModal
      {...props}
      config={{
        variant: 'info',
        size: 'md',
      }}
      primaryAction={{
        id: 'close',
        label: closeLabel,
        onClick: props.onClose,
      }}
    />
  );
};