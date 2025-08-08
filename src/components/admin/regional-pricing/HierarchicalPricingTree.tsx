/**
 * HierarchicalPricingTree - Visual Pricing Hierarchy Management
 * 
 * Features:
 * - Tree view: Global → Continental → Regional → Country
 * - Pricing inheritance visualization
 * - Drag-and-drop country reorganization
 * - Inherited vs Override indicators
 * - Bulk pricing by hierarchy level
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Globe,
  Map,
  MapPin,
  ChevronDown,
  ChevronRight,
  Edit2,
  ArrowDownRight,
  Wrench,
  TreePine,
  Layers,
  Target,
  Plus,
  Minus,
  ArrowDown,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Percent,
  DollarSign,
  X
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface PricingNode {
  id: string;
  level: 'global' | 'continental' | 'regional' | 'country';
  name: string;
  code?: string; // For countries and regions
  rate: number;
  isInherited: boolean;
  isOverridden: boolean;
  source: string;
  children: PricingNode[];
  min_amount: number;
  max_amount?: number;
  coverage_count?: number; // Number of countries covered
  parent_id?: string;
}

interface HierarchicalPricingTreeProps {
  serviceKey: string;
  serviceName: string;
  pricingType: 'percentage' | 'fixed';
  pricingMatrix?: any; // The actual pricing data
  countries: any[]; // List of all countries
  onRateUpdate: (nodeId: string, newRate: number) => Promise<void>;
  onHierarchyReorganize?: (changes: any[]) => Promise<void>;
}

interface CalculatedRanges {
  continental: { min: number; max: number };
  regional: { min: number; max: number };
  country: { min: number; max: number };
}

// ============================================================================
// CONTINENTAL MAPPINGS AND PREDEFINED REGIONS
// ============================================================================

const ContinentalColors = {
  'Asia': 'bg-blue-500',
  'Europe': 'bg-green-500', 
  'Africa': 'bg-yellow-500',
  'North America': 'bg-purple-500',
  'South America': 'bg-red-500',
  'Oceania': 'bg-cyan-500',
  'Antarctica': 'bg-gray-500'
} as const;

const PredefinedRegions = [
  {
    key: 'south_asia',
    name: 'South Asia',
    continent: 'Asia',
    countries: ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF']
  },
  {
    key: 'southeast_asia', 
    name: 'Southeast Asia',
    continent: 'Asia',
    countries: ['TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'MM', 'KH', 'LA', 'BN']
  },
  {
    key: 'east_asia',
    name: 'East Asia', 
    continent: 'Asia',
    countries: ['JP', 'KR', 'CN', 'TW', 'HK', 'MO']
  },
  {
    key: 'western_europe',
    name: 'Western Europe',
    continent: 'Europe', 
    countries: ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'IE']
  },
  {
    key: 'northern_europe',
    name: 'Northern Europe',
    continent: 'Europe',
    countries: ['SE', 'NO', 'DK', 'FI', 'IS']
  },
  {
    key: 'north_america_premium',
    name: 'North America Premium',
    continent: 'North America',
    countries: ['US', 'CA']
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HierarchicalPricingTree: React.FC<HierarchicalPricingTreeProps> = ({
  serviceKey,
  serviceName,
  pricingType,
  pricingMatrix,
  countries,
  onRateUpdate,
  onHierarchyReorganize
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['global']));
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showInheritanceFlow, setShowInheritanceFlow] = useState<boolean>(true);

  // ============================================================================
  // DYNAMIC RANGE CALCULATION FROM REAL DATA
  // ============================================================================

  const calculateDynamicRanges = useMemo((): CalculatedRanges => {
    if (!pricingMatrix || !countries || countries.length === 0) {
      // Fallback to default ranges if no data available
      return {
        continental: { min: 0.015, max: 0.035 },
        regional: { min: 0.012, max: 0.022 },
        country: { min: 0.010, max: 0.016 }
      };
    }

    // Extract all rates from the pricing matrix
    const allRates = Object.values(pricingMatrix.countries).map(c => c.rate);
    const continentalRates: number[] = [];
    const regionalRates: number[] = [];
    const countryRates: number[] = [];

    Object.values(pricingMatrix.countries).forEach((pricing: any) => {
      switch (pricing.tier) {
        case 'continental':
          continentalRates.push(pricing.rate);
          break;
        case 'regional':
          regionalRates.push(pricing.rate);
          break;
        case 'country':
          countryRates.push(pricing.rate);
          break;
        default:
          // Global tier rates don't go into specific ranges
          break;
      }
    });

    // Calculate ranges with fallbacks
    const calculateMinMax = (rates: number[], fallbackMin: number, fallbackMax: number) => {
      if (rates.length === 0) {
        return { min: fallbackMin, max: fallbackMax };
      }
      return {
        min: Math.min(...rates),
        max: Math.max(...rates)
      };
    };

    return {
      continental: calculateMinMax(continentalRates, 0.015, 0.035),
      regional: calculateMinMax(regionalRates, 0.012, 0.022),
      country: calculateMinMax(countryRates, 0.010, 0.016)
    };
  }, [pricingMatrix, countries]);

  // ============================================================================
  // REAL DATA GENERATION FROM PROPS
  // ============================================================================

  const pricingHierarchy: PricingNode = useMemo(() => {
    if (!pricingMatrix || !countries || countries.length === 0) {
      // Return a simple loading structure
      return {
        id: 'global',
        level: 'global',
        name: 'Loading...',
        rate: 0,
        isInherited: false,
        isOverridden: false,
        source: 'Loading data...',
        min_amount: 0,
        children: []
      };
    }

    // Group countries by continent
    const continentGroups = countries.reduce((acc, country) => {
      const continent = country.continent || 'Other';
      if (!acc[continent]) acc[continent] = [];
      acc[continent].push(country);
      return acc;
    }, {} as Record<string, any[]>);

    // Build continental nodes
    const continentalNodes: PricingNode[] = Object.entries(continentGroups).map(([continent, continentCountries]) => {
      // Get average rate for this continent
      const continentRates = continentCountries.map(c => pricingMatrix.countries[c.code]?.rate || 0.025);
      const avgRate = continentRates.reduce((sum, rate) => sum + rate, 0) / continentRates.length;
      
      // Get regional groups for this continent
      const regionGroups: Record<string, any[]> = {};
      continentCountries.forEach(country => {
        const region = PredefinedRegions.find(r => 
          r.continent === continent && r.countries.includes(country.code)
        );
        if (region) {
          if (!regionGroups[region.key]) regionGroups[region.key] = [];
          regionGroups[region.key].push(country);
        } else {
          // Countries not in any predefined region go to "Other"
          if (!regionGroups['other']) regionGroups['other'] = [];
          regionGroups['other'].push(country);
        }
      });

      // Build regional nodes
      const regionalNodes: PricingNode[] = Object.entries(regionGroups).map(([regionKey, regionCountries]) => {
        const region = PredefinedRegions.find(r => r.key === regionKey);
        const regionRates = regionCountries.map(c => pricingMatrix.countries[c.code]?.rate || avgRate);
        const regionAvgRate = regionRates.reduce((sum, rate) => sum + rate, 0) / regionRates.length;

        // Build country nodes for this region
        const countryNodes: PricingNode[] = regionCountries.map(country => {
          const pricing = pricingMatrix.countries[country.code];
          return {
            id: country.code,
            level: 'country' as const,
            name: country.name,
            code: country.code,
            rate: pricing?.rate || regionAvgRate,
            isInherited: pricing?.tier !== 'country',
            isOverridden: pricing?.tier === 'country',
            source: pricing?.source || `Inherited from ${region?.name || continent}`,
            min_amount: pricing?.min_amount || 0,
            max_amount: pricing?.max_amount,
            parent_id: regionKey,
            children: []
          };
        });

        return {
          id: regionKey,
          level: 'regional' as const,
          name: region?.name || 'Other Countries',
          rate: regionAvgRate,
          isInherited: false,
          isOverridden: regionKey !== 'other',
          source: region ? 'Regional pricing' : 'Continental fallback',
          min_amount: regionCountries.length > 0 ? Math.min(...regionCountries.map(c => pricingMatrix.countries[c.code]?.min_amount || 0)) : 0,
          max_amount: regionCountries.length > 0 ? Math.max(...regionCountries.map(c => pricingMatrix.countries[c.code]?.max_amount || 0)) : undefined,
          coverage_count: regionCountries.length,
          parent_id: continent.toLowerCase().replace(' ', '_'),
          children: countryNodes
        };
      });

      return {
        id: continent.toLowerCase().replace(' ', '_'),
        level: 'continental' as const,
        name: continent,
        rate: avgRate,
        isInherited: false,
        isOverridden: true,
        source: 'Continental pricing',
        min_amount: continentCountries.length > 0 ? Math.min(...continentCountries.map(c => pricingMatrix.countries[c.code]?.min_amount || 0)) : 0,
        max_amount: continentCountries.length > 0 ? Math.max(...continentCountries.map(c => pricingMatrix.countries[c.code]?.max_amount || 0)) : undefined,
        coverage_count: continentCountries.length,
        parent_id: 'global',
        children: regionalNodes
      };
    });

    // Get global rate from pricing matrix or use fallback
    const globalRate = pricingMatrix.globalConfig?.default_rate || 0.025;
    const globalMinAmount = pricingMatrix.globalConfig?.min_amount || 2.00;
    const globalMaxAmount = pricingMatrix.globalConfig?.max_amount || 250.00;

    return {
      id: 'global',
      level: 'global' as const,
      name: 'Global Default',
      rate: globalRate,
      isInherited: false,
      isOverridden: false,
      source: pricingMatrix.globalConfig ? 'Database configuration' : 'System default',
      min_amount: globalMinAmount,
      max_amount: globalMaxAmount,
      coverage_count: countries.length,
      children: continentalNodes
    };
  }, [pricingMatrix, countries]);


  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleNodeToggle = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (expandedNodes.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleEditStart = (nodeId: string, currentRate: number) => {
    setEditingNode(nodeId);
    setEditRate(currentRate.toString());
  };

  const handleEditSave = async (nodeId: string) => {
    const newRate = parseFloat(editRate);
    if (isNaN(newRate) || newRate < 0) {
      toast({
        title: 'Invalid rate',
        description: 'Please enter a valid positive number',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onRateUpdate(nodeId, newRate);
      setEditingNode(null);
      setEditRate('');
      toast({
        title: 'Rate updated successfully',
        description: `${nodeId} rate updated to ${(newRate * 100).toFixed(2)}%`
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: 'Update failed',
        variant: 'destructive'
      });
    }
  };

  const handleEditCancel = () => {
    setEditingNode(null);
    setEditRate('');
  };

  // ============================================================================
  // UTILITY FUNCTIONS  
  // ============================================================================

  const getNodeIcon = (level: PricingNode['level']) => {
    switch (level) {
      case 'global': return Globe;
      case 'continental': return Map;  
      case 'regional': return Layers;
      case 'country': return MapPin;
      default: return TreePine;
    }
  };

  const getInheritanceIndicator = (node: PricingNode) => {
    if (node.isOverridden) {
      return (
        <Badge variant="default" className="text-xs bg-orange-100 text-orange-800">
          <Wrench className="w-3 h-3 mr-1" />
          Override
        </Badge>
      );
    } else if (node.isInherited) {
      return (
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
          <ArrowDownRight className="w-3 h-3 mr-1" />
          Inherited
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Default
        </Badge>
      );
    }
  };

  const calculateInheritanceChain = (node: PricingNode, chain: PricingNode[] = []): PricingNode[] => {
    const newChain = [...chain, node];
    if (node.parent_id && node.isInherited) {
      const parent = findNodeById(pricingHierarchy, node.parent_id);
      if (parent) {
        return calculateInheritanceChain(parent, newChain);
      }
    }
    return newChain.reverse();
  };

  const findNodeById = (root: PricingNode, id: string): PricingNode | null => {
    if (root.id === id) return root;
    
    for (const child of root.children) {
      const result = findNodeById(child, id);
      if (result) return result;
    }
    
    return null;
  };

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderPricingNode = (node: PricingNode, depth: number = 0) => {
    const IconComponent = getNodeIcon(node.level);
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNode === node.id;

    return (
      <div key={node.id} className="space-y-2">
        {/* Node Row */}
        <div 
          className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm hover:bg-gray-50 ${
            depth === 0 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' 
              : depth === 1 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' 
              : depth === 2 
              ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' 
              : 'bg-white border-gray-200'
          }`}
          style={{ marginLeft: `${depth * 32}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm" 
              onClick={() => handleNodeToggle(node.id)}
              className="h-8 w-8 p-0 hover:bg-white/50"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </div>
          )}
          
          {/* Node Icon */}
          <div className={`p-3 rounded-full shadow-sm ${
            node.level === 'global' ? 'bg-blue-500' :
            node.level === 'continental' 
              ? ContinentalColors[node.name as keyof typeof ContinentalColors] || 'bg-gray-500'
              : node.level === 'regional' ? 'bg-yellow-500'
              : 'bg-purple-500'
          }`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>

          {/* Node Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-semibold text-lg truncate">
                {node.name}
                {node.code && <span className="font-mono text-sm text-gray-600 ml-1">({node.code})</span>}
              </h4>
              <div className="flex items-center gap-2">
                {getInheritanceIndicator(node)}
                {node.coverage_count && (
                  <Badge variant="outline" className="text-xs bg-white">
                    {node.coverage_count} {node.coverage_count === 1 ? 'country' : 'countries'}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate" title={node.source}>
              {node.source}
            </p>
          </div>

          {/* Rate Display/Edit */}
          <div className="flex items-center gap-3">
            {isEditing ? (
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                <Input
                  type="number"
                  step="0.001"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-24 h-8 text-sm text-right"
                  autoFocus
                />
                <span className="text-xs text-gray-500 font-medium">
                  {pricingType === 'percentage' ? '%' : 'USD'}
                </span>
                <Button size="sm" onClick={() => handleEditSave(node.id)} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right bg-white p-3 rounded-lg border shadow-sm">
                  <div className="font-bold text-2xl text-green-600 leading-none">
                    {pricingType === 'percentage' 
                      ? `${(node.rate * 100).toFixed(2)}%`
                      : `$${node.rate.toFixed(2)}`
                    }
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${node.min_amount.toFixed(2)} - {node.max_amount ? `$${node.max_amount.toFixed(2)}` : '∞'}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditStart(node.id, node.rate)}
                  className="h-10 w-10 p-0 rounded-full hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-3 mt-4">
            {node.children.map(child => renderPricingNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderControlPanel = () => (
    <Card className="border-0 shadow-none bg-gradient-to-r from-blue-50 to-green-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TreePine className="w-5 h-5 text-blue-600" />
              Pricing Hierarchy Controls
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Explore {serviceName} pricing across all organizational levels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-inheritance"
              checked={showInheritanceFlow}
              onChange={(e) => setShowInheritanceFlow(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="show-inheritance" className="text-sm cursor-pointer">
              Show inheritance flow
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Filter Level:</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="continental">Continental Only</SelectItem>
                <SelectItem value="regional">Regional Only</SelectItem>
                <SelectItem value="country">Countries Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Region
          </Button>

          <Button variant="outline" size="sm">
            <Target className="w-4 h-4 mr-2" />
            Reorganize
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {renderControlPanel()}

      {/* Inheritance Flow Explanation */}
      {showInheritanceFlow && (
        <div className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <ArrowDown className="h-4 w-4 text-blue-600" />
              Pricing Flow:
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">Global</span>
                <span className="text-blue-600 text-xs">
                  {pricingType === 'percentage' 
                    ? `${((pricingMatrix?.globalConfig?.default_rate || 0.025) * 100).toFixed(1)}%`
                    : `$${(pricingMatrix?.globalConfig?.default_rate || 15).toFixed(0)}`
                  }
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <Map className="w-4 h-4 text-green-600" />
                <span className="text-green-800 font-medium">Continental</span>
                <span className="text-green-600 text-xs">
                  {pricingType === 'percentage' 
                    ? `${(calculateDynamicRanges.continental.min * 100).toFixed(1)}-${(calculateDynamicRanges.continental.max * 100).toFixed(1)}%`
                    : `$${calculateDynamicRanges.continental.min.toFixed(0)}-${calculateDynamicRanges.continental.max.toFixed(0)}`
                  }
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                <Layers className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800 font-medium">Regional</span>
                <span className="text-yellow-600 text-xs">
                  {pricingType === 'percentage' 
                    ? `${(calculateDynamicRanges.regional.min * 100).toFixed(1)}-${(calculateDynamicRanges.regional.max * 100).toFixed(1)}%`
                    : `$${calculateDynamicRanges.regional.min.toFixed(0)}-${calculateDynamicRanges.regional.max.toFixed(0)}`
                  }
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-purple-800 font-medium">Country</span>
                <span className="text-purple-600 text-xs">
                  {pricingType === 'percentage' 
                    ? `${(calculateDynamicRanges.country.min * 100).toFixed(1)}-${(calculateDynamicRanges.country.max * 100).toFixed(1)}%`
                    : `$${calculateDynamicRanges.country.min.toFixed(0)}-${calculateDynamicRanges.country.max.toFixed(0)}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchical Tree */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Layers className="w-6 h-6 text-blue-600" />
                {serviceName} Pricing Hierarchy
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {pricingType === 'percentage' ? 'Percentage-based' : 'Fixed-rate'} pricing structure with inherited rules
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {pricingHierarchy.coverage_count} countries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {renderPricingNode(pricingHierarchy)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};