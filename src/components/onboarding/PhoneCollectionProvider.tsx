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
      description="We need your phone number for order updates and delivery coordination."
      showCountrySelection={true}
      showBenefits={true}
      useGradientStyling={false}
      skipOption={true}
    />
  );
};
