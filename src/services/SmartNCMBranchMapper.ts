/**
 * Smart NCM Branch Mapper Service
 * Provides intelligent mapping between customer addresses and NCM branches
 * with confidence scoring and multiple matching strategies
 */

import { NCMBranch } from './NCMService';
import { NCMBranchMappingService } from './NCMBranchMappingService';
import { NepalAddressService, District } from './NepalAddressService';

export interface AddressInput {
  city?: string;
  district?: string;
  state?: string;
  state_province_region?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
}

export interface SmartBranchMapping {
  branch: NCMBranch;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  matchType: 'exact_district' | 'exact_city' | 'city_to_district' | 'fuzzy_match' | 'province_fallback';
  score: number; // 0-100 confidence score
}

export class SmartNCMBranchMapper {
  private static instance: SmartNCMBranchMapper;
  private nepalAddressService: NepalAddressService;
  private ncmBranchMappingService: NCMBranchMappingService;
  private cache = new Map<string, { data: SmartBranchMapping; timestamp: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  // Comprehensive city to district mappings for Nepal (200+ municipalities)
  private readonly CITY_TO_DISTRICT_MAP: Record<string, string> = {
    // Kathmandu Valley
    'kathmandu': 'kathmandu',
    'ktm': 'kathmandu', 
    'lalitpur': 'lalitpur',
    'patan': 'lalitpur',
    'bhaktapur': 'bhaktapur',
    'banepa': 'kavrepalanchok',
    'dhulikhel': 'kavrepalanchok',
    'panauti': 'kavrepalanchok',
    'namobuddha': 'kavrepalanchok',
    'kirtipur': 'kathmandu',
    'madhyapur': 'bhaktapur',
    'changunarayan': 'bhaktapur',
    'suryabinayak': 'bhaktapur',
    
    // Province 1 (Koshi)
    'biratnagar': 'morang',
    'dharan': 'sunsari',
    'itahari': 'sunsari',
    'damak': 'jhapa',
    'mechinagar': 'jhapa',
    'birtamod': 'jhapa',
    'kankai': 'jhapa',
    'arjundhara': 'jhapa',
    'shivasatakshi': 'jhapa',
    'gauradaha': 'jhapa',
    'buddhashanti': 'jhapa',
    'kamal': 'jhapa',
    'jhapa rural': 'jhapa',
    'urlabari': 'morang',
    'pathari-sanischare': 'morang',
    'rangeli': 'morang',
    'letang': 'morang',
    'sunwarshi': 'morang',
    'budhiganga': 'morang',
    'katahari': 'morang',
    'kerabari': 'morang',
    'miklajung': 'morang',
    'kanepokhari': 'morang',
    'inaruwa': 'sunsari',
    'duhabi': 'sunsari',
    'ramdhuni': 'sunsari',
    'barah': 'sunsari',
    'koshi': 'sunsari',
    'gadhi': 'sunsari',
    'barju': 'sunsari',
    'harinagar': 'sunsari',
    'dewanganj': 'sunsari',
    'bhokraha': 'sunsari',
    'rajghat': 'sunsari',
    'lahan': 'siraha',
    'dhangadhimai': 'siraha',
    'mirchaiya': 'siraha',
    'golbazar': 'siraha',
    'laxmipur': 'siraha',
    'bhagwanpur': 'siraha',
    'aurahi': 'siraha',
    'bishnupur': 'siraha',
    'bariyarpatti': 'siraha',
    'sukhipur': 'siraha',
    'naraha': 'siraha',
    'arnama': 'siraha',
    'navarajpur': 'siraha',
    'rajbiraj': 'saptari',
    'saptakoshi': 'saptari',
    'rupani': 'saptari',
    'bodebarsain': 'saptari',
    'kanchanrup': 'saptari',
    'agnisair': 'saptari',
    'balan-bihul': 'saptari',
    'bishnupur rural': 'saptari',
    'chhinnamasta': 'saptari',
    'mahadeva': 'saptari',
    'shambhunath': 'saptari',
    'tilathi': 'saptari',
    'tirhut': 'saptari',
    'udayapur': 'udayapur',
    'triyuga': 'udayapur',
    'katari': 'udayapur',
    'chaudandigadhi': 'udayapur',
    'belaka': 'udayapur',
    'rautamai': 'udayapur',
    'tapli': 'udayapur',
    'limchungbung': 'udayapur',
    'dhankuta': 'dhankuta',
    'pakhribas': 'dhankuta',
    'mahalaxmi': 'dhankuta',
    'sangurigadhi': 'dhankuta',
    'khalsa': 'dhankuta',
    'chaubise': 'dhankuta',
    'sahidbhumi': 'dhankuta',
    'ilam': 'ilam',
    'deumai': 'ilam',
    'mai': 'ilam',
    'suryodaya': 'ilam',
    'fakphokthum': 'ilam',
    'chulachuli': 'ilam',
    'rong': 'ilam',
    'mangsebung': 'ilam',
    'sandakpur': 'ilam',
    'maijogmai': 'ilam',
    'panchthar': 'panchthar',
    'phidim': 'panchthar',
    'hilihang': 'panchthar',
    'kummayak': 'panchthar',
    'miklajung rural': 'panchthar',
    'phalelung': 'panchthar',
    'phalgunanda': 'panchthar',
    'tumbewa': 'panchthar',
    'yangwarak': 'panchthar',
    
    // Bagmati Province
    'hetauda': 'makwanpur',
    'thaha': 'makwanpur',
    'makwanpurgadhi': 'makwanpur',
    'manahari': 'makwanpur',
    'raksirang': 'makwanpur',
    'bagmati': 'makwanpur',
    'kailash': 'makwanpur',
    'indrasarowar': 'makwanpur',
    'bakaiya': 'makwanpur',
    'bharatpur': 'chitwan',
    'rapti': 'chitwan',
    'kalika': 'chitwan',
    'khairahani': 'chitwan',
    'madi': 'chitwan',
    'ratnanagar': 'chitwan',
    'ichchhakamana': 'chitwan',
    'sindhuli': 'sindhuli',
    'kamalamai': 'sindhuli',
    'dudhouli': 'sindhuli',
    'sunkoshi': 'sindhuli',
    'hariharpur': 'sindhuli',
    'tinpatan': 'sindhuli',
    'marin': 'sindhuli',
    'golanjor': 'sindhuli',
    'ghyanglekh': 'sindhuli',
    'janakpur': 'dhanusha',
    'chhireshwarnath': 'dhanusha',
    'ganeshman': 'dhanusha',
    'dhanushadham': 'dhanusha',
    'nagarain': 'dhanusha',
    'bideha': 'dhanusha',
    'mithila': 'dhanusha',
    'mithilashaktipeeth': 'dhanusha',
    'hansapur': 'dhanusha',
    'shahidnagar': 'dhanusha',
    'sabaila': 'dhanusha',
    'kshireshwarnath': 'dhanusha',
    'mukhiyapatti': 'dhanusha',
    'aurahi dhanusha': 'dhanusha',
    'dhanauji': 'dhanusha',
    'jaleswor': 'mahottari',
    'bardibas': 'mahottari',
    'gaushala': 'mahottari',
    'loharpatti': 'mahottari',
    'ramgopalpur': 'mahottari',
    'manra': 'mahottari',
    'matihani': 'mahottari',
    'bhangaha': 'mahottari',
    'balwa': 'mahottari',
    'aaurahi mahottari': 'mahottari',
    'ekdanra': 'mahottari',
    'mahottari': 'mahottari',
    'pipara': 'mahottari',
    'sonma': 'mahottari',
    'samsi': 'mahottari',
    
    // Gandaki Province
    'pokhara': 'kaski',
    'annapurna': 'kaski',
    'machhapuchchhre': 'kaski',
    'madi kaski': 'kaski',
    'rupa': 'kaski',
    'gorkha': 'gorkha',
    'chum': 'gorkha',
    'ajirkot': 'gorkha',
    'tsum': 'gorkha',
    'dharche': 'gorkha',
    'bhimsen': 'gorkha',
    'shahid': 'gorkha',
    'siranchok': 'gorkha',
    'palungtar': 'gorkha',
    'barpak': 'gorkha',
    'sulikot': 'gorkha',
    'gandaki': 'gorkha',
    'besisahar': 'lamjung',
    'sundarbazar': 'lamjung',
    'kwholasothar': 'lamjung',
    'rainaskot': 'lamjung',
    'marsyandi': 'lamjung',
    'dordi': 'lamjung',
    'dudhpokhari': 'lamjung',
    'madhyanepal': 'lamjung',
    'bhainsundar': 'tanahu',
    'ghiring': 'tanahu',
    'bhanu': 'tanahu',
    'bhimad': 'tanahu',
    'myagde': 'tanahu',
    'bandipur': 'tanahu',
    'vyas': 'tanahu',
    'anbukhaireni': 'tanahu',
    'risingadevi': 'tanahu',
    'shuklagandaki': 'tanahu',
    'baglung': 'baglung',
    'galkot': 'baglung',
    'jaimuni': 'baglung',
    'dhorpatan': 'baglung',
    'kandebash': 'baglung',
    'baglung municipality': 'baglung',
    'tarakhola': 'baglung',
    'badigad': 'baglung',
    'taman': 'baglung',
    'tara': 'baglung',
    'nisikhola': 'baglung',
    'kushma': 'parbat',
    'phalewas': 'parbat',
    'jaljala': 'parbat',
    'paiyun': 'parbat',
    'mahashila': 'parbat',
    'modi': 'parbat',
    'bihadi': 'parbat',
    
    // Lumbini Province
    'butwal': 'rupandehi',
    'bhairahawa': 'rupandehi',
    'siddharthanagar': 'rupandehi',
    'devdaha': 'rupandehi',
    'lumbini': 'rupandehi',
    'sainamaina': 'rupandehi',
    'gaidahawa': 'rupandehi',
    'kanchan': 'rupandehi',
    'kotahimai': 'rupandehi',
    'marchawari': 'rupandehi',
    'mayadevi': 'rupandehi',
    'omsatiya': 'rupandehi',
    'rohini': 'rupandehi',
    'sammarimai': 'rupandehi',
    'siyari': 'rupandehi',
    'suddhodhan': 'rupandehi',
    'tillottama': 'rupandehi',
    'tulsipur': 'dang',
    'ghorahi': 'dang',
    'lamahi': 'dang',
    'gadhawa': 'dang',
    'rapti rural': 'dang',
    'shantinagar': 'dang',
    'babai': 'dang',
    'dangisharan': 'dang',
    'banke': 'banke',
    'nepalgunj': 'banke',
    'kohalpur': 'banke',
    'rapti-sonari': 'banke',
    'narainapur': 'banke',
    'duduwa': 'banke',
    'janaki': 'banke',
    'khajura': 'banke',
    'birgunj': 'parsa',
    'pokhariya': 'parsa',
    'bahudarmai': 'parsa',
    'parsagadhi': 'parsa',
    'bindabasini': 'parsa',
    'dhobini': 'parsa',
    'chhipaharmai': 'parsa',
    'jagarnathpur': 'parsa',
    'jirabhawani': 'parsa',
    'kalikamai': 'parsa',
    'pakaha': 'parsa',
    'paterwa': 'parsa',
    'sakhuwa': 'parsa',
    'thori': 'parsa',
    
    // Sudurpashchim Province
    'dhangadhi': 'kailali',
    'tikapur': 'kailali',
    'ghodaghodi': 'kailali',
    'lamkichuha': 'kailali',
    'bhajani': 'kailali',
    'godawari': 'kailali',
    'gauriganga': 'kailali',
    'janaki kailali': 'kailali',
    'kailari': 'kailali',
    'mohanyal': 'kailali',
    'mahendranagar': 'kanchanpur',
    'bhimdatta': 'kanchanpur',
    'bedkot': 'kanchanpur',
    'belauri': 'kanchanpur',
    'beldandi': 'kanchanpur',
    'krishnapur': 'kanchanpur',
    'laljhadi': 'kanchanpur',
    'punarbas': 'kanchanpur',
    'shuklaphanta': 'kanchanpur',
    'dipayal': 'doti',
    'silgadhi': 'doti',
    'shikhar': 'doti',
    'purbichauki': 'doti',
    'bogatan': 'doti',
    'jorayal': 'doti',
    'sayal': 'doti',
    'badikedar': 'doti',
    'adarsha': 'doti',
    
    // Alternative spellings and common variations
    'katmandu': 'kathmandu',
    'pokhra': 'kaski',
    'pkhra': 'kaski',
    'brtngr': 'morang',
    'birganj': 'parsa',
    'birtamode': 'jhapa',
    'dhrn': 'sunsari',
    'ithr': 'sunsari',
    'btl': 'rupandehi',
    'bairahawa': 'rupandehi',
    'siddharthanagar': 'rupandehi',
    'npljnj': 'banke',
    'dhngdh': 'kailali',
    'mhndrngr': 'kanchanpur',
    'jnkpr': 'dhanusha',
    'hetoda': 'makwanpur',
    'chtwn': 'chitwan',
    'bhrtpr': 'chitwan',
    
    // REVERSE MAPPINGS: District names to themselves (for cases where city field contains district name)
    'kaski': 'kaski',
    'morang': 'morang',
    'parsa': 'parsa',
    'sunsari': 'sunsari',
    'rupandehi': 'rupandehi',
    'banke': 'banke',
    'dhanusha': 'dhanusha',
    'makwanpur': 'makwanpur',
    'jhapa': 'jhapa',
    'siraha': 'siraha',
    'saptari': 'saptari',
    'chitwan': 'chitwan',
    'kavrepalanchok': 'kavrepalanchok',
    'bhaktapur': 'bhaktapur',
    'lalitpur': 'lalitpur',
    'kathmandu': 'kathmandu',
    'udayapur': 'udayapur',
    'dhankuta': 'dhankuta',
    'ilam': 'ilam',
    'panchthar': 'panchthar',
    'sindhuli': 'sindhuli',
    'mahottari': 'mahottari',
    'gorkha': 'gorkha',
    'lamjung': 'lamjung',
    'tanahu': 'tanahu',
    'baglung': 'baglung',
    'parbat': 'parbat',
    'dang': 'dang',
    'kailali': 'kailali',
    'kanchanpur': 'kanchanpur',
    'doti': 'doti'
  };

  // Common NCM branch name variations
  private readonly BRANCH_NAME_VARIATIONS: Record<string, string[]> = {
    'KATHMANDU': ['tinkune', 'ktm', 'kathmandu', 'katmandu'],
    'POKHARA': ['pokhara', 'pokhra', 'pkhra', 'kaski'],
    'CHITWAN': ['chitwan', 'bharatpur', 'narayanghat'],
    'BIRATNAGAR': ['biratnagar', 'brtngr'], // Specific branch for Biratnagar city
    'MORANG': ['morang'], // Generic Morang district branch (if exists)
    'LALITPUR': ['lalitpur', 'patan', 'lalit'],
    'JHAPA': ['damak', 'jhapa', 'mechinagar'],
    'PARSA': ['birgunj', 'birganj', 'parsa'],
    'SUNSARI': ['dharan', 'itahari', 'sunsari'],
    'RUPANDEHI': ['butwal', 'bhairahawa', 'rupandehi'],
    'BANKE': ['nepalgunj', 'banke'],
    'DHANUSHA': ['janakpur', 'dhanusha'],
    'MAKWANPUR': ['hetauda', 'makwanpur']
  };

  private constructor() {
    this.nepalAddressService = new NepalAddressService();
    this.ncmBranchMappingService = NCMBranchMappingService.getInstance();
  }

  static getInstance(): SmartNCMBranchMapper {
    if (!SmartNCMBranchMapper.instance) {
      SmartNCMBranchMapper.instance = new SmartNCMBranchMapper();
    }
    return SmartNCMBranchMapper.instance;
  }

  /**
   * Find the best NCM branch match for given address with confidence scoring
   */
  async findBestMatch(address: AddressInput): Promise<SmartBranchMapping | null> {
    if (!address || (!address.city && !address.district && !address.state && !address.state_province_region)) {
      return null;
    }

    console.log('🧠 [SmartMapper] Finding best branch match for:', address);

    // Create cache key
    const cacheKey = this.createCacheKey(address);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 [SmartMapper] Using cached result');
      return cached;
    }

    try {
      console.log('📡 [SmartMapper] Fetching NCM branches...');
      const branches = await this.ncmBranchMappingService.getBranches();
      
      if (!branches) {
        console.error('❌ [SmartMapper] getBranches() returned null/undefined');
        return null;
      }
      
      if (branches.length === 0) {
        console.warn('⚠️ [SmartMapper] getBranches() returned empty array');
        return null;
      }

      console.log(`🔍 [SmartMapper] Found ${branches.length} NCM branches:`);
      console.log('🔍 [SmartMapper] Available NCM branches:', branches.map(b => ({
        name: b.name,
        district: b.district,
        coveredAreas: b.coveredAreas
      })));

      // NEW APPROACH: City-first matching with district fallback
      console.log(`🔍 [SmartMapper] Trying city-first matching for: ${address.city || 'no city'}`);
      
      // Strategy 1: Try exact city match first
      const cityMatch = this.findExactCityMatch(address, branches);
      if (cityMatch) {
        console.log(`✅ [SmartMapper] Found exact city match: ${cityMatch.branch.name} (${cityMatch.matchReason})`);
        this.setCache(cacheKey, cityMatch);
        return cityMatch;
      }

      // Strategy 2: Try city-to-district mapping
      const cityToDistrictMatch = this.findCityToDistrictMatch(address, branches);
      if (cityToDistrictMatch) {
        console.log(`✅ [SmartMapper] Found city-to-district match: ${cityToDistrictMatch.branch.name} (${cityToDistrictMatch.matchReason})`);
        this.setCache(cacheKey, cityToDistrictMatch);
        return cityToDistrictMatch;
      }

      // Strategy 3: If no exact match found, check if there are multiple branches in the district
      // In this case, we DON'T auto-select but let the UI show all district branches
      const districtBranches = await this.findDistrictBranches(address);
      if (districtBranches.length > 1) {
        console.log(`🏢 [SmartMapper] Found ${districtBranches.length} branches in district - letting user choose manually`);
        // Don't auto-select when multiple branches exist in district
        // The UI will show these as suggestions
        return null;
      } else if (districtBranches.length === 1) {
        // Only one branch in district, auto-select it
        console.log(`✅ [SmartMapper] Auto-selecting single branch in district: ${districtBranches[0].branch.name}`);
        this.setCache(cacheKey, districtBranches[0]);
        return districtBranches[0];
      }

      // Strategy 4: Try fuzzy matching as fallback
      const fuzzyMatch = this.findFuzzyMatch(address, branches);
      if (fuzzyMatch) {
        console.log(`✅ [SmartMapper] Found fuzzy match: ${fuzzyMatch.branch.name} (${fuzzyMatch.matchReason})`);
        this.setCache(cacheKey, fuzzyMatch);
        return fuzzyMatch;
      }

      console.log('❌ [SmartMapper] No suitable single match found');
      return null;

    } catch (error) {
      console.error('❌ [SmartMapper] Error finding branch match:', error);
      return null;
    }
  }

