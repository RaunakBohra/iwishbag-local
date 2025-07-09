import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Package, Shield, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HeroSectionProps {
  settings: {
    hero_banner_url?: string;
    hero_headline?: string;
    hero_subheadline?: string;
    hero_cta_text?: string;
    hero_cta_link?: string;
  } | null;
}

const HeroSection = ({ settings }: HeroSectionProps) => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.bottom > 0) {
          setScrollY(window.scrollY);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!settings) return null;

  const heroBannerUrl = settings.hero_banner_url?.trim();
  const backgroundImage = heroBannerUrl ? `url(${heroBannerUrl})` : undefined;

  const floatingIcons = [
    { Icon: Package, delay: "0s", x: "10%", y: "20%" },
    { Icon: Globe, delay: "0.2s", x: "85%", y: "15%" },
    { Icon: Shield, delay: "0.4s", x: "15%", y: "75%" },
    { Icon: Zap, delay: "0.6s", x: "80%", y: "70%" }
  ];

  const stats = [
    { value: "50K+", label: "Happy Customers" },
    { value: "100+", label: "Countries Served" },
    { value: "24/7", label: "Customer Support" },
    { value: "5M+", label: "Products Delivered" }
  ];

  return (
    <section ref={heroRef} className="relative min-h-[700px] flex items-center overflow-hidden">
      {/* Parallax Background */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
          style={{
            backgroundImage,
            transform: `translateY(${scrollY * 0.5}px) scale(1.1)`,
          }}
        />
      )}
      
      {/* Enhanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      
      {/* Animated Mesh Gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient-shift" />
      </div>

      {/* Floating Icons */}
      {floatingIcons.map(({ Icon, delay, x, y }, index) => (
        <div
          key={index}
          className="absolute opacity-30 animate-float"
          style={{ 
            left: x, 
            top: y,
            animationDelay: delay,
            animationDuration: '3s'
          }}
        >
          <Icon className="w-12 h-12 text-white/50" />
        </div>
      ))}

      {/* Content */}
      <div 
        className="container relative z-10 mx-auto px-4 py-20"
        style={{ opacity: Math.max(0, 1 - scrollY / 500) }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 animate-fadeInUp">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-white/90">🎉 Free shipping on orders over $500</span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-5xl md:text-7xl lg:text-8xl font-bold leading-tight animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              {settings.hero_headline || "Shop the World,"}
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Delivered to You
            </span>
          </h1>

          {/* Subheading */}
          <p className="mb-8 text-xl md:text-2xl text-gray-200 font-light leading-relaxed max-w-3xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            {settings.hero_subheadline || "Access millions of products from Amazon, eBay, Alibaba and more. We handle everything - purchasing, shipping, and customs clearance."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg font-semibold rounded-full"
              onClick={() => window.location.href = settings.hero_cta_link || '/quote'}
            >
              {settings.hero_cta_text || "Get Your Free Quote"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline" 
              className="border-white/30 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:border-white/50 px-8 py-6 text-lg font-semibold rounded-full"
              onClick={() => window.location.href = '/cost-estimator'}
            >
              Calculate Costs Instantly
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center animate-bounce">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;