import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  UserPlus, 
  Edit3, 
  CheckCircle, 
  Save,
  X,
  Loader2
} from 'lucide-react';

interface ContactInformationProps {
  // State
  isGuestCheckout: boolean;
  contactStepCompleted: boolean;
  guestFlowChoice: 'guest' | 'member' | null;
  guestContact: { email: string };
  isEditingContact: boolean;
  editEmail: string;
  isSavingContact: boolean;
  
  // Handlers
  onContactStepCompletedChange: (completed: boolean) => void;
  onGuestFlowChoiceChange: (choice: 'guest' | 'member' | null) => void;
  onGuestContactChange: (contact: { email: string }) => void;
  onEditContactToggle: (editing: boolean) => void;
  onEditEmailChange: (email: string) => void;
  onShowAuthModal: () => void;
  onSaveContact: () => Promise<void>;
  onCancelEdit: () => void;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  isGuestCheckout,
  contactStepCompleted,
  guestFlowChoice,
  guestContact,
  isEditingContact,
  editEmail,
  isSavingContact,
  onContactStepCompletedChange,
  onGuestFlowChoiceChange,
  onGuestContactChange,
  onEditContactToggle,
  onEditEmailChange,
  onShowAuthModal,
  onSaveContact,
  onCancelEdit
}) => {
  if (!isGuestCheckout) return null;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
          <User className="h-4 w-4 text-gray-600" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Step Completed - Show Summary */}
        {contactStepCompleted ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {guestFlowChoice === 'guest'
                      ? 'Guest Checkout'
                      : 'Member Account'}
                  </p>
                  <p className="text-sm text-green-700">{guestContact.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onContactStepCompletedChange(false);
                  onGuestFlowChoiceChange(null);
                }}
                className="text-xs border-green-300 text-green-700 hover:bg-green-100"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Change
              </Button>
            </div>
          </div>
        ) : guestFlowChoice === null ? (
          /* Choice Screen - Guest vs Member */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How would you like to continue?
              </h3>
              <p className="text-gray-600">
                Choose the option that works best for you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Guest Option */}
              <div
                className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onGuestFlowChoiceChange('guest')}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-teal-200 transition-colors">
                    <Mail className="h-6 w-6 text-teal-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Guest</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Quick checkout with just your email
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 mb-4">
                    <li>✓ Fast checkout</li>
                    <li>✓ Email-only required</li>
                    <li>✓ No account needed</li>
                  </ul>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    Continue as Guest
                  </Button>
                </div>
              </div>

              {/* Member Option */}
              <div
                className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={onShowAuthModal}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                    <UserPlus className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Member</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in to track your orders
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 mb-4">
                    <li>✓ Order tracking</li>
                    <li>✓ Order history</li>
                    <li>✓ Saved addresses</li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Sign In / Sign Up
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : guestFlowChoice === 'guest' ? (
          /* Guest Email Form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="your.email@example.com"
                value={guestContact.email}
                onChange={(e) => onGuestContactChange({ email: e.target.value })}
                className="bg-white border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                required
              />
              <p className="text-xs text-gray-500">
                We'll send your order confirmation and updates to this email.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  if (guestContact.email) {
                    onContactStepCompletedChange(true);
                  }
                }}
                disabled={!guestContact.email}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => onGuestFlowChoiceChange(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back
              </Button>
            </div>
          </div>
        ) : null}

        {/* Edit Contact Form (for logged-in users editing guest quote) */}
        {isEditingContact && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <Label htmlFor="edit-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => onEditEmailChange(e.target.value)}
                placeholder="Enter email address"
                className="w-full"
              />
              <div className="flex gap-2">
                <Button
                  onClick={onSaveContact}
                  disabled={isSavingContact || !editEmail}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSavingContact ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isSavingContact}
                  size="sm"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};