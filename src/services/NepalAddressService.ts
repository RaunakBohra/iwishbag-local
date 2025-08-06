/**
 * Nepal Address Service
 * Provides district and municipality data for Nepal's administrative structure
 */

export interface District {
  code: string;
  name: string;
  province: string;
}

export interface Municipality {
  name: string;
  type: 'metropolitan' | 'sub-metropolitan' | 'municipality' | 'rural';
  district: string;
}

export class NepalAddressService {
  // Nepal Districts organized by Province
  private static NEPAL_DISTRICTS: District[] = [
    // Koshi Province (Province 1)
    { code: 'TAP', name: 'Taplejung', province: 'P1' },
    { code: 'PAN', name: 'Panchthar', province: 'P1' },
    { code: 'ILA', name: 'Ilam', province: 'P1' },
    { code: 'JHA', name: 'Jhapa', province: 'P1' },
    { code: 'MOR', name: 'Morang', province: 'P1' },
    { code: 'SUN', name: 'Sunsari', province: 'P1' },
    { code: 'DHK', name: 'Dhankuta', province: 'P1' },
    { code: 'TER', name: 'Terhathum', province: 'P1' },
    { code: 'SAN', name: 'Sankhuwasabha', province: 'P1' },
    { code: 'BHO', name: 'Bhojpur', province: 'P1' },
    { code: 'SOL', name: 'Solukhumbu', province: 'P1' },
    { code: 'OKH', name: 'Okhaldhunga', province: 'P1' },
    { code: 'KHO', name: 'Khotang', province: 'P1' },
    { code: 'UDA', name: 'Udayapur', province: 'P1' },
    
    // Madhesh Province (Province 2)
    { code: 'SAP', name: 'Saptari', province: 'P2' },
    { code: 'SIR', name: 'Siraha', province: 'P2' },
    { code: 'DHA', name: 'Dhanusha', province: 'P2' },
    { code: 'MAH', name: 'Mahottari', province: 'P2' },
    { code: 'SAR', name: 'Sarlahi', province: 'P2' },
    { code: 'RAU', name: 'Rautahat', province: 'P2' },
    { code: 'BAR', name: 'Bara', province: 'P2' },
    { code: 'PAR', name: 'Parsa', province: 'P2' },
    
    // Bagmati Province (Province 3)
    { code: 'DOL', name: 'Dolakha', province: 'P3' },
    { code: 'RAM', name: 'Ramechhap', province: 'P3' },
    { code: 'SIN', name: 'Sindhuli', province: 'P3' },
    { code: 'KAV', name: 'Kavrepalanchok', province: 'P3' },
    { code: 'SIP', name: 'Sindhupalchok', province: 'P3' },
    { code: 'RAS', name: 'Rasuwa', province: 'P3' },
    { code: 'NUW', name: 'Nuwakot', province: 'P3' },
    { code: 'DHD', name: 'Dhading', province: 'P3' },
    { code: 'KTM', name: 'Kathmandu', province: 'P3' },
    { code: 'BKT', name: 'Bhaktapur', province: 'P3' },
    { code: 'LAL', name: 'Lalitpur', province: 'P3' },
    { code: 'MAK', name: 'Makwanpur', province: 'P3' },
    { code: 'CHI', name: 'Chitwan', province: 'P3' },
    
    // Gandaki Province (Province 4)
    { code: 'GOR', name: 'Gorkha', province: 'P4' },
    { code: 'MAN', name: 'Manang', province: 'P4' },
    { code: 'MUS', name: 'Mustang', province: 'P4' },
    { code: 'MYA', name: 'Myagdi', province: 'P4' },
    { code: 'KAS', name: 'Kaski', province: 'P4' },
    { code: 'LAM', name: 'Lamjung', province: 'P4' },
    { code: 'TAN', name: 'Tanahun', province: 'P4' },
    { code: 'NAW', name: 'Nawalpur', province: 'P4' },
    { code: 'SYA', name: 'Syangja', province: 'P4' },
    { code: 'PAB', name: 'Parbat', province: 'P4' },
    { code: 'BAG', name: 'Baglung', province: 'P4' },
    
    // Lumbini Province (Province 5)
    { code: 'RUK', name: 'Rukum East', province: 'P5' },
    { code: 'ROL', name: 'Rolpa', province: 'P5' },
    { code: 'PYU', name: 'Pyuthan', province: 'P5' },
    { code: 'GUL', name: 'Gulmi', province: 'P5' },
    { code: 'ARG', name: 'Arghakhanchi', province: 'P5' },
    { code: 'PAL', name: 'Palpa', province: 'P5' },
    { code: 'NAP', name: 'Nawalparasi West', province: 'P5' },
    { code: 'RUP', name: 'Rupandehi', province: 'P5' },
    { code: 'KAP', name: 'Kapilvastu', province: 'P5' },
    { code: 'DAN', name: 'Dang', province: 'P5' },
    { code: 'BAN', name: 'Banke', province: 'P5' },
    { code: 'BAD', name: 'Bardiya', province: 'P5' },
    
    // Karnali Province (Province 6)
    { code: 'RUW', name: 'Rukum West', province: 'P6' },
    { code: 'SAL', name: 'Salyan', province: 'P6' },
    { code: 'DOT', name: 'Dolpa', province: 'P6' },
    { code: 'HUM', name: 'Humla', province: 'P6' },
    { code: 'JUM', name: 'Jumla', province: 'P6' },
    { code: 'MUG', name: 'Mugu', province: 'P6' },
    { code: 'KAL', name: 'Kalikot', province: 'P6' },
    { code: 'JAJ', name: 'Jajarkot', province: 'P6' },
    { code: 'DAI', name: 'Dailekh', province: 'P6' },
    { code: 'SUR', name: 'Surkhet', province: 'P6' },
    
    // Sudurpashchim Province (Province 7)
    { code: 'BAJ', name: 'Bajura', province: 'P7' },
    { code: 'BHA', name: 'Bajhang', province: 'P7' },
    { code: 'AHA', name: 'Achham', province: 'P7' },
    { code: 'DOI', name: 'Doti', province: 'P7' },
    { code: 'KAI', name: 'Kailali', province: 'P7' },
    { code: 'KAN', name: 'Kanchanpur', province: 'P7' },
    { code: 'DAD', name: 'Dadeldhura', province: 'P7' },
    { code: 'BAI', name: 'Baitadi', province: 'P7' },
    { code: 'DAR', name: 'Darchula', province: 'P7' },
  ];

