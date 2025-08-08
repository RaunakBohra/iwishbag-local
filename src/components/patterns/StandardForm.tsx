/**
 * Standard Form Pattern - Unified form interface
 * 
 * Provides consistent form layouts, validation patterns,
 * and interaction behaviors across the application
 */

import React, { ReactNode, FormEvent } from 'react';
import { useForm, UseFormReturn, FieldValues, DefaultValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Upload,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

// Form field configuration types
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch' | 'file' | 'custom';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  
  // Type-specific options
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  multiSelect?: boolean;
  rows?: number; // For textarea
  accept?: string; // For file inputs
  multiple?: boolean; // For file inputs
  showPasswordToggle?: boolean; // For password inputs
  
  // Layout
  width?: 'full' | 'half' | 'third' | 'quarter';
  order?: number;
  
  // Validation
  validation?: z.ZodType<any>;
  
  // Custom rendering
  render?: (field: any, form: UseFormReturn<any>) => ReactNode;
  
  // Event handlers
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
}

export interface FormAction {
  id: string;
  label: string;
  type: 'submit' | 'button' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
}

export interface StandardFormConfig {
  layout?: 'vertical' | 'horizontal' | 'grid';
  gridColumns?: 1 | 2 | 3 | 4;
  showRequiredIndicators?: boolean;
  showFieldDescriptions?: boolean;
  submitOnEnter?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetAfterSubmit?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export interface StandardFormProps<T extends FieldValues> {
  // Core properties
  onSubmit: SubmitHandler<T>;
  schema?: z.ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  
  // Form structure
  sections?: FormSection[];
  fields?: FormFieldConfig[]; // Flat field list (alternative to sections)
  
  // Actions
  primaryAction?: FormAction;
  secondaryActions?: FormAction[];
  
  // Configuration
  config?: StandardFormConfig;
  
  // State
  isLoading?: boolean;
  isSubmitting?: boolean;
  error?: string;
  success?: string;
  
  // Form instance (for external control)
  form?: UseFormReturn<T>;
  
  // Event handlers
  onFormChange?: (data: T) => void;
  onFieldChange?: (name: string, value: any) => void;
  onValidationError?: (errors: any) => void;
  
  // Custom content
  children?: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export function StandardForm<T extends FieldValues>({
  onSubmit,
  schema,
  defaultValues,
  sections = [],
  fields = [],
  primaryAction,
  secondaryActions = [],
  config = {},
  isLoading = false,
  isSubmitting = false,
  error,
  success,
  form: externalForm,
  onFormChange,
  onFieldChange,
  onValidationError,
  children,
  headerContent,
  footerContent,
}: StandardFormProps<T>) {
  const {
    layout = 'vertical',
    gridColumns = 2,
    showRequiredIndicators = true,
    showFieldDescriptions = true,
    submitOnEnter = true,
    validateOnChange = false,
    validateOnBlur = true,
    resetAfterSubmit = false,
    autoFocus = true,
    className = '',
  } = config;

  // Initialize form
  const internalForm = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    mode: validateOnChange ? 'onChange' : validateOnBlur ? 'onBlur' : 'onSubmit',
  });

  const form = externalForm || internalForm;
  const { handleSubmit, formState: { errors }, watch, reset } = form;

  // Watch for form changes
  React.useEffect(() => {
    if (onFormChange) {
      const subscription = watch((data) => onFormChange(data as T));
      return () => subscription.unsubscribe();
    }
  }, [watch, onFormChange]);

