import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import { FileText, Save } from 'lucide-react';

interface QuoteOperationalDataProps {
  quote: AdminQuoteDetails;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  isUpdating: boolean;
}

export const QuoteOperationalData: React.FC<QuoteOperationalDataProps> = ({
  quote,
  onUpdate,
  isUpdating
}) => {
  const [adminNotes, setAdminNotes] = React.useState(quote.admin_notes || '');
  const [internalNotes, setInternalNotes] = React.useState(quote.internal_notes || '');
  const [hasChanges, setHasChanges] = React.useState(false);

  const handleSave = async () => {
    await onUpdate({
      admin_notes: adminNotes,
      internal_notes: internalNotes
    });
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notes & Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="admin-notes">Admin Notes</Label>
          <Textarea
            id="admin-notes"
            value={adminNotes}
            onChange={(e) => {
              setAdminNotes(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Notes visible to other admins..."
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="internal-notes">Internal Notes</Label>
          <Textarea
            id="internal-notes"
            value={internalNotes}
            onChange={(e) => {
              setInternalNotes(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Private internal notes..."
            className="mt-1 min-h-[80px]"
          />
        </div>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Notes
          </Button>
        )}
      </CardContent>
    </Card>
  );
};