  // Major municipalities (simplified list - in production, this would be more comprehensive)
  private static NEPAL_MUNICIPALITIES: Municipality[] = [
    // Kathmandu District
    { name: 'Kathmandu Metropolitan City', type: 'metropolitan', district: 'KTM' },
    { name: 'Budhanilkantha Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Tarakeshwar Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Gokarneshwar Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Kageshwari Manohara Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Nagarjun Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Kirtipur Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Chandragiri Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Tokha Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Shankharapur Municipality', type: 'municipality', district: 'KTM' },
    { name: 'Dakshinkali Municipality', type: 'municipality', district: 'KTM' },
    
    // Lalitpur District
    { name: 'Lalitpur Metropolitan City', type: 'metropolitan', district: 'LAL' },
    { name: 'Godawari Municipality', type: 'municipality', district: 'LAL' },
    { name: 'Mahalaxmi Municipality', type: 'municipality', district: 'LAL' },
    
    // Bhaktapur District
    { name: 'Bhaktapur Municipality', type: 'municipality', district: 'BKT' },
    { name: 'Madhyapur Thimi Municipality', type: 'municipality', district: 'BKT' },
    { name: 'Suryabinayak Municipality', type: 'municipality', district: 'BKT' },
    { name: 'Changunarayan Municipality', type: 'municipality', district: 'BKT' },
    
    // Other Metropolitan Cities
    { name: 'Pokhara Metropolitan City', type: 'metropolitan', district: 'KAS' },
    { name: 'Bharatpur Metropolitan City', type: 'metropolitan', district: 'CHI' },
    { name: 'Biratnagar Metropolitan City', type: 'metropolitan', district: 'MOR' },
    { name: 'Birgunj Metropolitan City', type: 'metropolitan', district: 'PAR' },
    
    // Add more municipalities as needed...
  ];

  /**
   * Get districts for a province
   */
  static getDistrictsForProvince(provinceCode: string): District[] {
    return this.NEPAL_DISTRICTS.filter(district => district.province === provinceCode);
  }

  /**
   * Get municipalities for a district
   */
  static getMunicipalitiesForDistrict(districtCode: string): Municipality[] {
    return this.NEPAL_MUNICIPALITIES.filter(municipality => municipality.district === districtCode);
  }

  /**
   * Get all districts
   */
  static getAllDistricts(): District[] {
    return this.NEPAL_DISTRICTS;
  }

  /**
   * Get district name by code
   */
  static getDistrictName(districtCode: string): string | null {
    const district = this.NEPAL_DISTRICTS.find(d => d.code === districtCode);
    return district?.name || null;
  }

  /**
   * Get district code by district name (reverse lookup)
   */
  static getDistrictCodeByName(districtName: string): string | null {
    const district = this.NEPAL_DISTRICTS.find(d => 
      d.name.toLowerCase() === districtName.toLowerCase()
    );
    return district?.code || null;
  }

  /**
   * Format Nepal address for display
   */
  static formatNepalAddress(address: {
    municipality: string;
    ward: string;
    area: string;
    landmark?: string;
    district: string;
    province: string;
  }): string {
    const parts = [
      `${address.municipality}, Ward ${address.ward}`,
      address.area,
      address.landmark,
      address.district,
      address.province,
      'Nepal'
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Parse stored address back to components
   */
  static parseNepalAddress(address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state_province_region: string;
  }) {
    // Extract ward and area from address_line1
    const wardMatch = address.address_line1.match(/Ward (\d+)/i);
    const ward = wardMatch ? wardMatch[1] : '';
    const area = address.address_line1.replace(/Ward \d+,?\s*/i, '').trim();
    
    return {
      municipality: address.city,
      ward,
      area,
      landmark: address.address_line2 || '',
      district: '', // Would need to be stored or looked up
      province: address.state_province_region
    };
  }
}