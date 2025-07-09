import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fadeIn" | "fadeInUp" | "fadeInDown" | "fadeInLeft" | "fadeInRight" | "zoomIn" | "slideIn";
  delay?: number;
  threshold?: number;
  once?: boolean;
}

export const AnimatedSection = ({
  children,
  className,
  animation = "fadeInUp",
  delay = 0,
  threshold = 0.1,
  once = true
}: AnimatedSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated.current)) {
          setIsVisible(true);
          hasAnimated.current = true;
        } else if (!once && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const animationClasses = {
    fadeIn: "animate-fadeIn",
    fadeInUp: "animate-fadeInUp",
    fadeInDown: "animate-fadeInDown",
    fadeInLeft: "animate-fadeInLeft",
    fadeInRight: "animate-fadeInRight",
    zoomIn: "animate-zoomIn",
    slideIn: "animate-slideIn"
  };

  return (
    <div
      ref={sectionRef}
      className={cn(
        "transition-all duration-700",
        isVisible ? animationClasses[animation] : "opacity-0",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};