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
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {valueProps.map((prop, index) => (
            <div 
              key={index}
              className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-3">{prop.title}</h3>
              <p className="text-gray-600">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 