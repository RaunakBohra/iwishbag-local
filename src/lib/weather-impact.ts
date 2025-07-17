// Types for weather impact analysis
export interface WeatherAlert {
  id: string;
  type: 'storm' | 'flood' | 'extreme_heat' | 'extreme_cold' | 'high_winds' | 'snow' | 'ice';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  location: string;
  description: string;
  start_date: Date;
  end_date: Date;
  estimated_delay_days: number;
  affected_routes: string[];
}

export interface WeatherImpact {
  totalAlerts: number;
  highSeverityAlerts: number;
  affectedRoutes: string[];
  totalEstimatedDelay: number;
}

export interface DeliveryRoute {
  origin: string;
  destination: string;
  route_id: string;
  carriers: string[];
  estimated_days: number;
}

// Mock weather data - in production, this would come from a weather API
const mockWeatherAlerts: WeatherAlert[] = [
  {
    id: 'alert_001',
    type: 'storm',
    severity: 'high',
    location: 'Mumbai, India',
    description: 'Heavy monsoon rains causing flooding in major shipping areas',
    start_date: new Date('2025-06-25'),
    end_date: new Date('2025-06-28'),
    estimated_delay_days: 3,
    affected_routes: ['US-IN', 'UK-IN', 'CA-IN'],
  },
  {
    id: 'alert_002',
    type: 'extreme_heat',
    severity: 'medium',
    location: 'Dubai, UAE',
    description: 'Extreme heat affecting cargo handling operations',
    start_date: new Date('2025-06-26'),
    end_date: new Date('2025-06-30'),
    estimated_delay_days: 1,
    affected_routes: ['US-AE', 'UK-AE', 'IN-AE'],
  },
  {
    id: 'alert_003',
    type: 'high_winds',
    severity: 'low',
    location: 'London, UK',
    description: 'High winds affecting airport operations',
    start_date: new Date('2025-06-27'),
    end_date: new Date('2025-06-29'),
    estimated_delay_days: 1,
    affected_routes: ['US-UK', 'IN-UK', 'AE-UK'],
  },
];

// Get weather alerts for a specific route
export function getWeatherAlertsForRoute(origin: string, destination: string): WeatherAlert[] {
  const routeKey = `${origin}-${destination}`;
  return mockWeatherAlerts.filter(
    (alert) => alert.affected_routes.includes(routeKey) && alert.end_date >= new Date(),
  );
}

// Get all active weather alerts
export function getActiveWeatherAlerts(): WeatherAlert[] {
  return mockWeatherAlerts.filter((alert) => alert.end_date >= new Date());
}

// Calculate weather impact for delivery routes
export function calculateWeatherImpact(routes: DeliveryRoute[]): WeatherImpact {
  const allAlerts = getActiveWeatherAlerts();
  const affectedRoutes: string[] = [];
  let totalDelay = 0;

  routes.forEach((route) => {
    const routeAlerts = getWeatherAlertsForRoute(route.origin, route.destination);
    if (routeAlerts.length > 0) {
      affectedRoutes.push(route.route_id);
      const maxDelay = Math.max(...routeAlerts.map((alert) => alert.estimated_delay_days));
      totalDelay += maxDelay;
    }
  });

  const highSeverityAlerts = allAlerts.filter(
    (alert) => alert.severity === 'high' || alert.severity === 'extreme',
  ).length;

  return {
    totalAlerts: allAlerts.length,
    highSeverityAlerts,
    affectedRoutes,
    totalEstimatedDelay: totalDelay,
  };
}

// Get weather alerts by severity
export function getWeatherAlertsBySeverity(severity: WeatherAlert['severity']): WeatherAlert[] {
  return getActiveWeatherAlerts().filter((alert) => alert.severity === severity);
}

// Get weather alerts by type
export function getWeatherAlertsByType(type: WeatherAlert['type']): WeatherAlert[] {
  return getActiveWeatherAlerts().filter((alert) => alert.type === type);
}

// Calculate adjusted delivery time due to weather
export function calculateWeatherAdjustedDeliveryTime(
  baseDeliveryDays: number,
  origin: string,
  destination: string,
): number {
  const alerts = getWeatherAlertsForRoute(origin, destination);
  if (alerts.length === 0) return baseDeliveryDays;

  const maxDelay = Math.max(...alerts.map((alert) => alert.estimated_delay_days));
  return baseDeliveryDays + maxDelay;
}

// Generate weather alert message
export function generateWeatherAlertMessage(alert: WeatherAlert): string {
  const severityEmoji = {
    low: '🟡',
    medium: '🟠',
    high: '🔴',
    extreme: '🟣',
  };

  const typeEmoji = {
    storm: '⛈️',
    flood: '🌊',
    extreme_heat: '🔥',
    extreme_cold: '❄️',
    high_winds: '💨',
    snow: '🌨️',
    ice: '🧊',
  };

  return `${severityEmoji[alert.severity]} ${typeEmoji[alert.type]} **${alert.severity.toUpperCase()} ${alert.type.toUpperCase()} ALERT**

**Location:** ${alert.location}
**Description:** ${alert.description}
**Duration:** ${alert.start_date.toLocaleDateString()} - ${alert.end_date.toLocaleDateString()}
**Estimated Delay:** +${alert.estimated_delay_days} days

This may affect delivery times for packages traveling through this region.`;
}

// Get weather impact summary for admin dashboard
export function getWeatherImpactSummary(): {
  totalAlerts: number;
  highSeverityAlerts: number;
  affectedRoutes: string[];
  totalEstimatedDelay: number;
} {
  const alerts = getActiveWeatherAlerts();
  const highSeverityAlerts = alerts.filter(
    (alert) => alert.severity === 'high' || alert.severity === 'extreme',
  ).length;

  const affectedRoutes = [...new Set(alerts.flatMap((alert) => alert.affected_routes))];
  const totalDelay = alerts.reduce((sum, alert) => sum + alert.estimated_delay_days, 0);

  return {
    totalAlerts: alerts.length,
    highSeverityAlerts,
    affectedRoutes,
    totalEstimatedDelay: totalDelay,
  };
}

// Check if a route has weather delays
export function hasWeatherDelays(origin: string, destination: string): boolean {
  const alerts = getWeatherAlertsForRoute(origin, destination);
  return alerts.length > 0;
}

// Get weather delay for a specific route
export function getWeatherDelay(origin: string, destination: string): number {
  const alerts = getWeatherAlertsForRoute(origin, destination);
  if (alerts.length === 0) return 0;

  return Math.max(...alerts.map((alert) => alert.estimated_delay_days));
}

// Format weather impact for display
export function formatWeatherImpact(impact: WeatherImpact): string {
  if (impact.totalAlerts === 0) {
    return 'No weather alerts affecting deliveries';
  }

  return `${impact.totalAlerts} active weather alert${impact.totalAlerts > 1 ? 's' : ''} affecting ${impact.affectedRoutes.length} route${impact.affectedRoutes.length > 1 ? 's' : ''}. Estimated total delay: +${impact.totalEstimatedDelay} days`;
}
