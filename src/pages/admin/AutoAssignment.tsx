/**
 * Auto Assignment Admin Page
 * Page for managing automatic ticket assignment rules
 */

import { AutoAssignmentManager } from '@/components/admin/AutoAssignmentManager';

const AutoAssignmentPage = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <AutoAssignmentManager />
    </div>
  );
};

export default AutoAssignmentPage;
