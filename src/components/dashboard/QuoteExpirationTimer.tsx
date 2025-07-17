import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface QuoteExpirationTimerProps {
  expiresAt: string | null;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export const QuoteExpirationTimer: React.FC<QuoteExpirationTimerProps> = ({
  expiresAt,
  className = '',
  showIcon = false,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expirationTime = new Date(expiresAt).getTime();
      const difference = expirationTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || isExpired) {
    return null;
  }

  const formatTime = () => {
    if (compact) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;
    }
    return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
  };

  const getTimeColor = () => {
    const totalHours = timeLeft.days * 24 + timeLeft.hours;
    if (totalHours < 1) return 'text-red-600';
    if (totalHours < 6) return 'text-orange-600';
    if (totalHours < 24) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Clock className="h-4 w-4 text-gray-500" />}
      <span className={`text-sm font-medium ${getTimeColor()}`}>Expires in {formatTime()}</span>
    </div>
  );
};
