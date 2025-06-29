import React, { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Keyboard,
  MousePointer
} from "lucide-react";

interface AccessibilityContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  keyboardNavigation: boolean;
  toggleKeyboardNavigation: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.style.fontSize = `${fontSize}px`;

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Keyboard navigation
    if (keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [highContrast, fontSize, reducedMotion, keyboardNavigation]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));
  const resetFontSize = () => setFontSize(16);
  const toggleReducedMotion = () => setReducedMotion(!reducedMotion);
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const toggleKeyboardNavigation = () => setKeyboardNavigation(!keyboardNavigation);

  const value = {
    highContrast,
    toggleHighContrast,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    reducedMotion,
    toggleReducedMotion,
    soundEnabled,
    toggleSound,
    keyboardNavigation,
    toggleKeyboardNavigation,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Accessibility toolbar component
export const AccessibilityToolbar: React.FC = () => {
  const {
    highContrast,
    toggleHighContrast,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    reducedMotion,
    toggleReducedMotion,
    soundEnabled,
    toggleSound,
    keyboardNavigation,
    toggleKeyboardNavigation,
  } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Main accessibility button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full shadow-lg"
          aria-label="Accessibility settings"
        >
          <Keyboard className="h-5 w-5" />
        </Button>

        {/* Accessibility panel */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-background border rounded-lg shadow-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Accessibility</h3>
              <Badge variant="secondary">A11y</Badge>
            </div>
            
            <Separator />

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {highContrast ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="text-sm">High Contrast</span>
              </div>
              <Button
                variant={highContrast ? "default" : "outline"}
                size="sm"
                onClick={toggleHighContrast}
              >
                {highContrast ? "On" : "Off"}
              </Button>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Font Size</span>
                <span className="text-xs text-muted-foreground">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseFontSize}
                  disabled={fontSize <= 12}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFontSize}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseFontSize}
                  disabled={fontSize >= 24}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Reduced Motion</span>
              <Button
                variant={reducedMotion ? "default" : "outline"}
                size="sm"
                onClick={toggleReducedMotion}
              >
                {reducedMotion ? "On" : "Off"}
              </Button>
            </div>

            {/* Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span className="text-sm">Sound</span>
              </div>
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleSound}
              >
                {soundEnabled ? "On" : "Off"}
              </Button>
            </div>

            {/* Keyboard Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                <span className="text-sm">Keyboard Nav</span>
              </div>
              <Button
                variant={keyboardNavigation ? "default" : "outline"}
                size="sm"
                onClick={toggleKeyboardNavigation}
              >
                {keyboardNavigation ? "On" : "Off"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Keyboard navigation hook
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if not in keyboard navigation mode
      if (!document.documentElement.classList.contains('keyboard-navigation')) {
        return;
      }

      // Tab navigation enhancement
      if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}; 