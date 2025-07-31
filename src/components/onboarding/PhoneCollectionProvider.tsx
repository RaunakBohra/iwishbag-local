import React from 'react';
import { PhoneCollectionModal } from '@/components/auth/PhoneCollectionModal';
import { usePhoneCollection } from '@/hooks/usePhoneCollection';

export const PhoneCollectionProvider: React.FC = () => {
  const { needsPhoneCollection, isLoading, markPhoneCollected, skipPhoneCollection } =
    usePhoneCollection();

  if (isLoading) {
    return null;
  }

  return (
    <PhoneCollectionModal
      isOpen={needsPhoneCollection}
      onClose={skipPhoneCollection}
      onComplete={markPhoneCollected}
      title="Complete Your Profile"
      description="Add your phone number to unlock these benefits:"
      benefits={[
        "Real-time SMS updates for your orders",
        "Direct coordination with delivery partners",
        "Enhanced account security (2FA coming soon)",
        "Priority customer support via WhatsApp",
        "Exclusive deals and early access notifications"
      ]}
      showCountrySelection={true}
      showBenefits={true}
      useGradientStyling={true}
      skipOption={{
        text: "I'll add it later",
        subtext: "You can always add your phone number from your profile settings"
      }}
    />
  );
};
