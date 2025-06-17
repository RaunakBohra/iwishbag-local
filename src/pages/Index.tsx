import { useEffect, useState } from "react";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { ValuePropsSection } from "@/components/home/ValuePropsSection";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <main>
      <HeroSection settings={settings} />
      <HowItWorksSection settings={settings} />
      <ValuePropsSection settings={settings} />
    </main>
  );
}
