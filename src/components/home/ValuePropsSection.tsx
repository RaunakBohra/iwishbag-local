import { HomePageSettings } from "@/integrations/supabase/types";

interface ValuePropsSectionProps {
  settings: HomePageSettings | null;
}

interface ValueProp {
  title: string;
  description: string;
}

export const ValuePropsSection = ({ settings }: ValuePropsSectionProps) => {
  if (!settings) return null;
  
  let valueProps: ValueProp[] = [];
  try {
    valueProps = settings.value_props ? JSON.parse(settings.value_props) : [];
  } catch (e) {
    console.error('Error parsing value_props:', e);
  }

  if (valueProps.length === 0) return null;

  return (
    <section className="py-10 md:py-16 bg-gradient-to-b from-[#e0fbfc] via-[#f6fdff] to-[#e0fbfc]">
      <div className="container mx-auto px-2 md:px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Why Choose Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {valueProps.map((prop, index) => (
            <div 
              key={index}
              className="p-4 md:p-6 border border-[#b3eaff]/20 rounded-xl transition-transform transition-shadow duration-200 hover:shadow-lg hover:scale-[1.03] bg-transparent"
            >
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">{prop.title}</h3>
              <p className="text-sm md:text-base text-gray-600">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 