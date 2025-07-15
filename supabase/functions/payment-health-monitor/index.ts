import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Max-Age': '86400',
}

interface PaymentHealthMetrics {
  overall_health: 'healthy' | 'warning' | 'critical';
  success_rate: number;
  error_rate: number;
  avg_processing_time: number;
  gateway_health: Array<{
    gateway: string;
    status: 'healthy' | 'warning' | 'critical';
    success_rate: number;
    last_success: string;
    issues: string[];
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
    details?: any;
  }>;
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🏥 Payment Health Monitor Check');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
    const since = new Date(Date.now() - timeWindow).toISOString();

    // Get payment data for the last 24 hours
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      throw paymentsError;
    }

    // Get error logs for the last 24 hours
    const { data: errorLogs, error: errorLogsError } = await supabaseAdmin
      .from('payment_error_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (errorLogsError) {
      throw errorLogsError;
    }

    // Get webhook logs for the last 24 hours
    const { data: webhookLogs, error: webhookLogsError } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (webhookLogsError) {
      throw webhookLogsError;
    }

    // Calculate health metrics
    const healthMetrics = calculateHealthMetrics(payments || [], errorLogs || [], webhookLogs || []);

    // Store health check result
    await supabaseAdmin
      .from('payment_health_logs')
      .insert({
        overall_health: healthMetrics.overall_health,
        success_rate: healthMetrics.success_rate,
        error_rate: healthMetrics.error_rate,
        alert_count: healthMetrics.alerts.length,
        metrics: healthMetrics,
        created_at: new Date().toISOString()
      });

    // Send alerts if needed
    const criticalAlerts = healthMetrics.alerts.filter(alert => alert.level === 'critical');
    if (criticalAlerts.length > 0) {
      await sendHealthAlerts(supabaseAdmin, criticalAlerts);
    }

    return new Response(JSON.stringify(healthMetrics), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Payment health monitor error:', error);
    return new Response(JSON.stringify({ 
      error: 'Health check failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

function calculateHealthMetrics(payments: any[], errorLogs: any[], webhookLogs: any[]): PaymentHealthMetrics {
  const alerts: any[] = [];
  const recommendations: string[] = [];

  // Calculate overall metrics
  const totalPayments = payments.length;
  const successfulPayments = payments.filter(p => p.status === 'success').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;
  
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100;
  const errorRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;

  // Calculate average processing time (from webhook logs)
  const successfulWebhooks = webhookLogs.filter(w => w.status === 'success');
  const avgProcessingTime = successfulWebhooks.length > 0 
    ? successfulWebhooks.reduce((sum, w) => {
        const match = w.error_message?.match(/Processed in (\d+)ms/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0) / successfulWebhooks.length
    : 0;

  // Analyze gateway health
  const gatewayHealth = analyzeGatewayHealth(payments, errorLogs, webhookLogs);

  // Generate alerts based on thresholds
  if (successRate < 95) {
    alerts.push({
      level: successRate < 90 ? 'critical' : 'warning',
      message: `Payment success rate is ${successRate.toFixed(1)}% (below 95% threshold)`,
      timestamp: new Date().toISOString(),
      details: { success_rate: successRate, threshold: 95 }
    });
  }

  if (errorRate > 5) {
    alerts.push({
      level: errorRate > 10 ? 'critical' : 'warning',
      message: `Payment error rate is ${errorRate.toFixed(1)}% (above 5% threshold)`,
      timestamp: new Date().toISOString(),
      details: { error_rate: errorRate, threshold: 5 }
    });
  }

  if (avgProcessingTime > 5000) {
    alerts.push({
      level: 'warning',
      message: `Average payment processing time is ${avgProcessingTime.toFixed(0)}ms (above 5s threshold)`,
      timestamp: new Date().toISOString(),
      details: { avg_processing_time: avgProcessingTime, threshold: 5000 }
    });
  }

  // Check for gateway-specific issues
  gatewayHealth.forEach(gateway => {
    if (gateway.status === 'critical') {
      alerts.push({
        level: 'critical',
        message: `${gateway.gateway} gateway is experiencing critical issues`,
        timestamp: new Date().toISOString(),
        details: { gateway: gateway.gateway, issues: gateway.issues }
      });
    } else if (gateway.status === 'warning') {
      alerts.push({
        level: 'warning',
        message: `${gateway.gateway} gateway has performance issues`,
        timestamp: new Date().toISOString(),
        details: { gateway: gateway.gateway, issues: gateway.issues }
      });
    }
  });

  // Generate recommendations
  if (successRate < 95) {
    recommendations.push('Review failed payment logs to identify common issues');
    recommendations.push('Check payment gateway configurations');
  }

  if (errorRate > 5) {
    recommendations.push('Implement retry logic for failed payments');
    recommendations.push('Review error handling and user experience');
  }

  if (avgProcessingTime > 5000) {
    recommendations.push('Optimize payment processing pipeline');
    recommendations.push('Consider implementing asynchronous processing');
  }

  const gatewayIssues = gatewayHealth.filter(g => g.status !== 'healthy');
  if (gatewayIssues.length > 0) {
    recommendations.push('Consider implementing backup payment methods');
    recommendations.push('Set up gateway failover mechanisms');
  }

  // Determine overall health
  const criticalAlerts = alerts.filter(a => a.level === 'critical').length;
  const warningAlerts = alerts.filter(a => a.level === 'warning').length;
  
  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (criticalAlerts > 0) {
    overallHealth = 'critical';
  } else if (warningAlerts > 0) {
    overallHealth = 'warning';
  }

  return {
    overall_health: overallHealth,
    success_rate: successRate,
    error_rate: errorRate,
    avg_processing_time: avgProcessingTime,
    gateway_health: gatewayHealth,
    alerts,
    recommendations
  };
}

function analyzeGatewayHealth(payments: any[], errorLogs: any[], webhookLogs: any[]): any[] {
  const gateways = ['payu', 'stripe', 'bank_transfer', 'esewa', 'khalti'];
  
  return gateways.map(gateway => {
    const gatewayPayments = payments.filter(p => p.gateway === gateway);
    const gatewayErrors = errorLogs.filter(e => e.gateway === gateway);
    const gatewayWebhooks = webhookLogs.filter(w => w.webhook_type === gateway);

    const totalTransactions = gatewayPayments.length;
    const successfulTransactions = gatewayPayments.filter(p => p.status === 'success').length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 100;

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (totalTransactions === 0) {
      issues.push('No transactions in the last 24 hours');
      status = 'warning';
    } else if (successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
      status = successRate < 80 ? 'critical' : 'warning';
    }

    const recentErrors = gatewayErrors.filter(e => {
      const errorTime = new Date(e.created_at).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return errorTime > oneHourAgo;
    });

    if (recentErrors.length > 5) {
      issues.push(`High error rate: ${recentErrors.length} errors in the last hour`);
      status = recentErrors.length > 10 ? 'critical' : 'warning';
    }

    const failedWebhooks = gatewayWebhooks.filter(w => w.status === 'failed');
    if (failedWebhooks.length > 0) {
      issues.push(`${failedWebhooks.length} webhook failures`);
      if (status === 'healthy') status = 'warning';
    }

    const lastSuccessful = gatewayPayments
      .filter(p => p.status === 'success')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const lastSuccess = lastSuccessful ? lastSuccessful.created_at : 'Never';

    return {
      gateway,
      status,
      success_rate: successRate,
      last_success: lastSuccess,
      issues
    };
  });
}

async function sendHealthAlerts(supabaseAdmin: any, alerts: any[]) {
  try {
    // Get admin email addresses
    const { data: adminEmails, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin emails:', adminError);
      return;
    }

    // Send email alerts to admins
    for (const alert of alerts) {
      const emailData = {
        to: adminEmails.map(admin => admin.user_id),
        subject: `Payment System Alert: ${alert.level.toUpperCase()}`,
        template_name: 'payment_health_alert',
        template_data: {
          alert_level: alert.level,
          message: alert.message,
          timestamp: alert.timestamp,
          details: JSON.stringify(alert.details, null, 2)
        }
      };

      await supabaseAdmin.functions.invoke('send-email', { body: emailData });
    }

    console.log(`✅ Sent ${alerts.length} health alerts to admins`);
  } catch (error) {
    console.error('Error sending health alerts:', error);
  }
}