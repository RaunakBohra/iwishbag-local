import { AdminMessageCenterComplete as AdminMessageCenter } from './AdminMessageCenterComplete';
import { CustomerMessageCenter } from './CustomerMessageCenter';
import { useAuth } from '@/contexts/AuthContext';

export const MessageCenter = () => {
  const { user } = useAuth();
  
  // All authenticated users get admin message center (simplified access)
  if (user) {
    return <AdminMessageCenter />;
  }
  
  return <CustomerMessageCenter />;
};
