import { createContext, useContext, ReactNode } from 'react';

interface SkeletonConfig {
  minimumLoadTime: number;
  showSkeletons: boolean;
  animationDuration: string;
}

const defaultConfig: SkeletonConfig = {
  minimumLoadTime: 300,
  showSkeletons: true,
  animationDuration: '1.5s',
};

const SkeletonContext = createContext<SkeletonConfig>(defaultConfig);

export function SkeletonProvider({ 
  children,
  config = defaultConfig 
}: { 
  children: ReactNode;
  config?: Partial<SkeletonConfig>;
}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return (
    <SkeletonContext.Provider value={mergedConfig}>
      <style>{`
        @keyframes skeleton-pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .animate-pulse {
          animation: skeleton-pulse ${mergedConfig.animationDuration} ease-in-out infinite;
        }
      `}</style>
      {children}
    </SkeletonContext.Provider>
  );
}

export function useSkeletonConfig() {
  return useContext(SkeletonContext);
}