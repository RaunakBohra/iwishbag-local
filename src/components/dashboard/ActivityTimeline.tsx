import React from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Mail,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/design-system';

export interface ActivityItem {
  id: string;
  type: 'quote' | 'order' | 'payment' | 'shipping' | 'message';
  title: string;
  description: string;
  date: string;
  status: string;
  link: string;
  image?: string;
  amount?: number;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  }[];
  metadata?: Record<string, any>;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
}

const ActivityEventCard: React.FC<{ activity: ActivityItem; index: number }> = ({
  activity,
  index,
}) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'quote':
        return <Package className="w-5 h-5 text-teal-600" />;
      case 'order':
        return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-blue-600" />;
      case 'shipping':
        return <Truck className="w-5 h-5 text-orange-600" />;
      case 'message':
        return <Mail className="w-5 h-5 text-purple-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'shipped':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group"
    >
      <Link to={activity.link}>
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                {getIcon()}
              </div>

              {/* Product image if available */}
              {activity.image && (
                <div className="flex-shrink-0">
                  <img
                    src={activity.image}
                    alt={activity.title}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1">
                      {activity.title}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {activity.description}
                    </p>
                  </div>

                  {/* Status badge */}
                  <Badge
                    className={cn('ml-2 text-xs font-medium', getStatusColor(activity.status))}
                  >
                    {activity.status}
                  </Badge>
                </div>

                {/* Metadata row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{new Date(activity.date).toLocaleDateString()}</span>
                    {activity.amount && (
                      <span className="font-medium text-green-600">
                        ${activity.amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {activity.actions && activity.actions.length > 0 && (
                    <div className="flex gap-2">
                      {activity.actions.slice(0, 2).map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            action.onClick();
                          }}
                          className="text-xs h-7"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  maxItems = 5,
  showViewAll = true,
  viewAllLink = '/dashboard/quotes',
}) => {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Recent Activity
          </CardTitle>
          {showViewAll && (
            <Link
              to={viewAllLink}
              className="text-teal-600 hover:text-teal-700 hover:underline text-sm font-medium flex items-center gap-1"
            >
              View All
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedActivities.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No recent activity yet.</p>
              <p className="text-gray-400 text-xs mt-1">Your quotes and orders will appear here.</p>
            </div>
          ) : (
            displayedActivities.map((activity, index) => (
              <ActivityEventCard key={activity.id} activity={activity} index={index} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
