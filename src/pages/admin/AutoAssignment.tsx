/**
 * Auto Assignment Admin Page
 * Page for managing automatic ticket assignment rules
 */

import { AutoAssignmentManager } from '@/components/admin/AutoAssignmentManager';

const AutoAssignmentPage = () => {
  return (
    <div className="w-full">
      <AutoAssignmentManager />
    </div>
  );
};

export default AutoAssignmentPage;
