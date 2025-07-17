import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

interface CustomerNotesSectionProps {
  customerId: string;
  notes: string | null;
  onUpdate: (userId: string, notes: string) => void;
  isUpdating: boolean;
}

export const CustomerNotesSection = ({
  customerId,
  notes,
  onUpdate,
  isUpdating,
}: CustomerNotesSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  const handleEditNotes = () => {
    setIsEditing(true);
    setNotesValue(notes || '');
  };

  const handleSaveNotes = () => {
    onUpdate(customerId, notesValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNotesValue('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">Internal Notes</p>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEditNotes}>
            Edit Notes
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add internal notes about this customer..."
            rows={3}
          />
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{notes || 'No internal notes.'}</p>
      )}
    </div>
  );
};
