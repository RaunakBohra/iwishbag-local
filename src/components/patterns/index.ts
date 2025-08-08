/**
 * Standard Component Patterns Index - Unified component interfaces
 * 
 * Migration Guide:
 * 
 * OLD MODAL USAGE:
 * import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
 * // Custom modal setup with inconsistent patterns...
 * 
 * NEW MODAL USAGE:
 * import { StandardModal, ConfirmationModal, FormModal } from '@/components/patterns';
 * 
 * OLD FORM USAGE:
 * import { useForm } from 'react-hook-form';
 * // Manual form setup with validation...
 * 
 * NEW FORM USAGE:
 * import { StandardForm } from '@/components/patterns';
 * 
 * OLD LOADING USAGE:
 * import { Skeleton } from '@/components/ui/skeleton';
 * // Custom loading states...
 * 
 * NEW LOADING USAGE:
 * import { StandardLoading, PageLoading, DataLoading } from '@/components/patterns';
 */

// Export all modal patterns
export {
  StandardModal,
  ConfirmationModal,
  FormModal,
  InfoModal,
  type StandardModalProps,
  type StandardModalConfig,
  type ModalAction,
} from './StandardModal';

// Export all form patterns
export {
  StandardForm,
  createFormSchema,
  commonValidations,
  type StandardFormProps,
  type StandardFormConfig,
  type FormFieldConfig,
  type FormSection,
  type FormAction,
} from './StandardForm';

// Export all loading patterns
export {
  StandardLoading,
  StandardSkeleton,
  PageLoading,
  DataLoading,
  ProgressLoading,
  useLoadingState,
  type StandardLoadingProps,
  type LoadingConfig,
  type LoadingState,
} from './StandardLoading';

