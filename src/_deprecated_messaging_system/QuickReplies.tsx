// =============================================
// Quick Replies Component
// =============================================
// Provides users with quick reply options and automated responses
// for common queries in the iwishBag communication hub.
// Created: 2025-07-24
// =============================================

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Search,
  Clock,
  HelpCircle,
  Package,
  CreditCard,
  RefreshCw,
  Send,
  MessageSquare,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/design-system';

interface QuickReply {
  id: string;
  title: string;
  description: string;
  message: string;
  category: 'general' | 'order' | 'payment' | 'support';
  tags: string[];
  icon: React.ComponentType<{ className?: string }>;
  popularity: number; // Higher number = more popular
}

interface QuickRepliesProps {
  onSelectReply?: (message: string) => void;
  className?: string;
}

// Predefined quick replies for common scenarios
const QUICK_REPLIES: QuickReply[] = [
  // General inquiries
  {
    id: 'general-hello',
    title: 'General Greeting',
    description: 'Start a conversation',
    message: 'Hello! I need assistance with my iwishBag account.',
    category: 'general',
    tags: ['greeting', 'hello', 'assistance'],
    icon: MessageSquare,
    popularity: 95,
  },
  {
    id: 'general-hours',
    title: 'Business Hours',
    description: 'Ask about support availability',
    message: 'What are your business hours? When can I expect a response?',
    category: 'general',
    tags: ['hours', 'support', 'availability'],
    icon: Clock,
    popularity: 80,
  },

  // Order-related
  {
    id: 'order-status',
    title: 'Order Status',
    description: 'Check order progress',
    message:
      'Can you please provide an update on my order status? My order number is [ORDER_NUMBER].',
    category: 'order',
    tags: ['order', 'status', 'update', 'tracking'],
    icon: Package,
    popularity: 90,
  },
  {
    id: 'order-shipping',
    title: 'Shipping Information',
    description: 'Ask about shipping details',
    message: 'I need information about shipping options and delivery times for my order.',
    category: 'order',
    tags: ['shipping', 'delivery', 'timeline'],
    icon: Package,
    popularity: 85,
  },
  {
    id: 'order-modify',
    title: 'Modify Order',
    description: 'Request order changes',
    message:
      'I would like to modify my order. Can you help me with this? Order number: [ORDER_NUMBER]',
    category: 'order',
    tags: ['modify', 'change', 'update'],
    icon: RefreshCw,
    popularity: 70,
  },

  // Payment-related
  {
    id: 'payment-issue',
    title: 'Payment Problem',
    description: 'Report payment issues',
    message: 'I am experiencing issues with my payment. Can you please help me resolve this?',
    category: 'payment',
    tags: ['payment', 'issue', 'problem', 'billing'],
    icon: CreditCard,
    popularity: 75,
  },
  {
    id: 'payment-refund',
    title: 'Refund Request',
    description: 'Request a refund',
    message: 'I would like to request a refund for my order. Order number: [ORDER_NUMBER]',
    category: 'payment',
    tags: ['refund', 'return', 'money back'],
    icon: CreditCard,
    popularity: 65,
  },

  // Support-related
  {
    id: 'support-account',
    title: 'Account Issues',
    description: 'Report account problems',
    message: 'I am having trouble accessing my account. Can you please assist me?',
    category: 'support',
    tags: ['account', 'login', 'access', 'password'],
    icon: HelpCircle,
    popularity: 60,
  },
  {
    id: 'support-technical',
    title: 'Technical Issue',
    description: 'Report technical problems',
    message:
      'I am experiencing technical difficulties with the website/app. Here are the details: [DESCRIBE_ISSUE]',
    category: 'support',
    tags: ['technical', 'bug', 'error', 'website'],
    icon: HelpCircle,
    popularity: 55,
  },
  {
    id: 'support-feedback',
    title: 'Feedback & Suggestions',
    description: 'Share feedback',
    message: 'I have some feedback and suggestions to improve the iwishBag experience.',
    category: 'support',
    tags: ['feedback', 'suggestion', 'improvement'],
    icon: Star,
    popularity: 40,
  },
];

// Utility function for getting category icons (for future use)
// const getCategoryIcon = (category: QuickReply['category']) => {
//   switch (category) {
//     case 'general':
//       return MessageSquare;
//     case 'order':
//       return Package;
//     case 'payment':
//       return CreditCard;
//     case 'support':
//       return HelpCircle;
//     default:
//       return MessageSquare;
//   }
// };

const getCategoryColor = (category: QuickReply['category']) => {
  switch (category) {
    case 'general':
      return 'bg-blue-100 text-blue-800';
    case 'order':
      return 'bg-green-100 text-green-800';
    case 'payment':
      return 'bg-orange-100 text-orange-800';
    case 'support':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const QuickReplies: React.FC<QuickRepliesProps> = ({ onSelectReply, className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter and sort replies based on search and category
  const filteredReplies = useMemo(() => {
    let replies = QUICK_REPLIES;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      replies = replies.filter(
        (reply) =>
          reply.title.toLowerCase().includes(search) ||
          reply.description.toLowerCase().includes(search) ||
          reply.tags.some((tag) => tag.toLowerCase().includes(search)),
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      replies = replies.filter((reply) => reply.category === selectedCategory);
    }

    // Sort by popularity
    return replies.sort((a, b) => b.popularity - a.popularity);
  }, [searchTerm, selectedCategory]);

  // Get unique categories for filter buttons
  const categories = useMemo(() => {
    const cats = Array.from(new Set(QUICK_REPLIES.map((reply) => reply.category)));
    return [
      { id: 'all', name: 'All', count: QUICK_REPLIES.length },
      ...cats.map((cat) => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: QUICK_REPLIES.filter((reply) => reply.category === cat).length,
      })),
    ];
  }, []);

  const handleReplySelect = (reply: QuickReply) => {
    if (onSelectReply) {
      onSelectReply(reply.message);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Quick Replies</span>
          <Badge variant="secondary" className="text-xs">
            {filteredReplies.length} available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quick replies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="text-xs"
            >
              <span>{category.name}</span>
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>

        <Separator />

        {/* Quick Reply Options */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredReplies.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No quick replies found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            filteredReplies.map((reply) => {
              const IconComponent = reply.icon;
              return (
                <div
                  key={reply.id}
                  className="group p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleReplySelect(reply)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <IconComponent className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {reply.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getCategoryColor(reply.category))}
                          >
                            {reply.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{reply.description}</p>
                        <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded italic">
                          "{reply.message.substring(0, 100)}
                          {reply.message.length > 100 ? '...' : ''}"
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplySelect(reply);
                      }}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-700 mb-1">How to use Quick Replies:</p>
              <ul className="space-y-1 text-blue-600">
                <li>• Click on any reply to use it as your message</li>
                <li>• Replace placeholders like [ORDER_NUMBER] with actual values</li>
                <li>• Use search to find specific topics quickly</li>
                <li>• Filter by category for relevant options</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickReplies;
