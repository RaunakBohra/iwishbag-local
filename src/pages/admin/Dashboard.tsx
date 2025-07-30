import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminDashboard = () => {
  return (
    <div className="container py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Dashboard is loading...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;