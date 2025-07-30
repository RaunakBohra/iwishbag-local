import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ContactRedirect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to My Tickets if authenticated, otherwise to Help
    if (user) {
      navigate('/support/my-tickets', { replace: true });
    } else {
      navigate('/help', { replace: true });
    }
  }, [user, navigate]);

  return null;
};