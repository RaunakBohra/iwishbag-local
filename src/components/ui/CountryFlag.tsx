import React from 'react';
import 'flag-icons/css/flag-icons.min.css';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
  width?: number;
  height?: number;
  variant?: 'svg' | 'code' | 'gradient';
}

/**
 * Professional country flag component
 * Uses either SVG flags or falls back to country code
 */
export function CountryFlag({ countryCode, className = '', width = 20, height = 15, variant = 'svg' }: CountryFlagProps) {
  const code = countryCode.toLowerCase();
  
  if (variant === 'svg') {
    // Use flag-icons library for professional SVG flags
    return (
      <span 
        className={`fi fi-${code} ${className}`}
        style={{ 
          width, 
          height, 
          fontSize: height,
          lineHeight: 1,
          display: 'inline-block',
          borderRadius: '2px',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
        }}
      />
    );
  }
  
  // Fallback to country code display
  return (
    <div 
      className={`inline-flex items-center justify-center bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-700 ${className}`}
      style={{ width, height, minWidth: width }}
    >
      {countryCode.toUpperCase()}
    </div>
  );
}

// Alternative: Country indicator with better visual
export function CountryIndicator({ countryCode, showCode = true }: { countryCode: string; showCode?: boolean }) {
  const countryNames: Record<string, string> = {
    US: 'USA',
    GB: 'GBR',
    IN: 'IND',
    NP: 'NPL',
    CA: 'CAN',
    AU: 'AUS',
    NZ: 'NZL',
    DE: 'DEU',
    FR: 'FRA',
    IT: 'ITA',
    ES: 'ESP',
    JP: 'JPN',
    CN: 'CHN',
    KR: 'KOR',
    SG: 'SGP',
    MY: 'MYS',
    TH: 'THA',
    ID: 'IDN',
    PH: 'PHL',
    VN: 'VNM',
    BD: 'BGD',
    LK: 'LKA',
    PK: 'PAK',
    AE: 'ARE',
    SA: 'SAU',
    BR: 'BRA',
    MX: 'MEX',
    AR: 'ARG',
  };

  const code = countryNames[countryCode.toUpperCase()] || countryCode.toUpperCase();
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
      {code}
    </span>
  );
}

// Professional flag using CSS gradients for common countries
export function ProfessionalFlag({ countryCode, className = '' }: { countryCode: string; className?: string }) {
  const getFlagStyle = (code: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '24px',
      height: '16px',
      borderRadius: '2px',
      border: '1px solid #e5e7eb',
      display: 'inline-block',
      verticalAlign: 'middle',
    };

    switch (code.toUpperCase()) {
      case 'US':
        return {
          ...baseStyle,
          background: 'linear-gradient(180deg, #b22234 0%, #b22234 7.69%, #fff 7.69%, #fff 15.38%, #b22234 15.38%, #b22234 23.08%, #fff 23.08%, #fff 30.77%, #b22234 30.77%, #b22234 38.46%, #fff 38.46%, #fff 46.15%, #b22234 46.15%, #b22234 53.85%, #fff 53.85%, #fff 61.54%, #b22234 61.54%, #b22234 69.23%, #fff 69.23%, #fff 76.92%, #b22234 76.92%, #b22234 84.62%, #fff 84.62%, #fff 92.31%, #b22234 92.31%, #b22234 100%)',
        };
      case 'GB':
        return {
          ...baseStyle,
          background: '#012169',
          position: 'relative',
          overflow: 'hidden',
        };
      case 'IN':
        return {
          ...baseStyle,
          background: 'linear-gradient(180deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.67%, #138808 66.67%, #138808 100%)',
        };
      case 'NP':
        return {
          ...baseStyle,
          background: '#DC143C',
          border: '1px solid #003893',
        };
      case 'CA':
        return {
          ...baseStyle,
          background: 'linear-gradient(90deg, #FF0000 0%, #FF0000 25%, #FFFFFF 25%, #FFFFFF 75%, #FF0000 75%, #FF0000 100%)',
        };
      case 'AU':
        return {
          ...baseStyle,
          background: '#012169',
        };
      case 'DE':
        return {
          ...baseStyle,
          background: 'linear-gradient(180deg, #000000 0%, #000000 33.33%, #DD0000 33.33%, #DD0000 66.67%, #FFCE00 66.67%, #FFCE00 100%)',
        };
      case 'FR':
        return {
          ...baseStyle,
          background: 'linear-gradient(90deg, #002395 0%, #002395 33.33%, #FFFFFF 33.33%, #FFFFFF 66.67%, #ED2939 66.67%, #ED2939 100%)',
        };
      case 'JP':
        return {
          ...baseStyle,
          background: '#FFFFFF',
          position: 'relative',
        };
      default:
        return {
          ...baseStyle,
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: '600',
          color: '#6b7280',
        };
    }
  };

  const style = getFlagStyle(countryCode);
  
  // For countries with special elements (like Japan's red circle)
  if (countryCode.toUpperCase() === 'JP') {
    return (
      <div className={className} style={style}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#BC002D',
          }}
        />
      </div>
    );
  }

  // For default countries without specific flag design
  if (!['US', 'GB', 'IN', 'NP', 'CA', 'AU', 'DE', 'FR'].includes(countryCode.toUpperCase())) {
    return (
      <div className={className} style={style}>
        {countryCode.toUpperCase().slice(0, 2)}
      </div>
    );
  }

  return <div className={className} style={style} />;
}