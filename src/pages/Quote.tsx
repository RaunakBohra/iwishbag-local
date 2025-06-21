import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QuoteForm from "@/components/forms/QuoteForm";
import { 
  Package, 
  Clock, 
  Shield, 
  Globe, 
  Star, 
  ArrowRight, 
  CheckCircle,
  Truck,
  DollarSign,
  Users,
  ShoppingBag,
  Plane,
  Sparkles,
  Zap
} from "lucide-react";

const Quote = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="container py-8 md:py-16">
        {/* Hero content removed */}
      </div>

      {/* Main Content Grid */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <CardHeader className="text-center pb-8">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl md:text-4xl font-bold">
                    Get Your Shopping Quote
                  </CardTitle>
                  <CardDescription className="text-lg max-w-2xl mx-auto">
                    Share the products you want from international stores, and we'll get them for you. 
                    It only takes a few minutes!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 md:px-8 pb-8">
              <QuoteForm />
            </CardContent>
          </Card>
        </div>
      </div>

      

      
    </div>
  );
};

export default Quote;
