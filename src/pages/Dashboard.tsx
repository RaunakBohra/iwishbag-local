import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, CheckCircle, Mail, Plus, Search, HelpCircle } from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const Dashboard = () => {
  const {
    user,
    quotes,
    orders,
    isLoading,
    isError,
  } = useDashboardState();

  // Metrics
  const activeQuotes = quotes?.filter(q => q.status === 'pending' || q.status === 'sent' || q.status === 'calculated').length || 0;
  const approvedQuotes = quotes?.filter(q => q.approval_status === 'approved').length || 0;
  const ordersInProgress = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
  const deliveredOrders = orders?.filter(o => o.status === 'completed').length || 0;
  const unreadMessages = 0; // TODO: Connect to real unread messages count

  // Recent activity (quotes and orders, most recent 5)
  const recentActivity = [
    ...(quotes?.slice(0, 3).map(q => ({
      type: 'quote',
      text: `Quote #${q.display_id || q.id} - ${q.status}`,
      link: `/dashboard/quotes/${q.id}`,
      icon: <Package className="h-4 w-4 text-blue-600" />,
      date: q.created_at,
    })) || []),
    ...(orders?.slice(0, 2).map(o => ({
      type: 'order',
      text: `Order #${o.display_id || o.id} - ${o.status}`,
      link: `/dashboard/orders/${o.id}`,
      icon: <ShoppingCart className="h-4 w-4 text-green-600" />,
      date: o.created_at,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Quick Actions
  const quickActions = [
    { label: 'Request Quote', icon: <Plus className="h-5 w-5" />, to: '/quote', variant: 'primary' },
    { label: 'View All Quotes', icon: <Package className="h-5 w-5" />, to: '/dashboard/quotes', variant: 'outline' },
    { label: 'My Orders', icon: <ShoppingCart className="h-5 w-5" />, to: '/dashboard/orders', variant: 'outline' },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8 sm:py-12">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Welcome back, {user?.user_metadata?.full_name || user?.email || 'Customer'}!</h1>
        <p className="text-gray-500 text-sm">Here's a summary of your account activity.</p>
      </div>

      {/* Metric Cards - Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Link 
          to="/dashboard/quotes" 
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group"
        >
          <Package className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-2xl font-bold text-gray-900">{activeQuotes}</div>
          <div className="text-xs text-gray-500 mt-1">Active Quotes</div>
        </Link>
        <Link 
          to="/dashboard/quotes" 
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group"
        >
          <CheckCircle className="h-6 w-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-2xl font-bold text-gray-900">{approvedQuotes}</div>
          <div className="text-xs text-gray-500 mt-1">Approved Quotes</div>
        </Link>
        <Link 
          to="/dashboard/orders" 
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group"
        >
          <ShoppingCart className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-2xl font-bold text-gray-900">{ordersInProgress}</div>
          <div className="text-xs text-gray-500 mt-1">Orders in Progress</div>
        </Link>
        <Link 
          to="/dashboard/orders" 
          className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group"
        >
          <CheckCircle className="h-6 w-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-2xl font-bold text-gray-900">{deliveredOrders}</div>
          <div className="text-xs text-gray-500 mt-1">Delivered Orders</div>
        </Link>
      </div>

      {/* Quick Actions - Improved Mobile Layout */}
      <div className="mb-8">
        {/* Primary Action - Full Width on Mobile */}
        <div className="mb-4">
          <Link
            to="/quote"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium shadow-sm transition text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Request Quote
          </Link>
        </div>
        
        {/* Secondary Actions - Grid Layout */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
          {quickActions.slice(1).map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-center"
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.label.split(' ').pop()}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link to="/dashboard/quotes" className="text-blue-600 hover:underline text-sm font-medium">View All</Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {recentActivity.length === 0 && <li className="text-gray-400 text-sm py-3">No recent activity yet.</li>}
          {recentActivity.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 py-3">
              {item.icon}
              <Link to={item.link} className="text-gray-800 hover:text-blue-600 text-sm font-medium">
                {item.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Support/Contact Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Need help?</h3>
        <p className="text-gray-600 mb-2">Contact us at <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a> or chat with us.</p>
        <Link to="/support" className="inline-block mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow hover:bg-blue-700 transition">Contact Support</Link>
      </div>
    </div>
  );
};

export default Dashboard;
