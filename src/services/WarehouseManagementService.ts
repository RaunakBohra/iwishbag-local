/**
 * Warehouse Management Service - Operations & Staff Management
 * 
 * Handles warehouse operations, staff task management, and operational metrics.
 * Complements PackageForwardingService with warehouse-specific functionality.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WarehouseLocation {
  id: string;
  location_code: string;
  zone: string;
  shelf_number: number;
  slot_number: number;
  max_packages: number;
  current_packages: number;
  max_weight_kg: number;
  max_dimensions?: any;
  is_active: boolean;
  maintenance_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseTask {
  id: string;
  task_type: 'receiving' | 'consolidation' | 'shipping' | 'audit';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  description: string;
  instructions?: string;
  package_ids: string[];
  consolidation_group_id?: string;
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseDashboard {
  total_packages: number;
  packages_by_status: Record<string, number>;
  packages_by_zone: Record<string, number>;
  location_utilization: {
    total_locations: number;
    occupied_locations: number;
    utilization_percentage: number;
  };
  pending_tasks: {
    total: number;
    by_priority: Record<string, number>;
    by_type: Record<string, number>;
  };
  staff_performance: {
    total_staff: number;
    tasks_completed_today: number;
    average_completion_time: number;
  };
  storage_fees_pending: number;
  consolidation_requests: number;
}

export interface StaffPerformance {
  staff_id: string;
  staff_name?: string;
  tasks_completed: number;
  average_completion_time: number;
  tasks_pending: number;
  last_active: string;
  efficiency_score: number;
}

export interface LocationOptimization {
  recommended_location: string;
  zone: string;
  distance_score: number;
  capacity_score: number;
  overall_score: number;
  alternative_locations: string[];
}

export interface TaskAssignmentData {
  task_type: WarehouseTask['task_type'];
  priority: WarehouseTask['priority'];
  description: string;
  instructions?: string;
  package_ids?: string[];
  consolidation_group_id?: string;
  due_date?: Date;
  estimated_duration?: number; // minutes
}

// ============================================================================
// WAREHOUSE MANAGEMENT SERVICE
// ============================================================================

class WarehouseManagementService {
  private static instance: WarehouseManagementService;
  private dashboardCache: WarehouseDashboard | null = null;
  private locationsCache: WarehouseLocation[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    logger.info('🏭 WarehouseManagementService initialized');
  }

  static getInstance(): WarehouseManagementService {
    if (!WarehouseManagementService.instance) {
      WarehouseManagementService.instance = new WarehouseManagementService();
    }
    return WarehouseManagementService.instance;
  }

  // ============================================================================
  // WAREHOUSE LOCATION MANAGEMENT
  // ============================================================================

  /**
   * Get all warehouse locations with current status
   */
  async getWarehouseLocations(): Promise<WarehouseLocation[]> {
    if (this.locationsCache && this.isCacheValid()) {
      return this.locationsCache;
    }

    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('*')
        .order('zone')
        .order('shelf_number')
        .order('slot_number');

      if (error) {
        throw new Error(`Failed to fetch warehouse locations: ${error.message}`);
      }

      this.locationsCache = data || [];
      this.cacheTimestamp = Date.now();
      return this.locationsCache;

    } catch (error) {
      logger.error('❌ Failed to get warehouse locations:', error);
      throw error;
    }
  }

  /**
   * Get optimal storage location for a package
   */
  async getOptimalLocation(
    suiteNumber: string, 
    packageWeight: number = 0,
    packageDimensions?: any
  ): Promise<LocationOptimization> {
    try {
      // Determine preferred zone based on suite number
      const suiteNumberInt = parseInt(suiteNumber.replace('IWB', ''));
      let preferredZone: string;
      
      if (suiteNumberInt < 20000) {
        preferredZone = 'A';
      } else if (suiteNumberInt < 30000) {
        preferredZone = 'B';
      } else {
        preferredZone = 'C';
      }

      const locations = await this.getWarehouseLocations();
      const availableLocations = locations.filter(loc => 
        loc.is_active && 
        loc.current_packages < loc.max_packages &&
        loc.max_weight_kg >= packageWeight
      );

      if (availableLocations.length === 0) {
        throw new Error('No available storage locations');
      }

      // Score locations based on zone preference and capacity
      const scoredLocations = availableLocations.map(location => {
        const zoneScore = location.zone === preferredZone ? 100 : 
                         (location.zone === 'T' ? 10 : 50); // Temp zones are last resort
        
        const capacityScore = ((location.max_packages - location.current_packages) / location.max_packages) * 100;
        
        const overallScore = (zoneScore * 0.7) + (capacityScore * 0.3);

        return {
          location,
          zone_score: zoneScore,
          capacity_score: capacityScore,
          overall_score: overallScore
        };
      });

      // Sort by overall score (highest first)
      scoredLocations.sort((a, b) => b.overall_score - a.overall_score);

      const best = scoredLocations[0];
      const alternatives = scoredLocations.slice(1, 4).map(s => s.location.location_code);

      return {
        recommended_location: best.location.location_code,
        zone: best.location.zone,
        distance_score: best.zone_score,
        capacity_score: best.capacity_score,
        overall_score: best.overall_score,
        alternative_locations: alternatives
      };

    } catch (error) {
      logger.error('❌ Failed to get optimal location:', error);
      // Return fallback location
      return {
        recommended_location: 'TEMP001',
        zone: 'T',
        distance_score: 10,
        capacity_score: 50,
        overall_score: 30,
        alternative_locations: ['TEMP002']
      };
    }
  }

  /**
   * Update location capacity when packages are added/removed
   */
  async updateLocationCapacity(locationCode: string, change: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_location_capacity', {
        location_code: locationCode,
        capacity_change: change
      });

      if (error) {
        throw new Error(`Failed to update location capacity: ${error.message}`);
      }

      // Invalidate cache
      this.locationsCache = null;
      this.cacheTimestamp = 0;

      logger.info(`📦 Updated location ${locationCode} capacity by ${change}`);

    } catch (error) {
      logger.error('❌ Failed to update location capacity:', error);
      throw error;
    }
  }

  // ============================================================================
  // WAREHOUSE TASK MANAGEMENT
  // ============================================================================

  /**
   * Create a new warehouse task
   */
  async createTask(taskData: TaskAssignmentData): Promise<WarehouseTask> {
    const transaction = typeof Sentry?.startTransaction === 'function' 
      ? Sentry.startTransaction({
          name: 'WarehouseManagementService.createTask',
          op: 'task_creation',
        })
      : null;

    try {
      const { data: task, error } = await supabase
        .from('warehouse_tasks')
        .insert({
          task_type: taskData.task_type,
          priority: taskData.priority,
          description: taskData.description,
          instructions: taskData.instructions,
          package_ids: taskData.package_ids || [],
          consolidation_group_id: taskData.consolidation_group_id,
          due_date: taskData.due_date?.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create warehouse task: ${error.message}`);
      }

      // Auto-assign task to available staff based on workload
      if (taskData.priority === 'urgent' || taskData.priority === 'high') {
        await this.autoAssignTask(task.id);
      }

      logger.info(`📋 Created warehouse task: ${task.id} (${taskData.task_type})`);
      transaction?.setStatus('ok');
      return task;

    } catch (error) {
      logger.error('❌ Failed to create warehouse task:', error);
      Sentry.captureException(error);
      transaction?.setStatus('internal_error');
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Get warehouse tasks with filtering
   */
  async getTasks(filters?: {
    status?: string;
    assigned_to?: string;
    task_type?: string;
    priority?: string;
  }): Promise<WarehouseTask[]> {
    try {
      let query = supabase
        .from('warehouse_tasks')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.task_type) {
        query = query.eq('task_type', filters.task_type);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch warehouse tasks: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      logger.error('❌ Failed to get warehouse tasks:', error);
      throw error;
    }
  }

  /**
   * Assign task to staff member
   */
  async assignTask(taskId: string, staffId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('warehouse_tasks')
        .update({ 
          assigned_to: staffId,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to assign task: ${error.message}`);
      }

      logger.info(`👤 Assigned task ${taskId} to staff ${staffId}`);

    } catch (error) {
      logger.error('❌ Failed to assign task:', error);
      throw error;
    }
  }

  /**
   * Complete a warehouse task
   */
  async completeTask(taskId: string, completionNotes?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('warehouse_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to complete task: ${error.message}`);
      }

      logger.info(`✅ Completed warehouse task: ${taskId}`);

    } catch (error) {
      logger.error('❌ Failed to complete task:', error);
      throw error;
    }
  }

  /**
   * Auto-assign task to least busy available staff
   */
  private async autoAssignTask(taskId: string): Promise<void> {
    try {
      // Get staff workload (simplified - could be enhanced with real staff table)
      const { data: staffWorkload, error } = await supabase
        .from('warehouse_tasks')
        .select('assigned_to')
        .eq('status', 'pending')
        .not('assigned_to', 'is', null);

      if (error) {
        logger.warn('Could not get staff workload for auto-assignment:', error);
        return;
      }

      // Count tasks per staff member
      const workloadMap = new Map<string, number>();
      staffWorkload?.forEach(task => {
        if (task.assigned_to) {
          const current = workloadMap.get(task.assigned_to) || 0;
          workloadMap.set(task.assigned_to, current + 1);
        }
      });

      // For now, if there are staff with tasks, assign to least busy
      // In production, this would query an actual staff table
      if (workloadMap.size > 0) {
        const leastBusyStaff = Array.from(workloadMap.entries())
          .sort((a, b) => a[1] - b[1])[0][0];
        
        await this.assignTask(taskId, leastBusyStaff);
      }

    } catch (error) {
      logger.warn('Failed to auto-assign task:', error);
    }
  }

  // ============================================================================
  // WAREHOUSE DASHBOARD & ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive warehouse dashboard data
   */
  async getDashboardData(): Promise<WarehouseDashboard> {
    if (this.dashboardCache && this.isCacheValid()) {
      return this.dashboardCache;
    }

    try {
      // Get packages data
      const { data: packages, error: packagesError } = await supabase
        .from('received_packages')
        .select('status, storage_location, customer_addresses!inner(suite_number)');

      if (packagesError) {
        throw new Error(`Failed to fetch packages data: ${packagesError.message}`);
      }

      // Get tasks data
      const { data: tasks, error: tasksError } = await supabase
        .from('warehouse_tasks')
        .select('status, priority, task_type, assigned_to, completed_at, created_at');

      if (tasksError) {
        throw new Error(`Failed to fetch tasks data: ${tasksError.message}`);
      }

      // Get storage fees
      const { data: storageFees, error: feesError } = await supabase
        .from('storage_fees')
        .select('total_fee_usd')
        .eq('is_paid', false);

      if (feesError) {
        logger.warn('Could not fetch storage fees:', feesError);
      }

      // Get consolidation requests
      const { data: consolidations, error: consolidationError } = await supabase
        .from('consolidation_groups')
        .select('id')
        .eq('status', 'pending');

      if (consolidationError) {
        logger.warn('Could not fetch consolidation requests:', consolidationError);
      }

      // Process packages data
      const packagesData = packages || [];
      const packagesByStatus = packagesData.reduce((acc, pkg) => {
        acc[pkg.status] = (acc[pkg.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const packagesByZone = packagesData.reduce((acc, pkg) => {
        if (pkg.storage_location) {
          const zone = pkg.storage_location.charAt(0);
          acc[zone] = (acc[zone] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Process tasks data
      const tasksData = tasks || [];
      const pendingTasks = tasksData.filter(t => t.status === 'pending');
      const tasksByPriority = pendingTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tasksByType = pendingTasks.reduce((acc, task) => {
        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate staff performance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTasks = tasksData.filter(t => 
        t.status === 'completed' && 
        t.completed_at && 
        new Date(t.completed_at) >= today
      );

      const uniqueStaff = new Set(tasksData.map(t => t.assigned_to).filter(Boolean));

      // Calculate average completion time (simplified)
      const avgCompletionTime = todayTasks.length > 0 
        ? todayTasks.reduce((sum, task) => {
            if (task.completed_at && task.created_at) {
              const diff = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
              return sum + (diff / (1000 * 60)); // minutes
            }
            return sum;
          }, 0) / todayTasks.length
        : 0;

      // Get location utilization
      const locations = await this.getWarehouseLocations();
      const occupiedLocations = locations.filter(loc => loc.current_packages > 0).length;
      const utilizationPercentage = locations.length > 0 
        ? (occupiedLocations / locations.length) * 100 
        : 0;

      this.dashboardCache = {
        total_packages: packagesData.length,
        packages_by_status: packagesByStatus,
        packages_by_zone: packagesByZone,
        location_utilization: {
          total_locations: locations.length,
          occupied_locations: occupiedLocations,
          utilization_percentage: utilizationPercentage
        },
        pending_tasks: {
          total: pendingTasks.length,
          by_priority: tasksByPriority,
          by_type: tasksByType
        },
        staff_performance: {
          total_staff: uniqueStaff.size,
          tasks_completed_today: todayTasks.length,
          average_completion_time: avgCompletionTime
        },
        storage_fees_pending: storageFees?.reduce((sum, fee) => sum + (fee.total_fee_usd || 0), 0) || 0,
        consolidation_requests: consolidations?.length || 0
      };

      this.cacheTimestamp = Date.now();
      return this.dashboardCache;

    } catch (error) {
      logger.error('❌ Failed to get warehouse dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformance(startDate?: Date, endDate?: Date): Promise<StaffPerformance[]> {
    try {
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const end = endDate || new Date();

      const { data: tasks, error } = await supabase
        .from('warehouse_tasks')
        .select('assigned_to, status, completed_at, created_at')
        .not('assigned_to', 'is', null)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch staff performance data: ${error.message}`);
      }

      const taskData = tasks || [];
      const staffStats = new Map<string, {
        completed: number;
        pending: number;
        totalCompletionTime: number;
        completedTasks: number;
        lastActive: Date;
      }>();

      taskData.forEach(task => {
        if (!task.assigned_to) return;

        const staff = staffStats.get(task.assigned_to) || {
          completed: 0,
          pending: 0,
          totalCompletionTime: 0,
          completedTasks: 0,
          lastActive: new Date(task.created_at)
        };

        if (task.status === 'completed') {
          staff.completed++;
          if (task.completed_at && task.created_at) {
            const completionTime = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
            staff.totalCompletionTime += completionTime / (1000 * 60); // minutes
            staff.completedTasks++;
            staff.lastActive = new Date(task.completed_at);
          }
        } else if (task.status === 'pending' || task.status === 'in_progress') {
          staff.pending++;
        }

        staffStats.set(task.assigned_to, staff);
      });

      return Array.from(staffStats.entries()).map(([staffId, stats]) => {
        const avgCompletionTime = stats.completedTasks > 0 
          ? stats.totalCompletionTime / stats.completedTasks 
          : 0;

        // Simple efficiency score: completed tasks / (completed + pending), weighted by avg completion time
        const taskRatio = (stats.completed + stats.pending) > 0 
          ? stats.completed / (stats.completed + stats.pending) 
          : 0;
        
        const timeBonus = avgCompletionTime > 0 && avgCompletionTime < 120 ? 1.2 : 1.0; // Bonus for fast completion
        const efficiencyScore = taskRatio * timeBonus * 100;

        return {
          staff_id: staffId,
          tasks_completed: stats.completed,
          average_completion_time: avgCompletionTime,
          tasks_pending: stats.pending,
          last_active: stats.lastActive.toISOString(),
          efficiency_score: Math.min(100, efficiencyScore) // Cap at 100
        };
      }).sort((a, b) => b.efficiency_score - a.efficiency_score);

    } catch (error) {
      logger.error('❌ Failed to get staff performance:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.dashboardCache = null;
    this.locationsCache = null;
    this.cacheTimestamp = 0;
    logger.info('🗑️ Warehouse management cache cleared');
  }

  /**
   * Health check for warehouse operations
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: {
      pending_urgent_tasks: number;
      overloaded_locations: number;
      overdue_tasks: number;
    };
  }> {
    try {
      const [dashboard, locations] = await Promise.all([
        this.getDashboardData(),
        this.getWarehouseLocations()
      ]);

      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check for urgent pending tasks
      const urgentTasks = dashboard.pending_tasks.by_priority.urgent || 0;
      if (urgentTasks > 5) {
        issues.push(`${urgentTasks} urgent tasks pending`);
        status = 'critical';
      } else if (urgentTasks > 2) {
        issues.push(`${urgentTasks} urgent tasks pending`);
        status = status === 'healthy' ? 'warning' : status;
      }

      // Check for overloaded locations
      const overloadedLocations = locations.filter(loc => 
        loc.current_packages >= loc.max_packages * 0.9
      ).length;
      
      if (overloadedLocations > locations.length * 0.5) {
        issues.push(`${overloadedLocations} locations near capacity`);
        status = 'critical';
      } else if (overloadedLocations > locations.length * 0.3) {
        issues.push(`${overloadedLocations} locations near capacity`);
        status = status === 'healthy' ? 'warning' : status;
      }

      // Check for overdue tasks (simplified - would need due_date column)
      const totalPendingTasks = dashboard.pending_tasks.total;
      if (totalPendingTasks > 20) {
        issues.push(`${totalPendingTasks} tasks pending`);
        status = status === 'healthy' ? 'warning' : status;
      }

      return {
        status,
        issues,
        metrics: {
          pending_urgent_tasks: urgentTasks,
          overloaded_locations: overloadedLocations,
          overdue_tasks: 0 // Would need to implement with due_date tracking
        }
      };

    } catch (error) {
      logger.error('❌ Failed to get warehouse health status:', error);
      return {
        status: 'critical',
        issues: ['Failed to retrieve warehouse status'],
        metrics: {
          pending_urgent_tasks: 0,
          overloaded_locations: 0,
          overdue_tasks: 0
        }
      };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const warehouseManagementService = WarehouseManagementService.getInstance();
export default warehouseManagementService;