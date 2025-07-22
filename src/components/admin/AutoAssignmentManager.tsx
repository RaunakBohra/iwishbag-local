/**
 * Auto Assignment Manager
 * Admin interface for managing automatic ticket assignment rules
 */

import { useState } from 'react';
import { 
  Settings, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Trash2,
  Edit,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAssignmentRules,
  useAssignmentStats,
  useToggleAssignmentRule,
  useDeleteAssignmentRule,
  useAutoAssignmentUtils,
} from '@/hooks/useAutoAssignment';
import { CreateAssignmentRuleDialog } from './CreateAssignmentRuleDialog';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'text-blue-600',
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
}: {
  title: string;
  value: number | string;
  icon: any;
  color?: string;
  bgColor?: string;
  borderColor?: string;
}) => (
  <Card className={`${bgColor} ${borderColor} border`}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </CardContent>
  </Card>
);

export const AutoAssignmentManager = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: rules = [], isLoading } = useAssignmentRules();
  const { data: stats } = useAssignmentStats();
  const toggleRuleMutation = useToggleAssignmentRule();
  const deleteRuleMutation = useDeleteAssignmentRule();
  const { getAssignmentMethodIcon, getAssignmentMethodLabel, formatCriteria } = useAutoAssignmentUtils();

  const handleToggleRule = (id: string, isActive: boolean) => {
    toggleRuleMutation.mutate({ id, isActive });
  };

  const handleDeleteRule = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the rule "${name}"? This action cannot be undone.`)) {
      deleteRuleMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Auto-Assignment Settings
          </h2>
          <p className="text-gray-600 text-sm">
            Manage automatic ticket assignment rules and monitor performance
          </p>
        </div>

        <CreateAssignmentRuleDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </CreateAssignmentRuleDialog>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Rules"
            value={stats.total_rules}
            icon={Settings}
            color="text-blue-600"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          />
          <StatCard
            title="Active Rules"
            value={stats.active_rules}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
          />
          <StatCard
            title="Total Assignments"
            value={stats.total_assignments}
            icon={Target}
            color="text-purple-600"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
          />
          <StatCard
            title="Today's Assignments"
            value={stats.assignments_today}
            icon={TrendingUp}
            color="text-orange-600"
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
          />
          <StatCard
            title="Unassigned Tickets"
            value={stats.unassigned_tickets}
            icon={AlertCircle}
            color={stats.unassigned_tickets > 0 ? "text-red-600" : "text-gray-600"}
            bgColor={stats.unassigned_tickets > 0 ? "bg-red-50" : "bg-gray-50"}
            borderColor={stats.unassigned_tickets > 0 ? "border-red-200" : "border-gray-200"}
          />
        </div>
      )}

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assignment rules</h3>
              <p className="text-gray-600 mb-4">
                Create your first assignment rule to automatically assign tickets to team members.
              </p>
              <CreateAssignmentRuleDialog 
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              </CreateAssignmentRuleDialog>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Assignees</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {rule.name}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getAssignmentMethodIcon(rule.assignment_method)}</span>
                          <span className="text-sm">{getAssignmentMethodLabel(rule.assignment_method)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatCriteria(rule.criteria)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{rule.eligible_user_ids.length}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {rule.assignment_count}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(isActive) => handleToggleRule(rule.id, isActive)}
                            disabled={toggleRuleMutation.isPending}
                          />
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(rule.updated_at), { addSuffix: true })}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            disabled={deleteRuleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};