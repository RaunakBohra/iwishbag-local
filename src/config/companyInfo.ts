/**
 * Centralized company information configuration
 * Contains all company details, addresses, and legal information
 */

export interface CompanyAddress {
  companyName: string;
  legalName?: string;
  address: string;
  addressLines: {
    line1: string;
    line2?: string;
    line3?: string;
    line4?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };
  registrationNumber?: string;
  taxId?: string;
  jurisdiction: string;
}

export interface CompanyInfo extends CompanyAddress {
  shortName: string;
  tagline: string;
  foundedYear: string;
  websiteUrl: string;
  logoUrl: string;
  globalTagline?: string;
  socialMedia: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  contact: {
    supportEmail: string;
    legalEmail: string;
    privacyEmail: string;
    generalEmail: string;
  };
}

// Country-specific company information
export const companyInfoByCountry: Record<string, CompanyInfo> = {
  IN: {
    companyName: 'IWB Enterprises',
    legalName: 'IWB Enterprises',
    shortName: 'iWishBag',
    address: '704, 7th Floor, Palm, Sector 16, Mehrauli Gurgaon Road, Gurugram, Haryana 122007, India',
    addressLines: {
      line1: '704, 7th Floor',
      line2: 'Palm, Sector 16',
      line3: 'Mehrauli Gurgaon Road',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      postalCode: '122007'
    },
    registrationNumber: '', // Add if available
    taxId: '', // Add GST number if available
    jurisdiction: 'Haryana, India',
    tagline: 'Shop the world, delivered to your doorstep',
    globalTagline: 'Singapore-registered, globally trusted',
    foundedYear: '2019',
    websiteUrl: 'https://www.iwishbag.com',
    logoUrl: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    socialMedia: {
      twitter: 'https://twitter.com/iwishbag',
      facebook: 'https://facebook.com/iwishbag',
      instagram: 'https://instagram.com/iwishbag',
      linkedin: 'https://linkedin.com/company/iwishbag'
    },
    contact: {
      supportEmail: 'support@iwishbag.com',
      legalEmail: 'legal@iwishbag.com',
      privacyEmail: 'privacy@iwishbag.com',
      generalEmail: 'info@iwishbag.com'
    }
  },
  
  NP: {
    companyName: 'iWishBag',
    legalName: 'iWishBag',
    shortName: 'iWishBag',
    address: '15 Ekantakuna, Ring Road, Lalitpur 44700, Nepal',
    addressLines: {
      line1: '15 Ekantakuna',
      line2: 'Ring Road',
      city: 'Lalitpur',
      country: 'Nepal',
      postalCode: '44700'
    },
    registrationNumber: '', // Add if available
    taxId: '', // Add PAN/VAT if available
    jurisdiction: 'Nepal',
    tagline: 'Shop the world, delivered to your doorstep',
    globalTagline: 'Backed by Singapore headquarters',
    foundedYear: '2019',
    websiteUrl: 'https://www.iwishbag.com',
    logoUrl: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    socialMedia: {
      twitter: 'https://twitter.com/iwishbag',
      facebook: 'https://facebook.com/iwishbag',
      instagram: 'https://instagram.com/iwishbag',
      linkedin: 'https://linkedin.com/company/iwishbag'
    },
    contact: {
      supportEmail: 'support@iwishbag.com',
      legalEmail: 'legal@iwishbag.com',
      privacyEmail: 'privacy@iwishbag.com',
      generalEmail: 'info@iwishbag.com'
    }
  },
  
  GLOBAL: {
    companyName: 'IWISHBAG PTE LTD',
    legalName: 'IWISHBAG PTE. LTD.',
    shortName: 'iWishBag',
    address: '2 Venture Drive, #19-21, Vision Exchange, Singapore 608526',
    addressLines: {
      line1: '2 Venture Drive',
      line2: '#19-21, Vision Exchange',
      city: 'Singapore',
      country: 'Singapore',
      postalCode: '608526'
    },
    registrationNumber: '202347947E', // UEN for Singapore
    taxId: '202347947E',
    jurisdiction: 'Singapore',
    tagline: 'Shop the world, delivered to your doorstep',
    foundedYear: '2019',
    websiteUrl: 'https://www.iwishbag.com',
    logoUrl: 'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    socialMedia: {
      twitter: 'https://twitter.com/iwishbag',
      facebook: 'https://facebook.com/iwishbag',
      instagram: 'https://instagram.com/iwishbag',
      linkedin: 'https://linkedin.com/company/iwishbag'
    },
    contact: {
      supportEmail: 'support@iwishbag.com',
      legalEmail: 'legal@iwishbag.com',
      privacyEmail: 'privacy@iwishbag.com',
      generalEmail: 'info@iwishbag.com'
    }
  }
};

/**
 * Get company information based on country code
 */
export function getCompanyInfo(countryCode: string): CompanyInfo {
  // Map country codes to our configured regions
  const mappedCode = countryCode === 'IN' ? 'IN' : 
                     countryCode === 'NP' ? 'NP' : 
                     'GLOBAL';
  
  return companyInfoByCountry[mappedCode];
}

/**
 * Get formatted address for display
 */
export function getFormattedAddress(countryCode: string, multiline: boolean = false): string {
  const info = getCompanyInfo(countryCode);
  
  if (multiline) {
    const lines = [
      info.addressLines.line1,
      info.addressLines.line2,
      info.addressLines.line3,
      info.addressLines.line4,
      `${info.addressLines.city}${info.addressLines.state ? ', ' + info.addressLines.state : ''}`,
      `${info.addressLines.country} ${info.addressLines.postalCode}`
    ].filter(Boolean);
    
    return lines.join('\n');
  }
  
  return info.address;
}

/**
 * Get company registration details for legal documents
 */
export function getRegistrationDetails(countryCode: string): string {
  const info = getCompanyInfo(countryCode);
  const details: string[] = [];
  
  if (info.registrationNumber) {
    if (countryCode === 'GLOBAL' || info.addressLines.country === 'Singapore') {
      details.push(`UEN: ${info.registrationNumber}`);
    } else {
      details.push(`Registration No: ${info.registrationNumber}`);
    }
  }
  
  if (info.taxId && info.taxId !== info.registrationNumber) {
    details.push(`Tax ID: ${info.taxId}`);
  }
  
  return details.join(' | ');
}