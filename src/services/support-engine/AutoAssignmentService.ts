/**
 * Auto Assignment Service
 * Handles intelligent ticket routing and load balancing for support team
 * Decomposed from UnifiedSupportEngine for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { TicketPriority, TicketCategory, SupportRecord } from './SupportTicketService';

export interface AssignmentData {
  rule_name: string;
  conditions: {
    category?: TicketCategory[];
    priority?: TicketPriority[];
    keywords?: string[];
    business_hours_only?: boolean;
    customer_tier?: string[];
    language?: string[];
  };
  assignment: {
    assignee_id?: string;
    team?: string;
    skill_requirements?: string[];
  };
  is_active: boolean;
  priority: number; // Higher number = higher priority
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  skills: string[];
  languages: string[];
  max_concurrent_tickets: number;
  current_ticket_count: number;
  workload_score: number;
  is_available: boolean;
  business_hours: {
    timezone: string;
    schedule: Record<string, { start: string; end: string; }>; // day -> hours
  };
  specializations: TicketCategory[];
  priority_handling: TicketPriority[];
}

export interface AssignmentResult {
  success: boolean;
  assignee_id?: string;
  assignee_name?: string;
  rule_used?: string;
  reason?: string;
  fallback_used?: boolean;
}

export interface WorkloadDistribution {
  agent_id: string;
  agent_name: string;
  current_tickets: number;
  max_tickets: number;
  utilization_percentage: number;
  workload_score: number;
  last_assignment: string;
}

export class AutoAssignmentService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

  // Business hours in UTC (can be configured per region)
  private readonly BUSINESS_HOURS = {
    start: 9, // 9 AM
    end: 18,  // 6 PM
    timezone: 'UTC',
    workdays: [1, 2, 3, 4, 5], // Monday to Friday
  };

  constructor() {
    logger.info('AutoAssignmentService initialized');
  }

  /**
   * Automatically assign a ticket based on rules and availability
   */
  async assignTicket(ticket: SupportRecord): Promise<AssignmentResult> {
    try {
      logger.info('Starting auto assignment for ticket:', ticket.id);

      // Get assignment rules
      const rules = await this.getActiveAssignmentRules();
      if (rules.length === 0) {
        return await this.fallbackAssignment(ticket, 'No assignment rules found');
      }

      // Find matching rule
      const matchingRule = await this.findMatchingRule(ticket, rules);
      if (!matchingRule) {
        return await this.fallbackAssignment(ticket, 'No matching rule found');
      }

      // Get available agents
      const availableAgents = await this.getAvailableAgents(matchingRule);
      if (availableAgents.length === 0) {
        return await this.fallbackAssignment(ticket, 'No available agents');
      }

      // Select best agent
      const selectedAgent = this.selectBestAgent(availableAgents, ticket);
      if (!selectedAgent) {
        return await this.fallbackAssignment(ticket, 'Agent selection failed');
      }

      // Perform assignment
      const success = await this.performAssignment(ticket.id, selectedAgent.id, matchingRule.rule_name);
      if (!success) {
        return await this.fallbackAssignment(ticket, 'Assignment operation failed');
      }

      logger.info('Ticket assigned successfully:', {
        ticketId: ticket.id,
        assigneeId: selectedAgent.id,
        assigneeName: selectedAgent.name,
        rule: matchingRule.rule_name
      });

      return {
        success: true,
        assignee_id: selectedAgent.id,
        assignee_name: selectedAgent.name,
        rule_used: matchingRule.rule_name,
        reason: 'Automatic assignment based on rules',
        fallback_used: false,
      };

    } catch (error) {
      logger.error('Auto assignment error:', error);
      Sentry.captureException(error);
      return await this.fallbackAssignment(ticket, `Assignment error: ${error}`);
    }
  }

  /**
   * Manual ticket assignment with validation
   */
  async assignTicketManually(
    ticketId: string,
    assigneeId: string,
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // Validate assignee availability
      const agent = await this.getAgentById(assigneeId);
      if (!agent) {
        return {
          success: false,
          reason: 'Agent not found',
        };
      }

      if (!agent.is_available) {
        return {
          success: false,
          reason: 'Agent is not available',
        };
      }

      if (agent.current_ticket_count >= agent.max_concurrent_tickets) {
        return {
          success: false,
          reason: 'Agent has reached maximum ticket capacity',
        };
      }

      const success = await this.performAssignment(ticketId, assigneeId, 'manual_assignment', reason);
      
      if (success) {
        logger.info('Manual assignment successful:', { ticketId, assigneeId, reason });
        return {
          success: true,
          assignee_id: assigneeId,
          assignee_name: agent.name,
          reason: reason || 'Manual assignment',
        };
      } else {
        return {
          success: false,
          reason: 'Assignment operation failed',
        };
      }

    } catch (error) {
      logger.error('Manual assignment error:', error);
      return {
        success: false,
        reason: `Assignment error: ${error}`,
      };
    }
  }

  /**
   * Get available agents based on assignment rule
   */
  private async getAvailableAgents(rule: AssignmentData): Promise<SupportAgent[]> {
    try {
      const cacheKey = this.getCacheKey('agents', { rule_id: rule.rule_name });
      const cached = this.getFromCache<SupportAgent[]>(cacheKey);
      if (cached) return cached;

      // Get all agents (in real app, this would be from database)
      const agents = await this.getAllAgents();
      
      // Filter by availability
      let availableAgents = agents.filter(agent => {
        // Check basic availability
        if (!agent.is_available) return false;
        if (agent.current_ticket_count >= agent.max_concurrent_tickets) return false;

        // Check business hours requirement
        if (rule.conditions.business_hours_only && !this.isBusinessHours()) {
          return false;
        }

        // Check specializations
        if (rule.conditions.category?.length) {
          const hasSpecialization = rule.conditions.category.some(cat => 
            agent.specializations.includes(cat)
          );
          if (!hasSpecialization) return false;
        }

        // Check skill requirements
        if (rule.assignment.skill_requirements?.length) {
          const hasRequiredSkills = rule.assignment.skill_requirements.every(skill =>
            agent.skills.includes(skill)
          );
          if (!hasRequiredSkills) return false;
        }

        // Check team assignment
        if (rule.assignment.team && !this.isAgentInTeam(agent.id, rule.assignment.team)) {
          return false;
        }

        return true;
      });

      // Specific assignee override
      if (rule.assignment.assignee_id) {
        const specificAgent = availableAgents.find(agent => agent.id === rule.assignment.assignee_id);
        availableAgents = specificAgent ? [specificAgent] : [];
      }

      this.setCache(cacheKey, availableAgents);
      return availableAgents;

    } catch (error) {
      logger.error('Failed to get available agents:', error);
      return [];
    }
  }

  /**
   * Select the best agent from available options
   */
  private selectBestAgent(agents: SupportAgent[], ticket: SupportRecord): SupportAgent | null {
    if (agents.length === 0) return null;
    if (agents.length === 1) return agents[0];

    // Calculate scores for each agent
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, ticket),
    }));

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0].agent;
  }

  /**
   * Calculate agent suitability score
   */
  private calculateAgentScore(agent: SupportAgent, ticket: SupportRecord): number {
    let score = 100; // Base score

    const ticketData = ticket.ticket_data;
    if (!ticketData) return score;

    // Workload factor (lower current tickets = higher score)
    const utilizationPenalty = (agent.current_ticket_count / agent.max_concurrent_tickets) * 30;
    score -= utilizationPenalty;

    // Specialization bonus
    if (agent.specializations.includes(ticketData.category)) {
      score += 20;
    }

    // Priority handling bonus
    if (agent.priority_handling.includes(ticketData.priority)) {
      score += 15;
    }

    // Skill match bonus (if keywords in ticket match agent skills)
    const ticketText = `${ticketData.subject} ${ticketData.description}`.toLowerCase();
    const skillMatches = agent.skills.filter(skill => 
      ticketText.includes(skill.toLowerCase())
    ).length;
    score += skillMatches * 5;

    // Recent assignment penalty (avoid overloading recently assigned agents)
    // This would check last assignment timestamp in real implementation
    // score -= recentAssignmentPenalty;

    return Math.max(0, score); // Ensure non-negative score
  }

  /**
   * Find matching assignment rule for ticket
   */
  private async findMatchingRule(ticket: SupportRecord, rules: AssignmentData[]): Promise<AssignmentData | null> {
    try {
      const ticketData = ticket.ticket_data;
      if (!ticketData) return null;

      // Sort rules by priority (highest first)
      const sortedRules = rules.sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        if (await this.ruleMatches(rule, ticket)) {
          return rule;
        }
      }

      return null;

    } catch (error) {
      logger.error('Rule matching error:', error);
      return null;
    }
  }

  /**
   * Check if rule matches ticket
   */
  private async ruleMatches(rule: AssignmentData, ticket: SupportRecord): Promise<boolean> {
    try {
      const ticketData = ticket.ticket_data;
      if (!ticketData) return false;

      const conditions = rule.conditions;

      // Check category
      if (conditions.category?.length && !conditions.category.includes(ticketData.category)) {
        return false;
      }

      // Check priority
      if (conditions.priority?.length && !conditions.priority.includes(ticketData.priority)) {
        return false;
      }

      // Check keywords
      if (conditions.keywords?.length) {
        const ticketText = `${ticketData.subject} ${ticketData.description}`.toLowerCase();
        const hasKeyword = conditions.keywords.some(keyword => 
          ticketText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Check business hours
      if (conditions.business_hours_only && !this.isBusinessHours()) {
        return false;
      }

      // Check customer tier (would need customer data)
      if (conditions.customer_tier?.length) {
        const customerTier = await this.getCustomerTier(ticket.user_id);
        if (!conditions.customer_tier.includes(customerTier)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      logger.error('Rule matching check error:', error);
      return false;
    }
  }

  /**
   * Perform the actual assignment
   */
  private async performAssignment(
    ticketId: string,
    assigneeId: string,
    ruleName: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Update ticket with assignment
      const { error } = await supabase
        .from('support_system')
        .update({
          ticket_data: {
            assigned_to: assigneeId,
            metadata: {
              assignment_rule: ruleName,
              assignment_reason: reason,
              assigned_at: new Date().toISOString(),
            }
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        logger.error('Assignment update failed:', error);
        return false;
      }

      // Update agent workload
      await this.updateAgentWorkload(assigneeId, 1);

      // Log assignment activity
      await this.logAssignmentActivity(ticketId, assigneeId, ruleName, reason);

      // Clear caches
      this.clearCache('agents');
      this.clearCache('workload');

      return true;

    } catch (error) {
      logger.error('Assignment operation failed:', error);
      return false;
    }
  }

  /**
   * Fallback assignment when auto assignment fails
   */
  private async fallbackAssignment(ticket: SupportRecord, reason: string): Promise<AssignmentResult> {
    try {
      logger.info('Using fallback assignment:', { ticketId: ticket.id, reason });

      // Get least loaded available agent
      const agents = await this.getAllAgents();
      const availableAgents = agents.filter(agent => 
        agent.is_available && agent.current_ticket_count < agent.max_concurrent_tickets
      );

      if (availableAgents.length === 0) {
        // No agents available - leave unassigned
        return {
          success: false,
          reason: 'No agents available for fallback assignment',
        };
      }

      // Select agent with lowest current workload
      const leastLoadedAgent = availableAgents.reduce((min, agent) => 
        agent.current_ticket_count < min.current_ticket_count ? agent : min
      );

      const success = await this.performAssignment(
        ticket.id,
        leastLoadedAgent.id,
        'fallback_assignment',
        reason
      );

      if (success) {
        return {
          success: true,
          assignee_id: leastLoadedAgent.id,
          assignee_name: leastLoadedAgent.name,
          rule_used: 'fallback_assignment',
          reason: `Fallback assignment: ${reason}`,
          fallback_used: true,
        };
      } else {
        return {
          success: false,
          reason: 'Fallback assignment failed',
        };
      }

    } catch (error) {
      logger.error('Fallback assignment error:', error);
      return {
        success: false,
        reason: `Fallback assignment error: ${error}`,
      };
    }
  }

  /**
   * Get workload distribution across agents
   */
  async getWorkloadDistribution(): Promise<WorkloadDistribution[]> {
    try {
      const cacheKey = this.getCacheKey('workload', {});
      const cached = this.getFromCache<WorkloadDistribution[]>(cacheKey);
      if (cached) return cached;

      const agents = await this.getAllAgents();
      
      const distribution = agents.map(agent => ({
        agent_id: agent.id,
        agent_name: agent.name,
        current_tickets: agent.current_ticket_count,
        max_tickets: agent.max_concurrent_tickets,
        utilization_percentage: Math.round((agent.current_ticket_count / agent.max_concurrent_tickets) * 100),
        workload_score: agent.workload_score,
        last_assignment: '2024-01-01T00:00:00Z', // Would be from database
      }));

      this.setCache(cacheKey, distribution);
      return distribution;

    } catch (error) {
      logger.error('Failed to get workload distribution:', error);
      return [];
    }
  }

  /**
   * Rebalance tickets across agents
   */
  async rebalanceWorkload(): Promise<{ moved: number; errors: string[] }> {
    try {
      logger.info('Starting workload rebalancing');

      const distribution = await this.getWorkloadDistribution();
      const overloadedAgents = distribution.filter(d => d.utilization_percentage > 80);
      const underloadedAgents = distribution.filter(d => d.utilization_percentage < 50);

      let movedTickets = 0;
      const errors: string[] = [];

      for (const overloaded of overloadedAgents) {
        if (underloadedAgents.length === 0) break;

        // Get tickets that can be reassigned
        const reassignableTickets = await this.getReassignableTickets(overloaded.agent_id);
        
        for (const ticket of reassignableTickets) {
          if (underloadedAgents.length === 0) break;

          const targetAgent = underloadedAgents[0];
          const success = await this.performAssignment(
            ticket.id,
            targetAgent.agent_id,
            'workload_rebalance',
            'Automatic workload rebalancing'
          );

          if (success) {
            movedTickets++;
            targetAgent.current_tickets++;
            targetAgent.utilization_percentage = Math.round((targetAgent.current_tickets / targetAgent.max_tickets) * 100);
            
            // Remove from underloaded if now balanced
            if (targetAgent.utilization_percentage >= 50) {
              underloadedAgents.shift();
            }
          } else {
            errors.push(`Failed to reassign ticket ${ticket.id}`);
          }
        }
      }

      logger.info('Workload rebalancing completed:', { movedTickets, errors: errors.length });
      this.clearCache();

      return { moved: movedTickets, errors };

    } catch (error) {
      logger.error('Workload rebalancing error:', error);
      return { moved: 0, errors: [`Rebalancing failed: ${error}`] };
    }
  }

  /**
   * Utility methods
   */
  private async getActiveAssignmentRules(): Promise<AssignmentData[]> {
    try {
      // In real implementation, this would fetch from database
      // For now, return mock rules
      return [
        {
          rule_name: 'Payment Issues - High Priority',
          conditions: {
            category: ['payment'],
            priority: ['high', 'urgent'],
          },
          assignment: {
            team: 'payment_specialists',
            skill_requirements: ['payment_processing', 'billing'],
          },
          is_active: true,
          priority: 100,
        },
        {
          rule_name: 'Shipping Issues - General',
          conditions: {
            category: ['shipping'],
          },
          assignment: {
            team: 'logistics',
          },
          is_active: true,
          priority: 80,
        },
        {
          rule_name: 'General Support - Business Hours',
          conditions: {
            business_hours_only: true,
          },
          assignment: {
            team: 'general_support',
          },
          is_active: true,
          priority: 50,
        },
      ];
    } catch (error) {
      logger.error('Failed to get assignment rules:', error);
      return [];
    }
  }

  private async getAllAgents(): Promise<SupportAgent[]> {
    try {
      // Mock data - in real implementation, fetch from database
      return [
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          skills: ['payment_processing', 'billing', 'refunds'],
          languages: ['en', 'es'],
          max_concurrent_tickets: 10,
          current_ticket_count: 6,
          workload_score: 75,
          is_available: true,
          business_hours: {
            timezone: 'UTC',
            schedule: {
              mon: { start: '09:00', end: '17:00' },
              tue: { start: '09:00', end: '17:00' },
              wed: { start: '09:00', end: '17:00' },
              thu: { start: '09:00', end: '17:00' },
              fri: { start: '09:00', end: '17:00' },
            },
          },
          specializations: ['payment', 'refund'],
          priority_handling: ['high', 'urgent'],
        },
        {
          id: '2',
          name: 'Bob Smith',
          email: 'bob@example.com',
          skills: ['shipping', 'logistics', 'customs'],
          languages: ['en'],
          max_concurrent_tickets: 8,
          current_ticket_count: 3,
          workload_score: 40,
          is_available: true,
          business_hours: {
            timezone: 'UTC',
            schedule: {
              mon: { start: '09:00', end: '17:00' },
              tue: { start: '09:00', end: '17:00' },
              wed: { start: '09:00', end: '17:00' },
              thu: { start: '09:00', end: '17:00' },
              fri: { start: '09:00', end: '17:00' },
            },
          },
          specializations: ['shipping', 'customs'],
          priority_handling: ['medium', 'high'],
        },
      ];
    } catch (error) {
      logger.error('Failed to get agents:', error);
      return [];
    }
  }

  private async getAgentById(agentId: string): Promise<SupportAgent | null> {
    const agents = await this.getAllAgents();
    return agents.find(agent => agent.id === agentId) || null;
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();

    return (
      this.BUSINESS_HOURS.workdays.includes(currentDay) &&
      currentHour >= this.BUSINESS_HOURS.start &&
      currentHour < this.BUSINESS_HOURS.end
    );
  }

  private isAgentInTeam(agentId: string, team: string): boolean {
    // Mock implementation - would check team membership in database
    return true; // Assume all agents are in all teams for now
  }

  private async getCustomerTier(userId: string): Promise<string> {
    // Mock implementation - would get from customer profile
    return 'standard';
  }

  private async updateAgentWorkload(agentId: string, increment: number): Promise<void> {
    try {
      // Would update agent's current_ticket_count in database
      logger.info('Agent workload updated:', { agentId, increment });
    } catch (error) {
      logger.error('Failed to update agent workload:', error);
    }
  }

  private async logAssignmentActivity(
    ticketId: string,
    agentId: string,
    rule: string,
    reason?: string
  ): Promise<void> {
    try {
      await supabase.from('support_analytics').insert({
        ticket_id: ticketId,
        metric_type: 'assignment',
        metric_data: {
          assignee_id: agentId,
          rule_used: rule,
          reason,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log assignment activity:', error);
    }
  }

  private async getReassignableTickets(agentId: string): Promise<SupportRecord[]> {
    try {
      const { data, error } = await supabase
        .from('support_system')
        .select('*')
        .eq('system_type', 'ticket')
        .eq('ticket_data->assigned_to', agentId)
        .eq('ticket_data->status', 'open')
        .limit(3); // Limit reassignments

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get reassignable tickets:', error);
      return [];
    }
  }

  /**
   * Cache management
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `assignment_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('AutoAssignmentService cleanup completed');
  }
}

export default AutoAssignmentService;