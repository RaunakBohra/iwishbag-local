import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone, ArrowLeft, Check } from 'lucide-react';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useNavigate } from 'react-router-dom';

const phoneSchema = z.object({
  phone: z.string()
    .min(1, { message: 'Phone number is required.' })
    .transform((val) => val.replace(/[\s-]/g, '')) // Remove spaces and dashes
    .refine((val) => /^\+[1-9]\d{6,14}$/.test(val), {
      message: 'Please enter a valid phone number with country code.'
    }),
});

interface PhoneLoginFormProps {
  onBackToEmail?: () => void;
}

export default function PhoneLoginForm({ onBackToEmail }: PhoneLoginFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedCountryCode, setDetectedCountryCode] = useState<string>('US');
  const { data: countries = [] } = useAllCountries();
  
  // OTP state using array for individual inputs
  const [otpValues, setOtpValues] = useState<string[]>(new Array(6).fill(''));
  const [otpError, setOtpError] = useState('');

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  // Detect user's country based on IP
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // First, try to get location from IP
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        console.log('IP Detection Response:', data);
        
        if (data.country_code) {
          console.log('Detected country code:', data.country_code);
          console.log('Available countries sample:', countries.slice(0, 5));
          
          // Map country code to phone code - use 'code' field instead of 'iso2'
          const country = countries.find(c => {
            if (!c.code) return false;
            return c.code.toUpperCase() === data.country_code.toUpperCase();
          });
          
          console.log('Found country:', country);
          if (country) {
            setDetectedCountryCode(country.code);
            
            // Check different possible phone code field names
            const phoneCode = country.phone_code || country.dial_code || country.phone;
            if (phoneCode) {
              const formattedPhoneCode = phoneCode.toString().startsWith('+') ? phoneCode : `+${phoneCode}`;
              console.log('Setting phone code:', formattedPhoneCode);
              phoneForm.setValue('phone', formattedPhoneCode);
              
              // Force update the form field
              setTimeout(() => {
                phoneForm.setValue('phone', formattedPhoneCode);
              }, 100);
            }
          }
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        // Default to Nepal if detection fails
        const nepal = countries.find(c => c.code && c.code === 'NP');
        if (nepal) {
          setDetectedCountryCode('NP');
          const phoneCode = nepal.phone_code || nepal.dial_code || nepal.phone;
          if (phoneCode) {
            const formattedPhoneCode = phoneCode.toString().startsWith('+') ? phoneCode : `+${phoneCode}`;
            phoneForm.setValue('phone', formattedPhoneCode);
          }
        }
      }
    };

    if (countries.length > 0) {
      detectCountry();
    }
  }, [countries, phoneForm]);

  // Handle OTP input changes
  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    setOtpError(''); // Clear error when user types

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5) {
      const fullOtp = newOtpValues.join('');
      if (fullOtp.length === 6) {
        handleVerifyOtp({ otp: fullOtp });
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtpValues = pastedData.split('').concat(new Array(6 - pastedData.length).fill(''));
      setOtpValues(newOtpValues);
      
      // Focus last filled input or last input if all filled
      const lastIndex = Math.min(pastedData.length - 1, 5);
      const lastInput = document.getElementById(`otp-input-${lastIndex}`);
      lastInput?.focus();

      // Auto-submit if 6 digits
      if (pastedData.length === 6) {
        handleVerifyOtp({ otp: pastedData });
      }
    }
  };

  const handleSendOtp = async (values: z.infer<typeof phoneSchema>) => {
    setLoading(true);
    try {
      // Use our custom phone OTP system
      const { data, error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone: values.phone },
      });

      if (error) throw error;

      setPhoneNumber(values.phone);
      // Reset OTP values before showing OTP form
      setOtpValues(new Array(6).fill(''));
      setOtpError('');
      setShowOtpForm(true);
      
      // Show test OTP if in test mode
      if (data.test_otp) {
        toast({
          title: 'TEST MODE: OTP Sent',
          description: `Use this OTP: ${data.test_otp}`,
        });
        console.log('📱 TEST OTP:', data.test_otp);
      } else {
        toast({
          title: 'OTP Sent',
          description: 'Check your phone for the verification code.',
        });
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (values: { otp: string }) => {
    setLoading(true);
    try {
      // Use our custom OTP verification
      const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
        body: {
          phone: phoneNumber,
          otp: values.otp,
        },
      });

      if (error) throw error;

      if (data.success && data.magic_link) {
        // Sign in by navigating to the magic link
        window.location.href = data.magic_link;
      } else if (data.success && data.session) {
        // Direct session was created - set it in Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          throw new Error('Failed to authenticate. Please try again.');
        }
        
        toast({
          title: 'Success!',
          description: data.is_new_user 
            ? 'Welcome to iwishBag! Please complete your profile.'
            : 'Welcome back!',
        });

        // Navigate based on whether it's a new user
        if (data.is_new_user) {
          navigate('/profile?complete=true');
        } else {
          navigate('/');
        }
      } else if (data.success) {
        // Fallback: check if session was created
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          toast({
            title: 'Success!',
            description: data.is_new_user 
              ? 'Welcome to iwishBag! Please complete your profile.'
              : 'Welcome back!',
          });

          // Navigate based on whether it's a new user
          if (data.is_new_user) {
            navigate('/profile?complete=true');
          } else {
            navigate('/');
          }
        } else {
          throw new Error('Authentication failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await handleSendOtp({ phone: phoneNumber });
    } finally {
      setLoading(false);
    }
  };

  if (showOtpForm) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Verify your phone</h3>
          <p className="text-sm text-gray-600">
            We've sent a 6-digit code to {phoneNumber}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Enter OTP</label>
            <div className="flex justify-center gap-2">
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  onPaste={index === 0 ? handleOTPPaste : undefined}
                  className={`w-12 h-12 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    otpError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            {otpError && (
              <p className="text-sm text-red-500 text-center">{otpError}</p>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                const otp = otpValues.join('');
                if (otp.length !== 6) {
                  setOtpError('Please enter the complete 6-digit code');
                  return;
                }
                handleVerifyOtp({ otp });
              }}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Verify & Login
                </>
              )}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowOtpForm(false);
                  setOtpValues(new Array(6).fill(''));
                  setOtpError('');
                }}
                disabled={loading}
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Change number
              </Button>

              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend OTP
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Login with Phone</h3>
        <p className="text-sm text-gray-600">
          Enter your phone number to receive a verification code
        </p>
      </div>

      <Form {...phoneForm}>
        <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
          <FormField
            control={phoneForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <WorldClassPhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    countries={countries}
                    placeholder="Enter your phone number"
                    initialCountry={detectedCountryCode}
                    currentCountry={detectedCountryCode}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Send OTP
                </>
              )}
            </Button>

            {onBackToEmail && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBackToEmail}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Email Login
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}