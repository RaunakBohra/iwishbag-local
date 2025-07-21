import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/design-system';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  maxItems?: number;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select items...',
  emptyText = 'No items found.',
  className,
  disabled = false,
  maxItems,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => value.includes(option.value));
  }, [options, value]);

  const availableOptions = React.useMemo(() => {
    return options.filter((option) => !value.includes(option.value));
  }, [options, value]);

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      onValueChange(value.filter((item) => item !== selectedValue));
    } else {
      if (maxItems && value.length >= maxItems) {
        return;
      }
      onValueChange([...value, selectedValue]);
    }
  };

  const handleRemove = (valueToRemove: string) => {
    onValueChange(value.filter((item) => item !== valueToRemove));
  };

  const handleClear = () => {
    onValueChange([]);
  };

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px] h-auto"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <Badge key={option.value} variant="secondary" className="mr-1 mb-1">
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRemove(option.value);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => handleRemove(option.value)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value.includes(option.value) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedOptions.length > 0 && (
            <div className="flex justify-between items-center px-3 py-2 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedOptions.length} selected
                {maxItems && ` / ${maxItems}`}
              </span>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
