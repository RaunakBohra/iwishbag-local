import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Smartphone } from 'lucide-react';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { useAllCountries } from '@/hooks/useAllCountries';

const CompactPhoneInputDemo = () => {
  const { data: countries = [] } = useAllCountries();
  const [phoneValue, setPhoneValue] = useState('');
  const [compactPhoneValue, setCompactPhoneValue] = useState('');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Phone Input Component</h1>
        <p className="text-muted-foreground">
          WorldClassPhoneInput - Production-ready phone input with international support
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Standard Size */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Standard Phone Input
            </CardTitle>
            <CardDescription>
              Full-featured phone input with country selection and validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorldClassPhoneInput
              value={phoneValue}
              onChange={setPhoneValue}
              placeholder="Enter phone number"
              className="w-full"
            />
            {phoneValue && (
              <div className="text-sm text-muted-foreground">
                <Badge variant="secondary">Value: {phoneValue}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compact Size */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Compact Phone Input
            </CardTitle>
            <CardDescription>
              Space-efficient version for tight layouts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorldClassPhoneInput
              value={compactPhoneValue}
              onChange={setCompactPhoneValue}
              placeholder="Phone"
              className="w-full"
              compact
            />
            {compactPhoneValue && (
              <div className="text-sm text-muted-foreground">
                <Badge variant="secondary">Value: {compactPhoneValue}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Core Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• International phone number formatting</li>
                <li>• Real-time validation</li>
                <li>• Country code detection</li>
                <li>• Accessible keyboard navigation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">UI Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Clean, professional design</li>
                <li>• Responsive layout</li>
                <li>• Error state handling</li>
                <li>• Compact mode for tight spaces</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactPhoneInputDemo;