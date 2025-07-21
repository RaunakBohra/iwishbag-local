import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PhoneCollectionState {
  showModal: boolean;
  isRequired: boolean;
  provider: string | null;
}

export const usePhoneCollection = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PhoneCollectionState>({
    showModal: false,
    isRequired: false,
    provider: null,
  });

  // Check if user needs to provide phone number
  const needsPhone = () => {
    if (!user) return false;
    
    // If user already has phone, no need to collect
    if (user.phone) return false;
    
    // Check if user signed up via Facebook (no phone from OAuth)
    const provider = user.app_metadata?.provider;
    return provider === 'facebook';
  };

  // Get provider info
  const getProviderInfo = () => {
    if (!user) return null;
    return user.app_metadata?.provider || null;
  };

  // Prompt user to add phone number
  const promptPhoneCollection = (required = false) => {
    if (needsPhone()) {
      setState({
        showModal: true,
        isRequired: required,
        provider: getProviderInfo(),
      });
      return true;
    }
    return false;
  };

  // Close the modal
  const closeModal = () => {
    setState(prev => ({ ...prev, showModal: false }));
  };

  // Check if phone collection was successful
  const onPhoneAdded = () => {
    closeModal();
    // Optionally refresh user data or trigger success callback
  };

  return {
    needsPhone: needsPhone(),
    showModal: state.showModal,
    isRequired: state.isRequired,
    provider: state.provider,
    promptPhoneCollection,
    closeModal,
    onPhoneAdded,
  };
};