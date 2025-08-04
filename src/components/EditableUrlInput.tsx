import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const EditableUrlInput: React.FC<EditableUrlInputProps> = ({
  value,
  onChange,
  placeholder = "https://www.amazon.com/product-link or any international store",
  className,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  // If no URL is set yet, start in edit mode
  const shouldShowEditMode = isEditing || (!value && !disabled);
  
  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };
  
  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="relative">
      <Input
        value={shouldShowEditMode ? editValue : value}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        disabled={!shouldShowEditMode || disabled}
        className={cn(
          "pl-10 pr-10 text-sm",
          !shouldShowEditMode && "bg-gray-50 cursor-default",
          className
        )}
      />
      
      {/* Left side button - Open */}
      {!shouldShowEditMode && value && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            title="Open URL"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      {/* Right side buttons */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {shouldShowEditMode ? (
          // Edit mode buttons
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={disabled}
              className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
            >
              <Check className="w-3 h-3" />
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={disabled}
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </>
        ) : (
          // View mode - Edit button only (Open is on left)
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            disabled={disabled}
            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="Edit URL"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};