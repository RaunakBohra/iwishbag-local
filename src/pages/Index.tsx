import { useEffect, useState } from "react";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import HeroSection from "@/components/home/HeroSection";
import { ValuePropsSection } from "@/components/home/ValuePropsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator } from "lucide-react";

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
    <main 
      className="min-h-screen" 
      style={{ 
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        fontFamily: "'Poppins', sans-serif",
        background: 'linear-gradient(to bottom, #00aeb0 0%, #00c4d6 25%, #00d9db 50%, #00e5d4 75%, #ffe9c4 100%)',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        color: '#052a2e'
      }}
    >
      <HeroSection settings={settings} />
      <ValuePropsSection settings={settings} />
      <section className="py-16 flex justify-center">
        <div className="relative max-w-2xl w-full text-center px-6 py-16 rounded-2xl bg-white/60 backdrop-blur-md border border-[#b3eaff] shadow-2xl animate-glow group overflow-visible">
          {/* Floating Icon */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-tr from-[#1ad1ff] to-[#00e5d4] rounded-full p-5 shadow-xl z-20">
            <Calculator className="h-12 w-12 text-white" />
          </div>
          {/* Testimonial/Quote Overlay */}
          <div className="flex flex-col items-center mb-10 mt-4">
            <div className="relative bg-white border border-[#b3eaff] rounded-xl px-6 py-4 shadow-md max-w-md mx-auto mb-4">
              <span className="absolute -top-6 left-1/2 -translate-x-1/2">
                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" className="w-12 h-12 rounded-full border-2 border-[#b3eaff] shadow" />
              </span>
              <blockquote className="text-[#052a2e] text-base italic mt-8">“The cost estimator was spot on! I knew exactly what I'd pay before ordering. Super easy and transparent.”</blockquote>
              <div className="mt-2 text-xs text-[#052a2e]/60">— Rajesh, Mumbai</div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#052a2e] drop-shadow">Instant Cost Estimator</h2>
          <p className="text-lg text-[#052a2e]/80 mb-8">Curious about your total cost? Use our free, instant Cost Estimator to get a transparent quote for shipping, customs, and more—before you buy!</p>
          <a href="/cost-estimator">
            <button className="btn-signin text-lg px-8 py-4 rounded-xl shadow-lg transition-transform hover:scale-105">
              Try the Cost Estimator
            </button>
          </a>
          {/* Interactive Hover/Reveal Tip */}
          <div className="max-w-md mx-auto mt-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none select-none">
            <div className="bg-[#b3eaff]/20 text-[#052a2e] rounded-lg px-4 py-3 shadow-inner text-base font-medium">
              💡 <span className="font-semibold">Tip:</span> You can estimate costs for over 50 countries—no signup needed!
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
