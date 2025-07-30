import React from 'react';
import 'flag-icons/css/flag-icons.min.css';

interface FlagIconProps {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg';
  square?: boolean;
  className?: string;
}

/**
 * Professional flag icon component using flag-icons library
 * Provides consistent, high-quality SVG flags for all countries
 */
export function FlagIcon({ countryCode, size = 'md', square = false, className = '' }: FlagIconProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const sizeStyles = {
    sm: { width: '16px', height: '12px' },
    md: { width: '20px', height: '15px' },
    lg: { width: '24px', height: '18px' }
  };

  // Handle special country code mappings
  const getFlagCode = (code: string): string => {
    const mappings: Record<string, string> = {
      'UK': 'gb', // United Kingdom
      'EN': 'gb-eng', // England
    };
    return mappings[code.toUpperCase()] || code.toLowerCase();
  };

  const flagCode = getFlagCode(countryCode);
  const flagClass = square ? `fi-${flagCode} fis` : `fi-${flagCode}`;

  return (
    <span 
      className={`fi ${flagClass} ${sizeClasses[size]} ${className}`}
      style={{
        ...sizeStyles[size],
        display: 'inline-block',
        borderRadius: '2px',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      role="img"
      aria-label={`${countryCode} flag`}
    />
  );
}

// Text-based country code display for a more minimal look
export function CountryCode({ countryCode, className = '' }: { countryCode: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded ${className}`}>
      {countryCode.toUpperCase()}
    </span>
  );
}

// Professional country display with flag and name
export function CountryDisplay({ 
  countryCode, 
  countryName, 
  showFlag = true, 
  showCode = false,
  className = '' 
}: { 
  countryCode: string; 
  countryName?: string; 
  showFlag?: boolean; 
  showCode?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showFlag && <FlagIcon countryCode={countryCode} size="sm" />}
      {countryName && <span className="text-sm">{countryName}</span>}
      {showCode && <CountryCode countryCode={countryCode} />}
    </div>
  );
}