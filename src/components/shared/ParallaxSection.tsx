import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
  speed?: number;
  overlay?: boolean;
  overlayOpacity?: number;
}

export const ParallaxSection = ({
  children,
  className,
  backgroundImage,
  speed = 0.5,
  overlay = true,
  overlayOpacity = 0.5,
}: ParallaxSectionProps) => {
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const isInView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (isInView) {
          setScrollY(window.scrollY);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={sectionRef} className={cn('relative overflow-hidden', className)}>
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              transform: `translateY(${scrollY * speed}px) scale(1.1)`,
            }}
          />
          {overlay && (
            <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
          )}
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
