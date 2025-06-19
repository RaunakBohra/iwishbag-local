import { HomePageSettings } from "@/integrations/supabase/types";

interface ValuePropsSectionProps {
  settings: HomePageSettings | null;
}

interface ValueProp {
  icon?: string;
  title: string;
  desc: string;
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
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            Why Choose Us
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover what makes us the preferred choice for your shopping needs
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {valueProps.map((prop, index) => (
            <div 
              key={index}
              className="group backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white/30 hover:border-primary/30"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {prop.icon && (
                <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {prop.icon}
                </div>
              )}
              <h3 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
                {prop.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                {prop.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 