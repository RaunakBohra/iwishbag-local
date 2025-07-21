import React from 'react';
import { PhoneCollectionModal } from './PhoneCollectionModal';
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
    />
  );
};
