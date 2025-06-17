import { HomePageSettings } from "@/integrations/supabase/types";

interface HowItWorksSectionProps {
  settings: HomePageSettings | null;
}

interface Step {
  title: string;
  description: string;
}

export const HowItWorksSection = ({ settings }: HowItWorksSectionProps) => {
  if (!settings) return null;

  let steps: Step[] = [];
  try {
    steps = settings.how_it_works_steps ? JSON.parse(settings.how_it_works_steps) : [];
  } catch (e) {
    console.error('Error parsing how_it_works_steps:', e);
  }

  if (steps.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Start creating and sharing your wishlist in just a few simple steps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">{step.title}</h3>
              <p className="text-gray-600 text-center">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 