import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail } from 'lucide-react';
import AuthForm from './AuthForm';
import PhoneLoginForm from '@/components/auth/PhoneLoginForm';

interface EnhancedAuthFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onPasswordResetModeChange?: (allow: boolean) => void;
}

export default function EnhancedAuthForm({ 
  onLogin, 
  onPasswordResetModeChange 
}: EnhancedAuthFormProps = {}) {
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'email' | 'phone')}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email
        </TabsTrigger>
        <TabsTrigger value="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Phone
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="email">
        <AuthForm 
          onLogin={onLogin}
          onPasswordResetModeChange={onPasswordResetModeChange}
        />
      </TabsContent>
      
      <TabsContent value="phone">
        <PhoneLoginForm 
          onBackToEmail={() => setActiveTab('email')}
        />
      </TabsContent>
    </Tabs>
  );
}