/**
 * TAX DETAIL PANEL
 *
 * Contextual slide-in panel that serves as the "Spoke" component in our
 * Hub and Spoke navigation pattern. Provides detailed configuration options
 * based on the selected context (methods, valuations, or breakdown).
 *
 * Design Principles:
 * - Contextual content: Shows only relevant information
 * - Smooth animations: Professional slide-in/out transitions
 * - Breadcrumb navigation: Clear path back to overview
 * - Responsive layout: Adapts to screen size
 *
 * Features:
 * - Sliding panel animation with backdrop
 * - Dynamic content based on panel type
 * - Integrated close and navigation controls
 * - Mobile-friendly responsive behavior
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, ArrowLeft, Settings, DollarSign, BarChart3, ChevronRight, Home } from 'lucide-react';
import { LayoutCard, Flex, Stack, Heading, Text } from '@/components/ui/layout-system';
import { DualCalculationMethodSelector } from '../tax-method-selection/DualCalculationMethodSelector';
import { PerItemValuationSelector } from '../tax-method-selection/PerItemValuationSelector';
import { CompactHSNTaxBreakdown } from '../smart-components/CompactHSNTaxBreakdown';
import type { UnifiedQuote } from '@/types/unified-quote';

export type PanelType = 'methods' | 'valuations' | 'breakdown';

interface PanelConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  breadcrumb: string[];
}

interface TaxDetailPanelProps {
  isOpen: boolean;
  panelType: PanelType;
  quote: UnifiedQuote | null;
  onClose: () => void;
  onMethodChange: (method: string, metadata?: any) => void;
  onValuationChange: (itemId: string, method: string, amount?: number) => void;
  onRecalculate: () => void;
  currentMethod?: string;
  itemValuationMethods?: Record<string, string>;
  isCalculating?: boolean;
  className?: string;
}

export const TaxDetailPanel: React.FC<TaxDetailPanelProps> = ({
  isOpen,
  panelType,
  quote,
  onClose,
  onMethodChange,
  onValuationChange,
  onRecalculate,
  currentMethod = 'auto',
  itemValuationMethods = {},
  isCalculating = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [contentKey, setContentKey] = useState(0); // Force re-render when panel type changes

  // Panel configurations
  const panelConfigs: Record<PanelType, PanelConfig> = {
    methods: {
      title: 'Tax Calculation Methods',
      description: 'Configure how taxes are calculated for this quote',
      icon: <Settings className="h-5 w-5" />,
      breadcrumb: ['Tax Overview', 'Methods'],
    },
    valuations: {
      title: 'Item Valuations',
      description: 'Configure valuation methods for individual items',
      icon: <DollarSign className="h-5 w-5" />,
      breadcrumb: ['Tax Overview', 'Valuations'],
    },
    breakdown: {
      title: 'Tax Breakdown',
      description: 'Detailed breakdown of tax calculations',
      icon: <BarChart3 className="h-5 w-5" />,
      breadcrumb: ['Tax Overview', 'Breakdown'],
    },
  };

  const currentConfig = panelConfigs[panelType];

  // Handle panel visibility animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setContentKey((prev) => prev + 1); // Force content refresh
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close panel on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderPanelContent = () => {
    if (!quote) {
      return (
        <div className="flex items-center justify-center h-64">
          <Text color="muted">No quote data available</Text>
        </div>
      );
    }

    switch (panelType) {
      case 'methods':
        return (
          <DualCalculationMethodSelector
            quoteId={quote.id}
            originCountry={quote.origin_country}
            destinationCountry={quote.destination_country}
            currentMethod={currentMethod}
            onMethodChange={onMethodChange}
            adminId="current_admin" // Would be replaced with actual admin ID
            isLoading={isCalculating}
            className="border-0 shadow-none bg-transparent p-0"
          />
        );

      case 'valuations':
        return quote.items ? (
          <PerItemValuationSelector
            items={quote.items}
            quoteId={quote.id}
            originCountry={quote.origin_country}
            destinationCountry={quote.destination_country}
            currentValuationMethods={itemValuationMethods}
            onValuationChange={onValuationChange}
            adminId="current_admin" // Would be replaced with actual admin ID
            isLoading={isCalculating}
            className="border-0 shadow-none bg-transparent p-0"
            showComparison={true}
            showPreview={true}
            allowAdminOverride={true}
            compactMode={false}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <Text color="muted">No items found in this quote</Text>
          </div>
        );

      case 'breakdown':
        return (
          <CompactHSNTaxBreakdown
            quote={quote}
            isCalculating={isCalculating}
            compact={false}
            onRecalculate={onRecalculate}
            onUpdateQuote={() => {}} // Would be connected to quote update handler
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <Text color="muted">Unknown panel type</Text>
          </div>
        );
    }
  };

  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-white">
            <div className="p-6">
              {/* Navigation breadcrumb */}
              <Flex align="center" gap="sm" className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100"
                >
                  <Home className="h-4 w-4" />
                </Button>
                {currentConfig.breadcrumb.map((crumb, index) => (
                  <React.Fragment key={crumb}>
                    {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                    <Text
                      size="sm"
                      color={index === currentConfig.breadcrumb.length - 1 ? 'primary' : 'muted'}
                      weight={index === currentConfig.breadcrumb.length - 1 ? 'medium' : 'normal'}
                    >
                      {crumb}
                    </Text>
                  </React.Fragment>
                ))}
              </Flex>

              {/* Title and description */}
              <Flex justify="between" align="start">
                <Stack spacing="sm">
                  <Flex align="center" gap="sm">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      {currentConfig.icon}
                    </div>
                    <Heading level={2} size="xl">
                      {currentConfig.title}
                    </Heading>
                  </Flex>
                  <Text color="muted">{currentConfig.description}</Text>
                  {quote && (
                    <Flex align="center" gap="sm">
                      <Badge variant="outline">
                        {quote.origin_country} → {quote.destination_country}
                      </Badge>
                      <Badge variant="secondary">Quote #{quote.display_id}</Badge>
                    </Flex>
                  )}
                </Stack>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Flex>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div key={contentKey}>{renderPanelContent()}</div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
            <div className="p-4">
              <Flex justify="between" align="center">
                <Flex align="center" gap="sm">
                  {isCalculating && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <Text size="sm" color="muted">
                        Calculating...
                      </Text>
                    </>
                  )}
                </Flex>

                <Flex gap="sm">
                  <Button variant="outline" onClick={onClose}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Overview
                  </Button>
                  <Button onClick={onRecalculate} disabled={isCalculating}>
                    Apply Changes
                  </Button>
                </Flex>
              </Flex>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
