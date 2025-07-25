/**
 * TAX HUB CONTAINER
 * 
 * Main container implementing the Hub and Spoke navigation pattern.
 * Replaces the cramped tabbed interface with a professional, scalable
 * design that prioritizes user experience and information hierarchy.
 * 
 * Architecture:
 * - Hub: TaxOverviewHub (central dashboard)
 * - Spokes: TaxDetailPanel (contextual slide-in panels)
 * - Responsive: Adapts layout based on screen size
 * - State Management: Coordinates between hub and spokes
 * 
 * Features:
 * - Intelligent layout switching (sidebar vs overlay)
 * - Smooth transitions between views
 * - Context preservation during navigation
 * - Mobile-optimized responsive behavior
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Container, Grid, Stack, useBreakpoint } from '@/components/ui/layout-system';
import { TaxOverviewHub } from './TaxOverviewHub';
import { TaxDetailPanel, PanelType } from './TaxDetailPanel';
import type { UnifiedQuote } from '@/types/unified-quote';

interface TaxHubContainerProps {
  quote: UnifiedQuote;
  isCalculating?: boolean;
  onMethodChange: (method: string, metadata?: any) => void;
  onValuationChange: (itemId: string, method: string, amount?: number) => void;
  onRecalculate: () => void;
  onUpdateQuote?: () => void;
  className?: string;
  // Legacy support - these props maintain compatibility with existing interface
  compact?: boolean;
  editMode?: boolean;
}

export const TaxHubContainer: React.FC<TaxHubContainerProps> = ({
  quote,
  isCalculating = false,
  onMethodChange,
  onValuationChange,
  onRecalculate,
  onUpdateQuote,
  className = '',
  compact = false,
  editMode = true
}) => {
  // State
  const [activePanelType, setActivePanelType] = useState<PanelType | null>(null);
  const [currentMethod, setCurrentMethod] = useState<string>(
    quote?.calculation_method_preference || 'auto'
  );
  const [itemValuationMethods, setItemValuationMethods] = useState<Record<string, string>>({});
  
  // Responsive behavior
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  
  // Panel state
  const isPanelOpen = activePanelType !== null;

  /**
   * Initialize state from quote data
   */
  useEffect(() => {
    if (quote) {
      setCurrentMethod(quote.calculation_method_preference || 'auto');
      
      // Load item valuation methods from operational data
      if (quote.operational_data?.item_valuation_preferences) {
        setItemValuationMethods(quote.operational_data.item_valuation_preferences);
      }
    }
  }, [quote?.id, quote?.calculation_method_preference, quote?.operational_data]);

  /**
   * Handle opening detail panels
   */
  const handleOpenDetailPanel = useCallback((panelType: PanelType) => {
    setActivePanelType(panelType);
  }, []);

  /**
   * Handle closing detail panels
   */
  const handleClosePanel = useCallback(() => {
    setActivePanelType(null);
  }, []);

  /**
   * Handle tax method changes with state synchronization
   */
  const handleMethodChange = useCallback(async (method: string, metadata?: any) => {
    try {
      setCurrentMethod(method);
      await onMethodChange(method, metadata);
      
      // Close panel on mobile after successful change
      if (isMobile && activePanelType === 'methods') {
        setActivePanelType(null);
      }
    } catch (error) {
      console.error('Method change error:', error);
      // Revert state on error
      setCurrentMethod(quote?.calculation_method_preference || 'auto');
    }
  }, [onMethodChange, isMobile, activePanelType, quote?.calculation_method_preference]);

  /**
   * Handle valuation method changes with state synchronization
   */
  const handleValuationChange = useCallback(async (itemId: string, method: string, amount?: number) => {
    try {
      setItemValuationMethods(prev => ({ ...prev, [itemId]: method }));
      await onValuationChange(itemId, method, amount);
      
      // Close panel on mobile after successful change
      if (isMobile && activePanelType === 'valuations') {
        setActivePanelType(null);
      }
    } catch (error) {
      console.error('Valuation change error:', error);
      // Revert state on error
      setItemValuationMethods(prev => {
        const reverted = { ...prev };
        delete reverted[itemId];
        return reverted;
      });
    }
  }, [onValuationChange, isMobile, activePanelType]);

  /**
   * Handle recalculation with panel management
   */
  const handleRecalculate = useCallback(async () => {
    try {
      await onRecalculate();
      
      // On mobile, close panel after recalculation to show results
      if (isMobile && activePanelType) {
        setTimeout(() => setActivePanelType(null), 500);
      }
    } catch (error) {
      console.error('Recalculation error:', error);
    }
  }, [onRecalculate, isMobile, activePanelType]);

  // Compact mode: render minimal hub only
  if (compact) {
    return (
      <div className={className}>
        <TaxOverviewHub
          quote={quote}
          isCalculating={isCalculating}
          onMethodChange={handleMethodChange}
          onOpenDetailPanel={handleOpenDetailPanel}
          onRecalculate={handleRecalculate}
        />
        
        {/* Detail panel for compact mode */}
        {isPanelOpen && (
          <TaxDetailPanel
            isOpen={isPanelOpen}
            panelType={activePanelType!}
            quote={quote}
            onClose={handleClosePanel}
            onMethodChange={handleMethodChange}
            onValuationChange={handleValuationChange}
            onRecalculate={handleRecalculate}
            currentMethod={currentMethod}
            itemValuationMethods={itemValuationMethods}
            isCalculating={isCalculating}
          />
        )}
      </div>
    );
  }

  // Desktop layout: Hub and Spoke with responsive behavior
  if (!isMobile && isPanelOpen) {
    return (
      <Container className={className}>
        <Grid cols={2} gap="lg">
          {/* Hub: Always visible */}
          <div>
            <TaxOverviewHub
              quote={quote}
              isCalculating={isCalculating}
              onMethodChange={handleMethodChange}
              onOpenDetailPanel={handleOpenDetailPanel}
              onRecalculate={handleRecalculate}
            />
          </div>
          
          {/* Spoke: Contextual detail panel */}
          <div>
            <TaxDetailPanel
              isOpen={true} // Always open in sidebar mode
              panelType={activePanelType!}
              quote={quote}
              onClose={handleClosePanel}
              onMethodChange={handleMethodChange}
              onValuationChange={handleValuationChange}
              onRecalculate={handleRecalculate}
              currentMethod={currentMethod}
              itemValuationMethods={itemValuationMethods}
              isCalculating={isCalculating}
              className="relative transform-none shadow-lg rounded-lg border"
            />
          </div>
        </Grid>
      </Container>
    );
  }

  // Default layout: Hub with overlay panels
  return (
    <div className={className}>
      <Container>
        <Stack spacing="lg">
          {/* Main Hub */}
          <TaxOverviewHub
            quote={quote}
            isCalculating={isCalculating}
            onMethodChange={handleMethodChange}
            onOpenDetailPanel={handleOpenDetailPanel}
            onRecalculate={handleRecalculate}
          />
        </Stack>
      </Container>
      
      {/* Overlay Detail Panel */}
      {isPanelOpen && (
        <TaxDetailPanel
          isOpen={isPanelOpen}
          panelType={activePanelType!}
          quote={quote}
          onClose={handleClosePanel}
          onMethodChange={handleMethodChange}
          onValuationChange={handleValuationChange}
          onRecalculate={handleRecalculate}
          currentMethod={currentMethod}
          itemValuationMethods={itemValuationMethods}
          isCalculating={isCalculating}
        />
      )}
    </div>
  );
};