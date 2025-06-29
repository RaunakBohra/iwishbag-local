import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

interface HeroSectionProps {
  settings: Database["public"]["Tables"]["footer_settings"]["Row"] | null;
}

const HeroSection = ({ settings }: HeroSectionProps) => {
  if (!settings) return null;

  // Only use the background image if hero_banner_url is set and not empty after trimming
  const heroBannerUrl = settings.hero_banner_url?.trim();
  const backgroundImage = heroBannerUrl ? `url(${heroBannerUrl})` : undefined;

  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-16 text-center">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
          <h1 className="mb-6 text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent leading-tight">
            {settings.hero_headline || "Welcome to Global Wishlist Hub"}
          </h1>
          <p className="mb-8 text-xl md:text-2xl text-gray-200 font-light leading-relaxed max-w-3xl mx-auto">
            {settings.hero_subheadline || "Your one-stop destination for all your shopping needs"}
          </p>
          {settings.hero_cta_text && settings.hero_cta_link ? (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg font-semibold rounded-full"
              onClick={() => window.location.href = settings.hero_cta_link}
            >
              {settings.hero_cta_text}
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-lg font-semibold rounded-full"
              onClick={() => window.location.href = '/auth'}
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary/60 rounded-full animate-bounce" />
      <div className="absolute top-40 right-20 w-3 h-3 bg-blue-400/60 rounded-full animate-bounce delay-300" />
      <div className="absolute bottom-20 left-20 w-2 h-2 bg-purple-400/60 rounded-full animate-bounce delay-700" />
      <div className="absolute bottom-40 right-10 w-5 h-5 bg-green-400/60 rounded-full animate-bounce delay-1000" />
    </section>
  );
};

export default HeroSection; 