import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerEmailDialog } from './CustomerEmailDialog';
import { CustomerCodToggle } from './CustomerCodToggle';
import { CustomerNotesSection } from './CustomerNotesSection';
import { format } from 'date-fns';
import { Calendar, Mail, Shield, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Pencil, Loader2 } from 'lucide-react';

interface CustomerProfile {
  id: string;
  full_name: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  email: string;
  role?: 'admin' | 'user';
  role_id?: string;
}

interface CustomerCardProps {
  customer: CustomerProfile;
  onCodToggle: (userId: string, codEnabled: boolean) => void;
  onNotesUpdate: (userId: string, notes: string) => void;
  onNameUpdate: (userId: string, name: string) => void;
  isCodUpdating: boolean;
  isNotesUpdating: boolean;
  isNameUpdating: boolean;
  showRoleManagement?: boolean;
  onRemoveAdmin?: () => void;
  onRemoveUser?: () => void;
  isAdmin?: boolean;
  isCurrentUser?: boolean;
  onAssignAdmin?: (email: string) => void;
}

export const CustomerCard = ({
  customer,
  onCodToggle,
  onNotesUpdate,
  onNameUpdate,
  isCodUpdating,
  isNotesUpdating,
  isNameUpdating,
  showRoleManagement = false,
  onRemoveAdmin,
  onRemoveUser,
  isAdmin = false,
  isCurrentUser = false,
  onAssignAdmin,
}: CustomerCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(customer.full_name || '');

  const handleNameSave = () => {
    onNameUpdate(customer.id, editedName);
    setIsEditingName(false);
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 w-[200px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNameSave}
                    disabled={isNameUpdating}
                  >
                    {isNameUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(customer.full_name || '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {customer.full_name || 'Unnamed User'}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(true);
                      setEditedName(customer.full_name || '');
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{customer.email}</span>
              <CustomerEmailDialog
                customerEmail={customer.email}
                customerName={customer.full_name || undefined}
              />
            </div>
          </div>
          {showRoleManagement && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
              {isAdmin && onRemoveAdmin && !isCurrentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveAdmin}
                  className="text-destructive hover:text-destructive"
                  title="Remove Admin Role"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
              {!isAdmin && onAssignAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAssignAdmin(customer.email)}
                  title="Assign Admin Role"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
              {onRemoveUser && !isCurrentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveUser}
                  className="text-destructive hover:text-destructive"
                  title="Delete User"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomerCodToggle
          customerId={customer.id}
          codEnabled={customer.cod_enabled}
          onToggle={onCodToggle}
          isUpdating={isCodUpdating}
        />

        <CustomerNotesSection
          customerId={customer.id}
          notes={customer.internal_notes}
          onUpdate={onNotesUpdate}
          isUpdating={isNotesUpdating}
        />

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Member since {format(new Date(customer.created_at), 'MMM dd, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
};
