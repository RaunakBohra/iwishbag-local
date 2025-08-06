import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AddressModal } from '@/components/checkout/AddressModal';
import { ProgressiveAuthModal } from '@/components/auth/ProgressiveAuthModal';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

interface ContactFormData {
  email: string;
  phone: string;
}

interface CheckoutModalsProps {
  // Address Modal
  showAddressModal: boolean;
  setShowAddressModal: (show: boolean) => void;
  onSaveAddress: (addressData: AddressFormData) => void;
  addressFormData: AddressFormData;
  shippingCountry: string;
  isGuestCheckout: boolean;
  addAddressLoading: boolean;

  // Auth Modal
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  guestContact: ContactFormData;
  guestQuoteId: string | null;
  onAuthSuccess: () => void;
  loadFromServer: (userId: string) => Promise<void>;
}

export const CheckoutModals: React.FC<CheckoutModalsProps> = ({
  showAddressModal,
  setShowAddressModal,
  onSaveAddress,
  addressFormData,
  shippingCountry,
  isGuestCheckout,
  addAddressLoading,
  showAuthModal,
  setShowAuthModal,
  guestContact,
  guestQuoteId,
  onAuthSuccess,
  loadFromServer
}) => {
  const navigate = useNavigate();

  const handleAuthSuccess = async () => {
    console.log('🎉 PROGRESSIVE AUTH MODAL - onSuccess called');
    
    setShowAuthModal(false);

    // Link guest quote to authenticated user before redirecting
    if (guestQuoteId) {
      try {
        console.log('🔗 Linking guest quote to authenticated user:', guestQuoteId);

        // Get the current authenticated user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (currentUser) {
          // Update the quote to belong to the authenticated user and add to cart
          const { error: linkError } = await supabase
            .from('quotes')
            .update({
              user_id: currentUser.id,
              is_anonymous: false,
              in_cart: true,
            })
            .eq('id', guestQuoteId);

          if (linkError) {
            console.error('❌ Failed to link quote to user:', linkError);
          } else {
            console.log('✅ Successfully linked quote to authenticated user and added to cart');

            // Reload cart from server to include the newly linked quote
            if (currentUser?.id) {
              console.log('🔄 Reloading cart after quote ownership transfer');
              await loadFromServer(currentUser.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error linking quote to user:', error);
      }

      console.log('🎉 AUTH SUCCESS - Redirecting with quote:', guestQuoteId);
      navigate(`/checkout?quotes=${guestQuoteId}`);
    } else {
      console.log('🎉 AUTH SUCCESS - Redirecting to regular checkout');
      navigate('/checkout');
    }

    onAuthSuccess();
  };

  return (
    <>
      {/* Address Modal */}
      <AddressModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onSave={onSaveAddress}
        initialData={{
          ...addressFormData,
          country: addressFormData.country || shippingCountry || '',
        }}
        isGuest={isGuestCheckout}
        isLoading={addAddressLoading}
      />

      {/* Auth Modal */}
      <Dialog
        open={showAuthModal}
        onOpenChange={(open) => {
          console.log('🔵 AUTH MODAL STATE CHANGE:', { open, showAuthModal });
          setShowAuthModal(open);
        }}
      >
        <DialogContent className="max-w-md">
          <ProgressiveAuthModal
            prefilledEmail={guestContact.email}
            onSuccess={handleAuthSuccess}
            onBack={() => setShowAuthModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};