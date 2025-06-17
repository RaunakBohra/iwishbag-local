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
    <section className="relative min-h-[600px] flex items-center">
      {/* Background Image */}
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
            variant="destructive"
            onClick={() => window.location.href = settings.hero_cta_link}
          >
            {settings.hero_cta_text}
          </Button>
        ) : (
          <Button 
            size="lg" 
            variant="destructive"
            onClick={() => window.location.href = '/auth'}
          >
            Get Started
          </Button>
        )}
      </div>
    </section>
  );
};

export default HeroSection; 