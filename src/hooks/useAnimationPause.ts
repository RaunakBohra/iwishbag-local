import { useRef, useEffect } from "react";

export const useAnimationPause = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleVisibilityChange = () => {
      const animations = element.getAnimations?.() || [];
      
      if (document.hidden) {
        animations.forEach(animation => {
          animation.pause();
        });
      } else {
        animations.forEach(animation => {
          animation.play();
        });
      }
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const animations = entry.target.getAnimations?.() || [];
        
        if (entry.isIntersecting) {
          animations.forEach(animation => {
            animation.play();
          });
        } else {
          animations.forEach(animation => {
            animation.pause();
          });
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1
    });
    
    observer.observe(element);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  return ref;
};