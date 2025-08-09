import React from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, CheckCircle } from 'lucide-react';

interface ContactInformationSectionProps {
  control: Control<any>;
  isGuestUser: boolean;
  userProfile?: any;
}

export function ContactInformationSection({ control, isGuestUser, userProfile }: ContactInformationSectionProps) {
  if (!isGuestUser) {
    // For logged-in users, don't show any UI but keep hidden fields for form functionality
    return (
      <>
        {/* Hidden fields to ensure form data is properly handled */}
        <FormField
          control={control}
          name="customer_name"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
        <FormField
          control={control}
          name="customer_email"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
        <FormField
          control={control}
          name="customer_phone"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
      </>
    );
  }

  // For guest users, show the full contact form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <span>Contact Information</span>
          </div>
          <Badge variant="destructive">Required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Full Name *</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your full name"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="customer_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>Email Address *</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="your@email.com"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={control}
          name="customer_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>Phone Number</span>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <Input 
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="h-11 max-w-md"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500 mt-1">
                We may call you if we need to clarify your requirements
              </p>
            </FormItem>
          )}
        />
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Create an Account (Optional)</h4>
              <p className="text-sm text-blue-700 mt-1">
                After submitting your quote, you'll have the option to create an account to track your quote status and manage future orders.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}