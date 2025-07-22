/**
 * Auto Assignment Service
 * Manages automatic ticket assignment rules and operations
 */

import { supabase } from '@/integrations/supabase/client';

export interface AutoAssignmentRule {
  id: string;
  name: string;
  is_active: boolean;
  assignment_method: 'round_robin' | 'least_assigned' | 'random';
  criteria: Record<string, string[]>; // e.g., { priority: ['high', 'urgent'], category: ['payment'] }
  eligible_user_ids: string[];
  last_assigned_user_id?: string | null;
  assignment_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentStats {
  total_rules: number;
  active_rules: number;
  total_assignments: number;
  assignments_today: number;
  unassigned_tickets: number;
}

export class AutoAssignmentService {
  private static instance: AutoAssignmentService;

  private constructor() {}

  static getInstance(): AutoAssignmentService {
    if (!AutoAssignmentService.instance) {
      AutoAssignmentService.instance = new AutoAssignmentService();
    }
    return AutoAssignmentService.instance;
  }

  /**
   * Get all auto-assignment rules
   */
  async getAssignmentRules(): Promise<AutoAssignmentRule[]> {
    try {
      const { data, error } = await supabase
        .from('auto_assignment_rules')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching assignment rules:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching assignment rules:', error);
      return [];
    }
  }

  /**
   * Get active assignment rules
   */
  async getActiveRules(): Promise<AutoAssignmentRule[]> {
    try {
      const { data, error } = await supabase
        .from('auto_assignment_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching active rules:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching active rules:', error);
      return [];
    }
  }

  /**
   * Create a new assignment rule
   */
  async createAssignmentRule(rule: Omit<AutoAssignmentRule, 'id' | 'created_at' | 'updated_at' | 'assignment_count' | 'last_assigned_user_id'>): Promise<AutoAssignmentRule | null> {
    try {
      const { data, error } = await supabase
        .from('auto_assignment_rules')
        .insert([rule])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating assignment rule:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception creating assignment rule:', error);
      return null;
    }
  }

  /**
   * Update an assignment rule
   */
  async updateAssignmentRule(id: string, updates: Partial<AutoAssignmentRule>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auto_assignment_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating assignment rule:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception updating assignment rule:', error);
      return false;
    }
  }

  /**
   * Delete an assignment rule
   */
  async deleteAssignmentRule(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('auto_assignment_rules')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting assignment rule:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception deleting assignment rule:', error);
      return false;
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(id: string, isActive: boolean): Promise<boolean> {
    return this.updateAssignmentRule(id, { is_active: isActive });
  }

  /**
   * Manually trigger auto-assignment for a ticket
   */
  async assignTicket(ticketId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('auto_assign_ticket', {
        ticket_id: ticketId
      });

      if (error) {
        console.error('❌ Error auto-assigning ticket:', error);
        return null;
      }

      return data; // Returns assigned user ID or null
    } catch (error) {
      console.error('❌ Exception auto-assigning ticket:', error);
      return null;
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(): Promise<AssignmentStats> {
    try {
      const [rulesResult, ticketsResult] = await Promise.all([
        // Get rules stats
        supabase
          .from('auto_assignment_rules')
          .select('id, is_active, assignment_count'),
        
        // Get unassigned tickets count
        supabase
          .from('support_tickets')
          .select('id, created_at')
          .is('assigned_to', null)
          .not('status', 'in', '(resolved,closed)')
      ]);

      const rules = rulesResult.data || [];
      const unassignedTickets = ticketsResult.data || [];

      // Calculate assignments today
      const today = new Date().toDateString();
      const assignmentsToday = await supabase
        .from('support_tickets')
        .select('id')
        .not('assigned_to', 'is', null)
        .gte('created_at', new Date(today).toISOString());

      return {
        total_rules: rules.length,
        active_rules: rules.filter(r => r.is_active).length,
        total_assignments: rules.reduce((sum, r) => sum + (r.assignment_count || 0), 0),
        assignments_today: assignmentsToday.data?.length || 0,
        unassigned_tickets: unassignedTickets.length,
      };
    } catch (error) {
      console.error('❌ Exception getting assignment stats:', error);
      return {
        total_rules: 0,
        active_rules: 0,
        total_assignments: 0,
        assignments_today: 0,
        unassigned_tickets: 0,
      };
    }
  }

  /**
   * Get eligible users for assignment (admins and moderators)
   */
  async getEligibleUsers(): Promise<{ id: string; full_name: string; email: string; role: string }[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles!inner (
            role
          )
        `)
        .in('user_roles.role', ['admin', 'moderator'])
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching eligible users:', error);
        return [];
      }

      return (data || []).map(user => ({
        id: user.id,
        full_name: user.full_name || user.email,
        email: user.email,
        role: user.user_roles[0]?.role || 'user'
      }));
    } catch (error) {
      console.error('❌ Exception fetching eligible users:', error);
      return [];
    }
  }

  /**
   * Test assignment rule against sample data
   */
  testAssignmentRule(rule: AutoAssignmentRule, ticket: { priority: string; category: string }): boolean {
    // Check priority criteria
    if (rule.criteria.priority && rule.criteria.priority.length > 0) {
      if (!rule.criteria.priority.includes(ticket.priority)) {
        return false;
      }
    }

    // Check category criteria
    if (rule.criteria.category && rule.criteria.category.length > 0) {
      if (!rule.criteria.category.includes(ticket.category)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get assignment method display name
   */
  getAssignmentMethodLabel(method: string): string {
    switch (method) {
      case 'round_robin':
        return 'Round Robin';
      case 'least_assigned':
        return 'Least Assigned';
      case 'random':
        return 'Random';
      default:
        return 'Unknown';
    }
  }
}

// Export singleton instance
export const autoAssignmentService = AutoAssignmentService.getInstance();