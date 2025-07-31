import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { useAllCountries } from '@/hooks/useAllCountries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Loader2, 
  Phone, 
  CheckCircle, 
  ShieldCheck, 
  Truck,
  Bell,
  Package,
  Lock,
  MessageCircle,
  Gift
} from 'lucide-react';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(8, 'Phone number must be at least 8 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  country: z.string().optional(),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

interface PhoneCollectionModalProps {
  // Support both interface patterns for backward compatibility
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  // Callback patterns
  onPhoneAdded?: () => void;
  onComplete?: () => void;
  // Customization
  title?: string;
  description?: string;
  skipOption?: boolean | { text: string; subtext?: string };
  benefits?: string[];
  // Feature flags
  showCountrySelection?: boolean;
  showBenefits?: boolean;
  useGradientStyling?: boolean;
}

export const PhoneCollectionModal: React.FC<PhoneCollectionModalProps> = ({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onPhoneAdded,
  onComplete,
  title = 'Add Your Phone Number',
  description = 'We need your phone number to complete this action and keep you updated on your orders.',
  skipOption = false,
  benefits,
  showCountrySelection = false,
  showBenefits = false,
  useGradientStyling = true,
}) => {
  // Normalize props for backward compatibility
  const isModalOpen = open ?? isOpen ?? false;
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange?.(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };
  const handleComplete = () => {
    onPhoneAdded?.();
    onComplete?.();
  };
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const { data: allCountries } = useAllCountries();

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
      country: '',
    },
  });

  const handleSubmit = async (values: PhoneFormValues) => {
    if (!user) return;

    // Check if there's a phone validation error
    if (phoneError) {
      toast({
        title: 'Please fix form errors',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update phone in auth.users
      // Ensure phone is in E.164 format (no spaces)
      const e164Phone = values.phone.replace(/\s+/g, '');
      console.log('[PhoneCollectionModal] Saving phone:', {
        original: values.phone,
        e164Format: e164Phone,
        hasPlus: e164Phone.startsWith('+'),
        length: e164Phone.length
      });
      const { error: authError } = await supabase.auth.updateUser({
        phone: e164Phone,
      });

      if (authError) {
        toast({
          title: 'Error',
          description: authError.message,
          variant: 'destructive',
        });
        return;
      }

      // Update profile if country is provided
      if (values.country && showCountrySelection) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            country: values.country,
            // Set currency based on country
            preferred_display_currency:
              values.country === 'US'
                ? 'USD'
                : values.country === 'IN'
                  ? 'INR'
                  : values.country === 'NP'
                    ? 'NPR'
                    : values.country === 'GB'
                      ? 'GBP'
                      : values.country === 'CA'
                        ? 'CAD'
                        : null,
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't fail the whole process for profile error
        }
      }

      toast({
        title: 'Phone Number Added',
        description: 'Your phone number has been saved successfully.',
      });

      handleOpenChange(false);
      handleComplete();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: 'Error',
        description: 'Failed to save phone number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    handleOpenChange(false);
    // Note: Don't call handleComplete since user skipped
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          useGradientStyling
            ? 'bg-white border-gray-200 shadow-2xl max-w-md rounded-xl overflow-hidden'
            : 'sm:max-w-[425px]'
        }
      >
        {useGradientStyling ? (
          // Gradient styling for auth context
          <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-400 px-6 pt-6 pb-4 -mx-6 -mt-6 mb-6">
            <DialogHeader className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-white text-xl font-semibold text-center">
                {title}
              </DialogTitle>
              <DialogDescription className="text-white/90 text-center text-sm">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          // Standard styling for onboarding context
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        )}

        {(showBenefits || benefits) && (
          <div className="grid gap-4 py-4">
            {benefits ? (
              <div className="space-y-3">
                {benefits.map((benefit, index) => {
                  // Map benefits to icons
                  const getIcon = () => {
                    if (benefit.toLowerCase().includes('sms') || benefit.toLowerCase().includes('updates')) {
                      return <Bell className="h-4 w-4 text-teal-600 flex-shrink-0" />;
                    } else if (benefit.toLowerCase().includes('delivery') || benefit.toLowerCase().includes('coordination')) {
                      return <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />;
                    } else if (benefit.toLowerCase().includes('security') || benefit.toLowerCase().includes('2fa')) {
                      return <Lock className="h-4 w-4 text-purple-600 flex-shrink-0" />;
                    } else if (benefit.toLowerCase().includes('support') || benefit.toLowerCase().includes('whatsapp')) {
                      return <MessageCircle className="h-4 w-4 text-green-600 flex-shrink-0" />;
                    } else if (benefit.toLowerCase().includes('deals') || benefit.toLowerCase().includes('exclusive')) {
                      return <Gift className="h-4 w-4 text-orange-600 flex-shrink-0" />;
                    }
                    return <CheckCircle className="h-4 w-4 text-gray-600 flex-shrink-0" />;
                  };
                  
                  return (
                    <div key={index} className="flex items-start gap-3 text-sm text-gray-700">
                      {getIcon()}
                      <span className="leading-relaxed">{benefit}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Truck className="h-4 w-4" />
                  <span>Delivery updates and coordination</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Order security and verification</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={showBenefits ? '' : 'space-y-6'}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className={
                        useGradientStyling ? 'text-sm font-medium text-gray-700' : undefined
                      }
                    >
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <div className="[&_.text-green-500]:hidden [&_.border-green-300]:border-gray-300 [&_.ring-green-200]:ring-0 [&_.focus-within\\:border-blue-500]:focus-within:border-teal-500 [&_.focus-within\\:ring-blue-200]:focus-within:ring-teal-500/20">
                        <WorldClassPhoneInput
                          countries={allCountries || []}
                          value={field.value}
                          onChange={(newPhoneValue) => {
                            field.onChange(newPhoneValue);
                          }}
                          onValidationChange={(isValid, error) => {
                            setPhoneError(error || '');
                            if (error) {
                              form.setError('phone', { message: error });
                            } else {
                              form.clearErrors('phone');
                            }
                          }}
                          initialCountry={showCountrySelection && form.watch('country') ? form.watch('country') : 'US'}
                          disabled={isLoading}
                          required={true}
                          error={form.formState.errors.phone?.message}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </FormControl>
                    {!phoneError && <FormMessage />}
                  </FormItem>
                )}
              />


              <div className="flex gap-3">
                {skipOption && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isLoading}
                    className={
                      useGradientStyling
                        ? 'px-6 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg h-11'
                        : 'flex-1'
                    }
                  >
                    {typeof skipOption === 'object' ? skipOption.text : 'Skip for Now'}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={
                    useGradientStyling
                      ? 'flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-colors h-11'
                      : skipOption
                        ? 'flex-1'
                        : 'w-full'
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : useGradientStyling ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Phone Number
                    </>
                  ) : showCountrySelection ? (
                    'Save Phone'
                  ) : (
                    'Save Phone Number'
                  )}
                </Button>
              </div>
              
              {typeof skipOption === 'object' && skipOption.subtext && (
                <p className="text-center text-xs text-gray-500 mt-4">
                  {skipOption.subtext}
                </p>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
