import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, DollarSign, Globe, Settings, User, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { currencyService } from '@/services/CurrencyService';

interface UserPreferencesProps {
  showEditButton?: boolean;
  compact?: boolean;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({
  showEditButton = true,
  compact = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allCountries } = useAllCountries();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getCountryName = (countryCode: string) => {
    if (!allCountries) return countryCode;
    const country = allCountries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  const getCurrencyName = (currencyCode: string) => {
    // Use CurrencyService for consistent currency names
    return currencyService.getCurrencyName(currencyCode);
  };

  const getAvailablePaymentMethods = (countryCode: string) => {
    const methods = [];

    switch (countryCode) {
      case 'NP':
        methods.push('eSewa', 'Khalti', 'Fonepay');
        break;
      case 'IN':
        methods.push('PayU');
        break;
      default:
        methods.push('Stripe', 'Airwallex');
    }

    // Universal methods
    methods.push('Bank Transfer', 'Cash on Delivery');

    return methods;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No profile information available.</p>
          {showEditButton && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Complete Profile
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const paymentMethods = getAvailablePaymentMethods(profile.country || 'US');

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{getCountryName(profile.country || 'US')}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{profile.preferred_display_currency || 'USD'}</span>
        </div>
        {showEditButton && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          User Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span>{user?.email}</span>
            </div>
            {(profile.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name) && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Name:</span>
                <span>
                  {profile.full_name || user?.user_metadata?.name || user?.user_metadata?.full_name}
                </span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span>{profile.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Regional Settings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Regional Settings
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Country:</span>
              <Badge variant="outline" className="text-xs">
                {getCountryName(profile.country || 'US')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Currency:</span>
              <Badge variant="outline" className="text-xs">
                {getCurrencyName(profile.preferred_display_currency || 'USD')} (
                {profile.preferred_display_currency || 'USD'})
              </Badge>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Available Payment Methods
          </h4>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <Badge key={method} variant="secondary" className="text-xs">
                {method}
              </Badge>
            ))}
          </div>
        </div>

        {showEditButton && (
          <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Preferences
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