  // Handle form submission
  const handleFormSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      if (resetAfterSubmit) {
        reset();
      }
    } catch (error) {
      if (onValidationError) {
        onValidationError(error);
      }
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (submitOnEnter && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(handleFormSubmit)();
    }
  };

  // Render form field based on type
  const renderFormField = (fieldConfig: FormFieldConfig, sectionId?: string) => {
    if (fieldConfig.hidden) return null;

    const fieldKey = sectionId ? `${sectionId}.${fieldConfig.name}` : fieldConfig.name;
    const isRequired = fieldConfig.required;
    
    return (
      <FormField
        key={fieldKey}
        control={form.control}
        name={fieldConfig.name}
        render={({ field }) => (
          <FormItem className={getFieldWidth(fieldConfig.width)}>
            <FormLabel className="flex items-center gap-1">
              {fieldConfig.label}
              {isRequired && showRequiredIndicators && (
                <span className="text-red-500">*</span>
              )}
            </FormLabel>
            
            <FormControl>
              {fieldConfig.render ? (
                fieldConfig.render(field, form)
              ) : (
                renderFieldControl(fieldConfig, field)
              )}
            </FormControl>
            
            {showFieldDescriptions && fieldConfig.description && (
              <FormDescription>{fieldConfig.description}</FormDescription>
            )}
            
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // Render field control based on type
  const renderFieldControl = (fieldConfig: FormFieldConfig, field: any) => {
    const commonProps = {
      ...field,
      disabled: fieldConfig.disabled || isLoading,
      onChange: (value: any) => {
        field.onChange(value);
        if (fieldConfig.onChange) fieldConfig.onChange(value);
        if (onFieldChange) onFieldChange(fieldConfig.name, value);
      },
      onBlur: () => {
        field.onBlur();
        if (fieldConfig.onBlur) fieldConfig.onBlur();
      },
      onFocus: fieldConfig.onFocus,
    };

    switch (fieldConfig.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            placeholder={fieldConfig.placeholder}
            rows={fieldConfig.rows || 3}
          />
        );

      case 'select':
        return (
          <Select onValueChange={commonProps.onChange} defaultValue={field.value}>
            <SelectTrigger>
              <SelectValue placeholder={fieldConfig.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={field.value}
              onCheckedChange={commonProps.onChange}
              disabled={commonProps.disabled}
            />
            <span className="text-sm">{fieldConfig.label}</span>
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={field.value}
              onCheckedChange={commonProps.onChange}
              disabled={commonProps.disabled}
            />
            <span className="text-sm">{fieldConfig.label}</span>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={field.value}
            onValueChange={commonProps.onChange}
            disabled={commonProps.disabled}
          >
            {fieldConfig.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} />
                <label className="text-sm">{option.label}</label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'password':
        return <PasswordInput {...commonProps} fieldConfig={fieldConfig} />;

      case 'file':
        return <FileInput {...commonProps} fieldConfig={fieldConfig} />;

      default:
        return (
          <Input
            {...commonProps}
            type={fieldConfig.type}
            placeholder={fieldConfig.placeholder}
          />
        );
    }
  };

  // Get field width class
  const getFieldWidth = (width?: string) => {
    switch (width) {
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      case 'quarter': return 'w-1/4';
      default: return 'w-full';
    }
  };

  // Render form sections
  const renderSections = () => {
    if (sections.length === 0 && fields.length > 0) {
      // Render flat fields
      return (
        <div className={getLayoutClass()}>
          {fields.map(field => renderFormField(field))}
        </div>
      );
    }

    return sections.map((section) => (
      <Card key={section.id} className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {section.title}
                {section.badge && (
                  <Badge variant={section.badge.variant}>
                    {section.badge.text}
                  </Badge>
                )}
              </CardTitle>
              {section.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={getLayoutClass()}>
            {section.fields.map(field => renderFormField(field, section.id))}
          </div>
        </CardContent>
      </Card>
    ));
  };

  // Get layout CSS class
  const getLayoutClass = () => {
    switch (layout) {
      case 'horizontal':
        return 'space-y-6';
      case 'grid':
        return `grid grid-cols-1 md:grid-cols-${gridColumns} gap-4`;
      default:
        return 'space-y-4';
    }
  };

  // Render action button
  const renderAction = (action: FormAction) => (
    <Button
      key={action.id}
      type={action.type}
      variant={action.variant}
      size={action.size}
      disabled={action.disabled || isLoading || isSubmitting}
      onClick={action.onClick}
    >
      {action.loading || (isSubmitting && action.type === 'submit') ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        action.icon && <span className="mr-2">{action.icon}</span>
      )}
      {action.label}
    </Button>
  );

  return (
    <Form {...form}>
      <form 
        onSubmit={handleSubmit(handleFormSubmit)} 
        onKeyDown={handleKeyDown}
        className={className}
      >
        {/* Header Content */}
        {headerContent}

        {/* Status Messages */}
        {(error || success) && (
          <div className="mb-6 space-y-2">
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
          </div>
        )}

        {/* Form Sections/Fields */}
        {renderSections()}

        {/* Custom Content */}
        {children}

        {/* Actions */}
        {(primaryAction || secondaryActions.length > 0) && (
          <div className="flex justify-end gap-2 pt-6 border-t">
            {secondaryActions.map(renderAction)}
            {primaryAction && renderAction(primaryAction)}
          </div>
        )}

        {/* Footer Content */}
        {footerContent}
      </form>
    </Form>
  );
}

// Specialized input components
const PasswordInput: React.FC<{ fieldConfig: FormFieldConfig; [key: string]: any }> = ({
  fieldConfig,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? 'text' : 'password'}
        placeholder={fieldConfig.placeholder}
      />
      {fieldConfig.showPasswordToggle && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
};

const FileInput: React.FC<{ fieldConfig: FormFieldConfig; [key: string]: any }> = ({
  fieldConfig,
  ...props
}) => {
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept={fieldConfig.accept}
        multiple={fieldConfig.multiple}
        {...props}
      />
      {/* File preview/management could be added here */}
    </div>
  );
};

// Form validation helpers
export const createFormSchema = (fields: FormFieldConfig[]) => {
  const schemaFields: Record<string, z.ZodType<any>> = {};
  
  fields.forEach(field => {
    if (field.validation) {
      schemaFields[field.name] = field.validation;
    }
  });
  
  return z.object(schemaFields);
};

// Common validation schemas
export const commonValidations = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  url: z.string().url('Please enter a valid URL'),
  required: z.string().min(1, 'This field is required'),
  number: z.number().min(0, 'Must be a positive number'),
};