  /**
   * Find all branches in the same district (for multi-branch districts)
   */
  async findDistrictBranches(address: AddressInput): Promise<SmartBranchMapping[]> {
    if (!address || (!address.city && !address.district && !address.state && !address.state_province_region)) {
      return [];
    }

    try {
      const branches = await this.ncmBranchMappingService.getBranches();
      if (!branches || branches.length === 0) return [];

      const districtBranches: SmartBranchMapping[] = [];
      
      // Get district name from address or from city-to-district mapping
      let targetDistrict = address.district || address.state || address.state_province_region;
      
      // If no direct district, try to map from city
      if (!targetDistrict && address.city) {
        const mappedDistrict = this.CITY_TO_DISTRICT_MAP[address.city.toLowerCase().trim()];
        if (mappedDistrict) {
          targetDistrict = mappedDistrict;
        }
      }

      if (!targetDistrict) return [];

      const normalizedTargetDistrict = targetDistrict.toLowerCase().trim();

      // Find all branches in this district
      for (const branch of branches) {
        if (branch.district && branch.district.toLowerCase() === normalizedTargetDistrict) {
          districtBranches.push({
            branch,
            confidence: 'medium',
            matchReason: `Branch in ${targetDistrict} district`,
            matchType: 'exact_district',
            score: 70
          });
        }
      }

      // Sort by branch name for consistent ordering
      return districtBranches.sort((a, b) => a.branch.name.localeCompare(b.branch.name));
      
    } catch (error) {
      console.error('❌ [SmartMapper] Error finding district branches:', error);
      return [];
    }
  }

