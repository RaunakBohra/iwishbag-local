import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Zap
} from 'lucide-react';
import { Database } from '@/types/database';

type AutomationTask = Database['public']['Tables']['seller_order_automation']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'];
};

interface AutomationStatusIndicatorProps {
  automationTasks: AutomationTask[];
  onRetryTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onViewDetails?: (taskId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}

export const AutomationStatusIndicator: React.FC<AutomationStatusIndicatorProps> = ({
  automationTasks,
  onRetryTask,
  onPauseTask,
  onResumeTask,
  onViewDetails,
  showDetails = true,
  compact = false
}) => {
  const getStatusCounts = () => {
    const counts = {
      completed: 0,
      running: 0,
      failed: 0,
      paused: 0,
      queued: 0,
      total: automationTasks.length
    };

    automationTasks.forEach(task => {
      switch (task.automation_status) {
        case 'completed': counts.completed++; break;
        case 'running': 
        case 'in_progress': counts.running++; break;
        case 'failed':
        case 'error': counts.failed++; break;
        case 'paused': counts.paused++; break;
        case 'queued': 
        case 'pending': counts.queued++; break;
      }
    });

    return counts;
  };

  const counts = getStatusCounts();
  const completionPercentage = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'running':
      case 'in_progress': return RefreshCw;
      case 'failed':
      case 'error': return AlertTriangle;
      case 'paused': return Pause;
      case 'queued':
      case 'pending': return Clock;
      default: return Bot;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'running':
      case 'in_progress': return 'secondary';
      case 'failed':
      case 'error': return 'destructive';
      case 'paused': return 'outline';
      case 'queued':
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running':
      case 'in_progress': return 'text-blue-600';
      case 'failed':
      case 'error': return 'text-red-600';
      case 'paused': return 'text-yellow-600';
      case 'queued':
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-sm">Automation</span>
        </div>
        
        <Progress value={completionPercentage} className="flex-1 max-w-24" />
        
        <div className="flex items-center gap-1">
          {counts.completed > 0 && (
            <Badge variant="default" className="text-xs px-2 py-0">
              {counts.completed}✓
            </Badge>
          )}
          {counts.running > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {counts.running}⟳
            </Badge>
          )}
          {counts.failed > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-0">
              {counts.failed}⚠
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (automationTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No automation tasks configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Automation Status
          <Badge variant="outline" className="ml-2">
            {counts.completed}/{counts.total} completed
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{completionPercentage.toFixed(0)}% Complete</span>
            <span>
              {counts.running > 0 && `${counts.running} running`}
              {counts.failed > 0 && ` • ${counts.failed} failed`}
              {counts.queued > 0 && ` • ${counts.queued} queued`}
            </span>
          </div>
        </div>
      </CardHeader>
      
      {showDetails && (
        <CardContent>
          <div className="space-y-3">
            {automationTasks.map((task) => {
              const StatusIcon = getStatusIcon(task.automation_status || 'pending');
              
              return (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon 
                      className={`h-5 w-5 ${getStatusColor(task.automation_status || 'pending')} ${
                        task.automation_status === 'running' || task.automation_status === 'in_progress' 
                          ? 'animate-spin' 
                          : ''
                      }`} 
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {task.automation_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {task.seller_platform}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate">
                        {task.order_items?.product_name || 'Product Item'}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        {task.retry_count !== undefined && task.max_retries && (
                          <span>Retries: {task.retry_count}/{task.max_retries}</span>
                        )}
                        {task.execution_time_seconds && (
                          <span>Duration: {task.execution_time_seconds}s</span>
                        )}
                        {task.completed_at && (
                          <span>
                            Completed: {new Date(task.completed_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant={getStatusBadgeVariant(task.automation_status || 'pending')}>
                      {task.automation_status || 'pending'}
                    </Badge>
                    
                    <div className="flex gap-1">
                      {onViewDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onViewDetails(task.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {task.automation_status === 'failed' && onRetryTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onRetryTask(task.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {task.automation_status === 'running' && onPauseTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onPauseTask(task.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {task.automation_status === 'paused' && onResumeTask && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onResumeTask(task.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Messages */}
          {automationTasks.some(task => task.error_message) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Recent Errors
              </h5>
              <div className="space-y-1">
                {automationTasks
                  .filter(task => task.error_message)
                  .slice(0, 3)
                  .map(task => (
                    <p key={task.id} className="text-sm text-red-700">
                      <span className="font-medium">{task.seller_platform}:</span> {task.error_message}
                    </p>
                  ))
                }
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AutomationStatusIndicator;