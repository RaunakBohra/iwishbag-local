import AuthForm from "@/components/forms/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Shield, Users, Globe, Package, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { ParallaxSection } from "@/components/shared/ParallaxSection";

const Auth = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const features = [
    {
      icon: Package,
      title: "Global Shopping",
      description: "Shop from anywhere in the world"
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Bank-level encryption for all transactions"
    },
    {
      icon: Zap,
      title: "Fast Shipping",
      description: "Express delivery options available"
    },
    {
      icon: TrendingUp,
      title: "Best Prices",
      description: "Competitive rates with transparent fees"
    }
  ];

  const stats = [
    { value: 50000, label: "Happy Customers", suffix: "+" },
    { value: 100, label: "Countries", suffix: "+" },
    { value: 24, label: "Support", suffix: "/7" }
  ];

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-0 right-20 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '6s' }} />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Main Content */}
      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Side - Features */}
          <div className="flex-1 hidden lg:block">
            <AnimatedSection animation="fadeInLeft">
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">
                    Shop the World,<br />Ship to Your Door
                  </h2>
                  <p className="text-xl text-gray-600">
                    Access global products with transparent pricing and reliable shipping.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {features.map((feature, index) => (
                    <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                      <div className="group">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                            <feature.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                            <p className="text-sm text-gray-600">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    </AnimatedSection>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-8 pt-4">
                  {stats.map((stat, index) => (
                    <AnimatedSection key={index} animation="zoomIn" delay={index * 100}>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                        </div>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                      </div>
                    </AnimatedSection>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Right Side - Auth Form */}
          <div className="w-full max-w-md">
            <AnimatedSection animation="fadeInRight">
              {/* Brand Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-glow">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">iwishBag</h1>
                </div>
                <p className="text-gray-600 text-sm">Your gateway to global shopping</p>
              </div>

              {/* Auth Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
                <CardHeader className="text-center pb-6">
                  <AnimatedSection animation="zoomIn" delay={200}>
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </AnimatedSection>
                  <AnimatedSection animation="fadeInUp" delay={300}>
                    <CardTitle className="text-3xl font-bold text-gray-900">
                      Welcome Back
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-2">
                      Sign in to access your global shopping dashboard
                    </CardDescription>
                  </AnimatedSection>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <AnimatedSection animation="fadeIn" delay={400}>
                    <AuthForm />
                  </AnimatedSection>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <AnimatedSection animation="fadeInUp" delay={500}>
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-6 text-gray-600 text-sm">
                    <div className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer">
                      <Shield className="w-4 h-4" />
                      <span>SSL Secured</span>
                    </div>
                    <div className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer">
                      <Users className="w-4 h-4" />
                      <span>Trusted by 50K+</span>
                    </div>
                    <div className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer">
                      <Globe className="w-4 h-4" />
                      <span>100+ Countries</span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </AnimatedSection>
          </div>
        </div>
      </div>

      {/* Mobile Features (shown below form on mobile) */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent p-6">
        <AnimatedSection animation="fadeInUp">
          <div className="flex justify-around">
            {features.slice(0, 3).map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mx-auto mb-2">
                  <feature.icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-600">{feature.title}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default Auth;