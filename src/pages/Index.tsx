import { useEffect, useState } from "react";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import HeroSection from "@/components/home/HeroSection";
import { ValuePropsSection } from "@/components/home/ValuePropsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { settings, loading, error } = useHomePageSettings();

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-500">Error loading homepage content. Please try again later.</div>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[600px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection settings={settings} />
      {/* Supported Countries */}
      <div className="container py-16">
        
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Shop from These Countries
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We help you shop from major international markets
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇺🇸</span>
              </div>
              <h3 className="font-semibold">United States</h3>
              <p className="text-sm text-muted-foreground text-center">
                Amazon, Walmart, Best Buy, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇨🇳</span>
              </div>
              <h3 className="font-semibold">China</h3>
              <p className="text-sm text-muted-foreground text-center">
                Taobao, JD, AliExpress, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇯🇵</span>
              </div>
              <h3 className="font-semibold">Japan</h3>
              <p className="text-sm text-muted-foreground text-center">
                Rakuten, Amazon Japan, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇬🇧</span>
              </div>
              <h3 className="font-semibold">United Kingdom</h3>
              <p className="text-sm text-muted-foreground text-center">
                Amazon UK, Argos, and more
              </p>
            </div>
          </div>
        </div>
      </div>

      <ValuePropsSection settings={settings} />
      <section className="py-16 flex justify-center">
        <div className="relative max-w-2xl w-full text-center px-6 py-16 rounded-2xl bg-card/60 backdrop-blur-md border border-border shadow-2xl animate-glow group overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="relative bg-card border border-border rounded-xl px-6 py-4 shadow-md max-w-md mx-auto mb-4">
              <div className="flex items-center space-x-3">
                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" className="w-12 h-12 rounded-full border-2 border-border shadow" />
                <div>
                  <blockquote className="text-foreground text-base italic mt-8">"The cost estimator was spot on! I knew exactly what I'd pay before ordering. Super easy and transparent."</blockquote>
                  <div className="mt-2 text-xs text-muted-foreground">— Rajesh, Mumbai</div>
                </div>
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground drop-shadow">Instant Cost Estimator</h2>
            <p className="text-lg text-muted-foreground mb-8">Curious about your total cost? Use our free, instant Cost Estimator to get a transparent quote for shipping, customs, and more—before you buy!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="btn-signin">
                <Link to="/cost-estimator">Try Cost Estimator</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/quote">Get Quote</Link>
              </Button>
            </div>
            
            <div className="bg-accent/20 text-foreground rounded-lg px-4 py-3 shadow-inner text-base font-medium">
              💡 <span className="font-semibold">Tip:</span> You can estimate costs for over 50 countries—no signup needed!
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