// Pattern usage examples and utilities
export const PatternExamples = {
  // Modal examples
  simpleConfirmation: {
    component: 'ConfirmationModal',
    props: {
      title: 'Confirm Action',
      description: 'Are you sure you want to proceed?',
      onConfirm: () => console.log('Confirmed'),
      variant: 'warning',
    },
  },
  
  complexForm: {
    component: 'FormModal',
    props: {
      title: 'Edit Profile',
      sections: [
        {
          id: 'personal',
          title: 'Personal Information',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
      ],
    },
  },
  
  // Form examples
  loginForm: {
    component: 'StandardForm',
    fields: [
      { 
        name: 'email', 
        label: 'Email', 
        type: 'email', 
        required: true,
        validation: commonValidations.email,
      },
      { 
        name: 'password', 
        label: 'Password', 
        type: 'password', 
        required: true,
        showPasswordToggle: true,
        validation: commonValidations.password,
      },
    ],
  },
  
  // Loading examples
  pageLoad: {
    component: 'PageLoading',
    props: {
      title: 'Loading Dashboard',
      description: 'Fetching your latest data...',
    },
  },
  
  dataLoad: {
    component: 'DataLoading',
    props: {
      isLoading: true,
      config: { variant: 'skeleton', overlay: true },
    },
  },
};

// Pattern best practices
export const PatternBestPractices = {
  modals: {
    // Always provide clear titles and descriptions
    clarity: 'Use descriptive titles and clear action labels',
    // Handle loading states properly
    loading: 'Show loading states during async operations',
    // Provide keyboard shortcuts
    accessibility: 'Support Escape key and Enter key shortcuts',
    // Prevent accidental closes during operations
    persistence: 'Use persistent mode during critical operations',
  },
  
  forms: {
    // Group related fields
    organization: 'Use sections to group related form fields',
    // Provide real-time validation
    validation: 'Validate fields on blur for better UX',
    // Show progress for long forms
    progress: 'Use progress indicators for multi-step forms',
    // Auto-save when possible
    persistence: 'Implement auto-save for long forms',
  },
  
  loading: {
    // Use skeleton loading for better perceived performance
    skeleton: 'Use skeleton loading for content-heavy interfaces',
    // Show progress for long operations
    progress: 'Display progress for operations that take time',
    // Prevent loading flashes
    minimum: 'Set minimum load times to prevent flashing',
    // Provide retry mechanisms
    retry: 'Allow users to retry failed operations',
  },
};

// Migration helpers
export const migrationHelpers = {
  // Convert old modal to new pattern
  convertModal: (oldModalProps: any) => {
    return {
      isOpen: oldModalProps.open,
      onClose: oldModalProps.onOpenChange,
      title: oldModalProps.title,
      children: oldModalProps.children,
      config: {
        size: oldModalProps.size || 'md',
        variant: 'default',
      },
    };
  },
  
  // Convert old form to new pattern
  convertForm: (oldFormConfig: any) => {
    return {
      fields: oldFormConfig.fields?.map((field: any) => ({
        name: field.name,
        label: field.label,
        type: field.type || 'text',
        required: field.required,
        validation: field.validation,
      })) || [],
      onSubmit: oldFormConfig.onSubmit,
      config: {
        layout: 'vertical',
        showRequiredIndicators: true,
      },
    };
  },
  
  // Convert old loading to new pattern
  convertLoading: (isLoading: boolean, children: React.ReactNode) => {
    return {
      isLoading,
      children,
      config: { variant: 'skeleton' },
    };
  },
};

// Performance optimization patterns
export const performancePatterns = {
  // Lazy load modals
  lazyModal: `
    const LazyModal = lazy(() => import('./StandardModal'));
    
    // Use Suspense wrapper
    <Suspense fallback={<StandardLoading isLoading={true} />}>
      <LazyModal {...props} />
    </Suspense>
  `,
  
  // Memoize heavy forms
  memoizedForm: `
    const MemoizedForm = memo(StandardForm);
    
    // Use with stable props
    <MemoizedForm 
      fields={useMemo(() => fields, [dependencies])}
      onSubmit={useCallback(handleSubmit, [dependencies])}
    />
  `,
  
  // Optimize loading states
  optimizedLoading: `
    const { isLoading, startLoading, finishLoading } = useLoadingState();
    
    // Prevent unnecessary re-renders
    const memoizedChildren = useMemo(() => children, [data]);
    
    <StandardLoading isLoading={isLoading}>
      {memoizedChildren}
    </StandardLoading>
  `,
};

// Testing utilities
export const testingUtils = {
  // Modal testing helpers
  modal: {
    expectOpen: (modal: HTMLElement) => expect(modal).toBeInTheDocument(),
    expectClosed: (modal: HTMLElement | null) => expect(modal).not.toBeInTheDocument(),
    clickConfirm: (modal: HTMLElement) => fireEvent.click(within(modal).getByText(/confirm/i)),
    clickCancel: (modal: HTMLElement) => fireEvent.click(within(modal).getByText(/cancel/i)),
  },
  
  // Form testing helpers
  form: {
    fillField: (form: HTMLElement, name: string, value: string) => {
      fireEvent.change(within(form).getByRole('textbox', { name }), { target: { value } });
    },
    submitForm: (form: HTMLElement) => {
      fireEvent.submit(form);
    },
    expectError: (form: HTMLElement, message: string) => {
      expect(within(form).getByText(message)).toBeInTheDocument();
    },
  },
  
  // Loading testing helpers
  loading: {
    expectLoading: (container: HTMLElement) => {
      expect(within(container).getByRole('progressbar')).toBeInTheDocument();
    },
    expectLoaded: (container: HTMLElement, content: string) => {
      expect(within(container).getByText(content)).toBeInTheDocument();
    },
  },
};

// Component pattern documentation
export const documentation = {
  overview: `
    Standard Component Patterns provide consistent, accessible, and maintainable
    UI components across the application. They encapsulate common patterns and
    best practices while allowing for customization when needed.
  `,
  
  benefits: [
    'Consistent user experience across the application',
    'Reduced development time through reusable patterns',
    'Built-in accessibility and keyboard navigation',
    'Standardized error handling and loading states',
    'Easy maintenance and updates',
    'Better testing coverage through shared patterns',
  ],
  
  whenToUse: {
    StandardModal: 'For any popup, confirmation, or overlay content',
    StandardForm: 'For data input, validation, and submission',
    StandardLoading: 'For loading states, progress indication, and data fetching',
  },
  
  whenNotToUse: [
    'For highly specialized UI that requires unique behavior',
    'When the standard patterns impose significant constraints',
    'For prototypes or experimental features (use standard components first)',
  ],
};