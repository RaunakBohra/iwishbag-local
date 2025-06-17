import { Button } from "@/components/ui/button";
import { HomePageSettings } from "@/integrations/supabase/types";

interface HeroSectionProps {
  settings: HomePageSettings | null;
}

export const HeroSection = ({ settings }: HeroSectionProps) => {
  if (!settings) return null;

  return (
    <section className="relative min-h-[600px] flex items-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${settings.hero_banner_url || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold md:text-6xl text-white">
          {settings.hero_headline || "Welcome to Global Wishlist Hub"}
        </h1>
        <p className="mb-8 text-xl md:text-2xl text-gray-200">
          {settings.hero_subheadline || "Your one-stop destination for all your shopping needs"}
        </p>
        {settings.hero_cta_text && settings.hero_cta_link ? (
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-white text-black hover:bg-gray-100"
            onClick={() => window.location.href = settings.hero_cta_link}
          >
            {settings.hero_cta_text}
          </Button>
        ) : (
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-white text-black hover:bg-gray-100"
            onClick={() => window.location.href = '/auth'}
          >
            Get Started
          </Button>
        )}
      </div>
    </section>
  );
}; 