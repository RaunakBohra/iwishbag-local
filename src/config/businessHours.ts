/**
 * Business Hours Configuration
 * Defines support availability, timezones, and SLA calculations
 */

export interface BusinessDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWorkingDay: boolean;
  startTime: string; // 24-hour format: "09:00"
  endTime: string; // 24-hour format: "17:00"
}

export interface BusinessHours {
  timezone: string;
  days: BusinessDay[];
  holidays: string[]; // ISO date strings: ["2025-12-25", "2025-01-01"]
}

/**
 * Default business hours configuration
 * Customize this based on your support team's availability
 */
export const defaultBusinessHours: BusinessHours = {
  timezone: 'Asia/Kolkata', // Delhi/India Standard Time
  days: [
    {
      day: 'monday',
      isWorkingDay: true,
      startTime: '10:00',
      endTime: '17:00',
    },
    {
      day: 'tuesday',
      isWorkingDay: true,
      startTime: '10:00',
      endTime: '17:00',
    },
    {
      day: 'wednesday',
      isWorkingDay: true,
      startTime: '10:00',
      endTime: '17:00',
    },
    {
      day: 'thursday',
      isWorkingDay: true,
      startTime: '10:00',
      endTime: '17:00',
    },
    {
      day: 'friday',
      isWorkingDay: true,
      startTime: '10:00',
      endTime: '17:00',
    },
    {
      day: 'saturday',
      isWorkingDay: false,
      startTime: '00:00',
      endTime: '00:00',
    },
    {
      day: 'sunday',
      isWorkingDay: false,
      startTime: '00:00',
      endTime: '00:00',
    },
  ],
  holidays: [
    // Indian National Holidays 2025
    '2025-01-26', // Republic Day
    '2025-08-15', // Independence Day
    '2025-10-02', // Gandhi Jayanti
    '2025-12-25', // Christmas
    // Add more holidays as needed
  ],
};

/**
 * Business Hours Utility Functions
 */
export class BusinessHoursService {
  private config: BusinessHours;

  constructor(config: BusinessHours = defaultBusinessHours) {
    this.config = config;
  }

  /**
   * Check if current time is within business hours
   */
  isCurrentlyBusinessHours(): boolean {
    const now = new Date();
    return this.isBusinessHours(now);
  }

  /**
   * Check if a specific date/time is within business hours
   */
  isBusinessHours(date: Date): boolean {
    // Convert to business timezone
    const businessTime = this.toBusinessTimezone(date);

    // Check if it's a holiday
    if (this.isHoliday(businessTime)) {
      return false;
    }

    // Get day configuration
    const dayName = this.getDayName(businessTime);
    const dayConfig = this.config.days.find((d) => d.day === dayName);

    if (!dayConfig || !dayConfig.isWorkingDay) {
      return false;
    }

    // Check if time is within working hours
    const currentTime = this.getTimeString(businessTime);
    return currentTime >= dayConfig.startTime && currentTime <= dayConfig.endTime;
  }

  /**
   * Get next business hours start time
   */
  getNextBusinessHoursStart(fromDate: Date = new Date()): Date {
    const checkDate = new Date(fromDate);

    // Try next 14 days to find next business hours
    for (let i = 0; i < 14; i++) {
      if (i > 0) {
        checkDate.setDate(checkDate.getDate() + 1);
      }

      const dayName = this.getDayName(checkDate);
      const dayConfig = this.config.days.find((d) => d.day === dayName);

      if (dayConfig?.isWorkingDay && !this.isHoliday(checkDate)) {
        // Set to start of business hours for this day
        const [hours, minutes] = dayConfig.startTime.split(':').map(Number);
        const businessStart = new Date(checkDate);
        businessStart.setHours(hours, minutes, 0, 0);

        // If it's today and we're already past start time, continue to next day
        if (i === 0 && this.toBusinessTimezone(fromDate) > businessStart) {
          continue;
        }

        return businessStart;
      }
    }

    // Fallback: return tomorrow 9 AM if no business hours found
    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Calculate business hours between two dates
   */
  getBusinessHoursBetween(startDate: Date, endDate: Date): number {
    let businessHours = 0;
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      if (this.isBusinessHours(currentDate)) {
        businessHours++;
      }
      currentDate.setHours(currentDate.getHours() + 1);
    }

    return businessHours;
  }

  /**
   * Get appropriate auto-response message based on business hours
   */
  getAutoResponseMessage(): string {
    if (this.isCurrentlyBusinessHours()) {
      return "Thank you for contacting us! We've received your request and will respond within 4 hours during business hours.";
    } else {
      const nextBusinessStart = this.getNextBusinessHoursStart();
      const nextBusinessTime = this.formatBusinessTime(nextBusinessStart);
      return `Thank you for contacting us! We've received your request. Our business hours are Monday-Friday 10 AM to 5 PM IST. We'll respond by ${nextBusinessTime}.`;
    }
  }

  /**
   * Private helper methods
   */
  private toBusinessTimezone(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: this.config.timezone }));
  }

  private getDayName(date: Date): BusinessDay['day'] {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()] as BusinessDay['day'];
  }

  private getTimeString(date: Date): string {
    return date.toTimeString().slice(0, 5); // "HH:mm"
  }

  private isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
    return this.config.holidays.includes(dateStr);
  }

  private formatBusinessTime(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      timeZone: this.config.timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

// Export singleton instance
export const businessHoursService = new BusinessHoursService();
