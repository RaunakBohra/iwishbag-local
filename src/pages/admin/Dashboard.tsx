import { SystemStatus } from "@/components/admin/SystemStatus";

const AdminDashboard = () => {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      
      <SystemStatus />
      
      {/* Rest of your dashboard components */}
    </div>
  );
};

export default AdminDashboard; 