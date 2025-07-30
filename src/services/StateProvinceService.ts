/**
 * State/Province Service
 * Provides state and province data for countries where it's standardized
 */

export interface StateProvince {
  code: string;
  name: string;
}

export class StateProvinceService {
  // US States
  private static US_STATES: StateProvince[] = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    // US Territories
    { code: 'AS', name: 'American Samoa' },
    { code: 'GU', name: 'Guam' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'VI', name: 'U.S. Virgin Islands' },
    { code: 'UM', name: 'U.S. Minor Outlying Islands' },
    { code: 'AA', name: 'Armed Forces Americas' },
    { code: 'AP', name: 'Armed Forces Pacific' },
    { code: 'AE', name: 'Armed Forces Europe' },
  ];

  // Canadian Provinces and Territories
  private static CA_PROVINCES: StateProvince[] = [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
  ];

  // Indian States and Union Territories
  private static IN_STATES: StateProvince[] = [
    { code: 'AN', name: 'Andaman and Nicobar Islands' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CH', name: 'Chandigarh' },
    { code: 'CT', name: 'Chhattisgarh' },
    { code: 'DD', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { code: 'DL', name: 'Delhi' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JK', name: 'Jammu and Kashmir' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'LA', name: 'Ladakh' },
    { code: 'LD', name: 'Lakshadweep' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OR', name: 'Odisha' },
    { code: 'PY', name: 'Puducherry' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UT', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' },
  ];

  // Nepal Provinces
  private static NP_PROVINCES: StateProvince[] = [
    { code: 'P1', name: 'Province No. 1' },
    { code: 'P2', name: 'Province No. 2' },
    { code: 'P3', name: 'Bagmati Province' },
    { code: 'P4', name: 'Gandaki Province' },
    { code: 'P5', name: 'Lumbini Province' },
    { code: 'P6', name: 'Karnali Province' },
    { code: 'P7', name: 'Sudurpashchim Province' },
  ];

  // Australian States and Territories
  private static AU_STATES: StateProvince[] = [
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NSW', name: 'New South Wales' },
    { code: 'NT', name: 'Northern Territory' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'WA', name: 'Western Australia' },
  ];

  // Brazilian States
  private static BR_STATES: StateProvince[] = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' },
  ];

  // Japanese Prefectures
  private static JP_PREFECTURES: StateProvince[] = [
    { code: '01', name: 'Hokkaido' },
    { code: '02', name: 'Aomori' },
    { code: '03', name: 'Iwate' },
    { code: '04', name: 'Miyagi' },
    { code: '05', name: 'Akita' },
    { code: '06', name: 'Yamagata' },
    { code: '07', name: 'Fukushima' },
    { code: '08', name: 'Ibaraki' },
    { code: '09', name: 'Tochigi' },
    { code: '10', name: 'Gunma' },
    { code: '11', name: 'Saitama' },
    { code: '12', name: 'Chiba' },
    { code: '13', name: 'Tokyo' },
    { code: '14', name: 'Kanagawa' },
    { code: '15', name: 'Niigata' },
    { code: '16', name: 'Toyama' },
    { code: '17', name: 'Ishikawa' },
    { code: '18', name: 'Fukui' },
    { code: '19', name: 'Yamanashi' },
    { code: '20', name: 'Nagano' },
    { code: '21', name: 'Gifu' },
    { code: '22', name: 'Shizuoka' },
    { code: '23', name: 'Aichi' },
    { code: '24', name: 'Mie' },
    { code: '25', name: 'Shiga' },
    { code: '26', name: 'Kyoto' },
    { code: '27', name: 'Osaka' },
    { code: '28', name: 'Hyogo' },
    { code: '29', name: 'Nara' },
    { code: '30', name: 'Wakayama' },
    { code: '31', name: 'Tottori' },
    { code: '32', name: 'Shimane' },
    { code: '33', name: 'Okayama' },
    { code: '34', name: 'Hiroshima' },
    { code: '35', name: 'Yamaguchi' },
    { code: '36', name: 'Tokushima' },
    { code: '37', name: 'Kagawa' },
    { code: '38', name: 'Ehime' },
    { code: '39', name: 'Kochi' },
    { code: '40', name: 'Fukuoka' },
    { code: '41', name: 'Saga' },
    { code: '42', name: 'Nagasaki' },
    { code: '43', name: 'Kumamoto' },
    { code: '44', name: 'Oita' },
    { code: '45', name: 'Miyazaki' },
    { code: '46', name: 'Kagoshima' },
    { code: '47', name: 'Okinawa' },
  ];

  // Chinese Provinces
  private static CN_PROVINCES: StateProvince[] = [
    { code: 'AH', name: 'Anhui' },
    { code: 'BJ', name: 'Beijing' },
    { code: 'CQ', name: 'Chongqing' },
    { code: 'FJ', name: 'Fujian' },
    { code: 'GD', name: 'Guangdong' },
    { code: 'GS', name: 'Gansu' },
    { code: 'GX', name: 'Guangxi' },
    { code: 'GZ', name: 'Guizhou' },
    { code: 'HA', name: 'Henan' },
    { code: 'HB', name: 'Hubei' },
    { code: 'HE', name: 'Hebei' },
    { code: 'HI', name: 'Hainan' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'HL', name: 'Heilongjiang' },
    { code: 'HN', name: 'Hunan' },
    { code: 'JL', name: 'Jilin' },
    { code: 'JS', name: 'Jiangsu' },
    { code: 'JX', name: 'Jiangxi' },
    { code: 'LN', name: 'Liaoning' },
    { code: 'MO', name: 'Macao' },
    { code: 'NM', name: 'Inner Mongolia' },
    { code: 'NX', name: 'Ningxia' },
    { code: 'QH', name: 'Qinghai' },
    { code: 'SC', name: 'Sichuan' },
    { code: 'SD', name: 'Shandong' },
    { code: 'SH', name: 'Shanghai' },
    { code: 'SN', name: 'Shaanxi' },
    { code: 'SX', name: 'Shanxi' },
    { code: 'TJ', name: 'Tianjin' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'XJ', name: 'Xinjiang' },
    { code: 'XZ', name: 'Tibet' },
    { code: 'YN', name: 'Yunnan' },
    { code: 'ZJ', name: 'Zhejiang' },
  ];

  // Mexican States
  private static MX_STATES: StateProvince[] = [
    { code: 'AGU', name: 'Aguascalientes' },
    { code: 'BCN', name: 'Baja California' },
    { code: 'BCS', name: 'Baja California Sur' },
    { code: 'CAM', name: 'Campeche' },
    { code: 'CHP', name: 'Chiapas' },
    { code: 'CHH', name: 'Chihuahua' },
    { code: 'CMX', name: 'Ciudad de México' },
    { code: 'COA', name: 'Coahuila' },
    { code: 'COL', name: 'Colima' },
    { code: 'DUR', name: 'Durango' },
    { code: 'GUA', name: 'Guanajuato' },
    { code: 'GRO', name: 'Guerrero' },
    { code: 'HID', name: 'Hidalgo' },
    { code: 'JAL', name: 'Jalisco' },
    { code: 'MEX', name: 'México' },
    { code: 'MIC', name: 'Michoacán' },
    { code: 'MOR', name: 'Morelos' },
    { code: 'NAY', name: 'Nayarit' },
    { code: 'NLE', name: 'Nuevo León' },
    { code: 'OAX', name: 'Oaxaca' },
    { code: 'PUE', name: 'Puebla' },
    { code: 'QUE', name: 'Querétaro' },
    { code: 'ROO', name: 'Quintana Roo' },
    { code: 'SLP', name: 'San Luis Potosí' },
    { code: 'SIN', name: 'Sinaloa' },
    { code: 'SON', name: 'Sonora' },
    { code: 'TAB', name: 'Tabasco' },
    { code: 'TAM', name: 'Tamaulipas' },
    { code: 'TLA', name: 'Tlaxcala' },
    { code: 'VER', name: 'Veracruz' },
    { code: 'YUC', name: 'Yucatán' },
    { code: 'ZAC', name: 'Zacatecas' },
  ];

  /**
   * Get states/provinces for a country
   */
  static getStatesForCountry(countryCode: string): StateProvince[] | null {
    switch (countryCode.toUpperCase()) {
      case 'US':
        return this.US_STATES;
      case 'CA':
        return this.CA_PROVINCES;
      case 'IN':
        return this.IN_STATES;
      case 'NP':
        return this.NP_PROVINCES;
      case 'AU':
        return this.AU_STATES;
      case 'BR':
        return this.BR_STATES;
      case 'JP':
        return this.JP_PREFECTURES;
      case 'CN':
        return this.CN_PROVINCES;
      case 'MX':
        return this.MX_STATES;
      default:
        return null;
    }
  }

  /**
   * Check if a country has predefined states/provinces
   */
  static hasStatesForCountry(countryCode: string): boolean {
    return this.getStatesForCountry(countryCode) !== null;
  }

  /**
   * Validate state/province code for a country
   */
  static isValidStateCode(countryCode: string, stateCode: string): boolean {
    const states = this.getStatesForCountry(countryCode);
    if (!states) return true; // If no states defined, any value is valid
    
    return states.some(state => state.code === stateCode.toUpperCase());
  }

  /**
   * Get state/province name by code
   */
  static getStateName(countryCode: string, stateCode: string): string | null {
    const states = this.getStatesForCountry(countryCode);
    if (!states) return null;
    
    const state = states.find(s => s.code === stateCode.toUpperCase());
    return state?.name || null;
  }
}