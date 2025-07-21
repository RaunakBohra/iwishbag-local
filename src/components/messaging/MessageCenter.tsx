import { useAdminRole } from '@/hooks/useAdminRole';
import { AdminMessageCenterComplete as AdminMessageCenter } from './AdminMessageCenterComplete';
import { CustomerMessageCenter } from './CustomerMessageCenter';

export const MessageCenter = () => {
  const { data: hasAdminRole } = useAdminRole();

  if (hasAdminRole === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  if (hasAdminRole) {
    return <AdminMessageCenter />;
  }

  return <CustomerMessageCenter />;
};