  /**
   * Get multiple suggestions with confidence scores
   */
  async getSuggestions(address: AddressInput, limit: number = 3): Promise<SmartBranchMapping[]> {
    try {
      const branches = await this.ncmBranchMappingService.getBranches();
      if (!branches || branches.length === 0) return [];

      const suggestions: SmartBranchMapping[] = [];
      
      // Collect all possible matches - same priority as findBestMatch
      const strategies = [
        () => this.findExactCityMatch(address, branches),        // 1st: City match
        () => this.findCityToDistrictMatch(address, branches),   // 2nd: City → District
        () => this.findExactDistrictMatch(address, branches),    // 3rd: District match
        () => this.findFuzzyMatch(address, branches)             // 4th: Fuzzy match
      ];

      for (const strategy of strategies) {
        const result = strategy();
        if (result && !suggestions.find(s => s.branch.name === result.branch.name)) {
          suggestions.push(result);
        }
      }

      // Sort by confidence score and return top suggestions
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('❌ [SmartMapper] Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Strategy 3: Exact district name match (fallback after city matching)
   */
  private findExactDistrictMatch(address: AddressInput, branches: NCMBranch[]): SmartBranchMapping | null {
    const district = address.district || address.state || address.state_province_region;
    if (!district) return null;

    const normalizedDistrict = district.toLowerCase().trim();
    
    for (const branch of branches) {
      if (branch.district && branch.district.toLowerCase() === normalizedDistrict) {
        return {
          branch,
          confidence: 'high',
          matchReason: `Exact district match: ${district}`,
          matchType: 'exact_district',
          score: 95
        };
      }
    }
    return null;
  }

  /**
   * Strategy 1: Exact city match (prioritized)
   * Matches user's city with NCM branch names and covered areas
   */
  private findExactCityMatch(address: AddressInput, branches: NCMBranch[]): SmartBranchMapping | null {
    const city = address.city;
    if (!city) return null;

    const normalizedCity = city.toLowerCase().trim();

    // Priority 1: Check if city name exactly matches branch name (e.g., "BIRATNAGAR" branch for "Biratnagar" city)
    for (const branch of branches) {
      if (branch.name && branch.name.toLowerCase() === normalizedCity) {
        return {
          branch,
          confidence: 'high',
          matchReason: `Exact city-to-branch name match: ${city} → ${branch.name}`,
          matchType: 'exact_city',
          score: 100
        };
      }
    }

    // Priority 2: Check if city is in branch covered areas (most accurate for multi-branch districts)
    for (const branch of branches) {
      if (branch.coveredAreas && Array.isArray(branch.coveredAreas)) {
        const exactAreaMatch = branch.coveredAreas.find(area => 
          area.toLowerCase().trim() === normalizedCity
        );
        if (exactAreaMatch) {
          return {
            branch,
            confidence: 'high',
            matchReason: `Exact city match in covered areas: ${exactAreaMatch}`,
            matchType: 'exact_city',
            score: 95
          };
        }
      }
    }

    // Priority 3: Check for partial matches in covered areas
    for (const branch of branches) {
      if (branch.coveredAreas && Array.isArray(branch.coveredAreas)) {
        const partialAreaMatch = branch.coveredAreas.find(area => 
          area.toLowerCase().includes(normalizedCity) || normalizedCity.includes(area.toLowerCase())
        );
        if (partialAreaMatch) {
          return {
            branch,
            confidence: 'high',
            matchReason: `City found in covered areas: ${partialAreaMatch}`,
            matchType: 'exact_city',
            score: 90
          };
        }
      }
    }

    // Priority 4: Check using city-to-branch name variations
    for (const branch of branches) {
      const branchVariations = this.BRANCH_NAME_VARIATIONS[branch.name.toUpperCase()] || [];
      if (branchVariations.some(variation => variation.toLowerCase() === normalizedCity)) {
        return {
          branch,
          confidence: 'high',
          matchReason: `City matches branch variation: ${city} → ${branch.name}`,
          matchType: 'exact_city',
          score: 88
        };
      }
    }

    return null;
  }

  /**
   * Strategy 2: City-to-district translation
   */
  private findCityToDistrictMatch(address: AddressInput, branches: NCMBranch[]): SmartBranchMapping | null {
    const city = address.city;
    if (!city) return null;

    const normalizedCity = city.toLowerCase().trim();
    const mappedDistrict = this.CITY_TO_DISTRICT_MAP[normalizedCity];
    
    if (mappedDistrict) {
      const districtBranches = branches.filter(branch => 
        branch.district && branch.district.toLowerCase() === mappedDistrict.toLowerCase()
      );
      
      if (districtBranches.length > 0) {
        // PRIORITY 1: Try to find a branch that matches the city name exactly
        const cityMatchBranch = districtBranches.find(branch => 
          branch.name.toLowerCase() === normalizedCity ||
          branch.name.toLowerCase().includes(normalizedCity)
        );
        
        if (cityMatchBranch) {
          return {
            branch: cityMatchBranch,
            confidence: 'high', // Higher confidence for exact city-branch match
            matchReason: `City mapped to district with matching branch: ${city} → ${mappedDistrict} (${cityMatchBranch.name})`,
            matchType: 'city_to_district',
            score: 90
          };
        }
        
        // PRIORITY 2: Check covered areas for exact city match
        const coveredAreaBranch = districtBranches.find(branch => 
          branch.coveredAreas && branch.coveredAreas.some(area => 
            area.toLowerCase().trim() === normalizedCity
          )
        );
        
        if (coveredAreaBranch) {
          return {
            branch: coveredAreaBranch,
            confidence: 'high',
            matchReason: `City found in covered areas: ${city} → ${mappedDistrict} (${coveredAreaBranch.name})`,
            matchType: 'city_to_district', 
            score: 85
          };
        }
        
        // PRIORITY 3: If multiple branches exist in district, don't auto-select (let UI show options)
        if (districtBranches.length > 1) {
          console.log(`🤔 [SmartMapper] Multiple branches in ${mappedDistrict} district, avoiding auto-selection for city: ${city}`);
          return null; // This will trigger the district branches display in UI
        }
        
        // PRIORITY 4: Only one branch in district, safe to select
        return {
          branch: districtBranches[0],
          confidence: 'medium',
          matchReason: `City mapped to district (single branch): ${city} → ${mappedDistrict}`,
          matchType: 'city_to_district',
          score: 75
        };
      }
    }
    
    // SPECIAL: Also check address_line1 for city names (handles messy address data)
    if (address.addressLine1) {
      const addressLine = address.addressLine1.toLowerCase();
      
      // Look for common city names in the address line
      for (const [cityName, districtName] of Object.entries(this.CITY_TO_DISTRICT_MAP)) {
        if (addressLine.includes(cityName)) {
          for (const branch of branches) {
            if (branch.district && branch.district.toLowerCase() === districtName.toLowerCase()) {
              return {
                branch,
                confidence: 'medium',
                matchReason: `City found in address line: ${cityName} → ${districtName}`,
                matchType: 'city_to_district',
                score: 75
              };
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Strategy 4: Fuzzy string matching (for typos and variations)
   */
  private findFuzzyMatch(address: AddressInput, branches: NCMBranch[]): SmartBranchMapping | null {
    const searchTerms = [
      address.city,
      address.district,
      address.state,
      address.state_province_region
    ].filter(Boolean).map(term => term!.toLowerCase().trim());

    if (searchTerms.length === 0) return null;

    let bestMatch: SmartBranchMapping | null = null;
    let bestScore = 0;

    for (const branch of branches) {
      // Check branch name variations
      const branchVariations = this.BRANCH_NAME_VARIATIONS[branch.name.toUpperCase()] || [];
      
      for (const searchTerm of searchTerms) {
        // Check direct similarity with branch district
        if (branch.district) {
          const similarity = this.calculateSimilarity(searchTerm, branch.district.toLowerCase());
          if (similarity > 0.7 && similarity * 70 > bestScore) {
            bestMatch = {
              branch,
              confidence: 'medium',
              matchReason: `Fuzzy match with district: ${searchTerm} ≈ ${branch.district}`,
              matchType: 'fuzzy_match',
              score: Math.round(similarity * 70)
            };
            bestScore = similarity * 70;
          }
        }

        // Check branch name variations
        for (const variation of branchVariations) {
          const similarity = this.calculateSimilarity(searchTerm, variation);
          if (similarity > 0.8 && similarity * 75 > bestScore) {
            bestMatch = {
              branch,
              confidence: 'medium',
              matchReason: `Fuzzy match with variation: ${searchTerm} ≈ ${variation}`,
              matchType: 'fuzzy_match',
              score: Math.round(similarity * 75)
            };
            bestScore = similarity * 75;
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Strategy 5: Province-based fallback
   */
  private findProvinceBasedFallback(address: AddressInput, branches: NCMBranch[]): SmartBranchMapping | null {
    // For now, return Kathmandu as fallback (most central)
    const kathmanduBranch = branches.find(b => 
      b.district.toLowerCase().includes('kathmandu') || 
      b.name.toLowerCase().includes('tinkune')
    );

    if (kathmanduBranch) {
      return {
        branch: kathmanduBranch,
        confidence: 'low',
        matchReason: 'Fallback to central location (Kathmandu)',
        matchType: 'province_fallback',
        score: 30
      };
    }

    return null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return (maxLen - distance) / maxLen;
  }

  /**
   * Cache management
   */
  private createCacheKey(address: AddressInput): string {
    return JSON.stringify({
      city: address.city?.toLowerCase(),
      district: address.district?.toLowerCase(),
      state: address.state?.toLowerCase(),
      state_province_region: address.state_province_region?.toLowerCase()
    });
  }

  private getFromCache(key: string): SmartBranchMapping | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: SmartBranchMapping): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const smartNCMBranchMapper = SmartNCMBranchMapper.getInstance();