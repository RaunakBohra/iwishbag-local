import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { NewTicketFormWithPackage } from './NewTicketFormWithPackage';
import type { Tables } from '@/integrations/supabase/types';

interface PackageSupportButtonProps {
  package: Tables<'received_packages'>;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  buttonText?: string;
}

export function PackageSupportButton({
  package: pkg,
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
  buttonText = 'Report Issue',
}: PackageSupportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSuccess = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        {showIcon && <HelpCircle className="h-4 w-4 mr-2" />}
        {buttonText}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Report Package Issue
            </DialogTitle>
          </DialogHeader>
          
          {/* Package Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Package Information</p>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <p>Tracking: <span className="font-mono">{pkg.tracking_number}</span></p>
                  <p>From: {pkg.sender_name}</p>
                  <p>Received: {new Date(pkg.created_at).toLocaleDateString()}</p>
                  {pkg.condition_notes && (
                    <p>Condition: {pkg.condition_notes}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <NewTicketFormWithPackage
            package={pkg}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}