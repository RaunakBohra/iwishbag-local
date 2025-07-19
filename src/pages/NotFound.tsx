import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Home,
  Search,
  ArrowLeft,
  Compass,
  MapPin,
  HelpCircle,
  Mail,
  Sparkles,
  Package,
  ShoppingBag,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Display, H2, BodyLarge, Body } from '@/components/ui/typography';
import { Section, Container } from '@/components/ui/spacing';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  const quickLinks = [
    { label: 'Home', icon: Home, to: '/', color: 'bg-teal-50 text-teal-600' },
    {
      label: 'Request Quote',
      icon: Package,
      to: '/quote',
      color: 'from-orange-500 to-orange-600',
    },
    {
      label: 'Dashboard',
      icon: ShoppingBag,
      to: '/dashboard',
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'About Us',
      icon: Globe,
      to: '/about',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" />
        <div
          className="absolute top-0 -right-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-32 left-20 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
          style={{ animationDelay: '4s' }}
        />
        <div
          className="absolute bottom-0 right-20 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
          style={{ animationDelay: '6s' }}
        />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                i % 4 === 0
                  ? 'bg-teal-300'
                  : i % 4 === 1
                    ? 'bg-orange-300'
                    : i % 4 === 2
                      ? 'bg-pink-300'
                      : 'bg-yellow-300'
              } opacity-40`}
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Large 404 */}
          <AnimatedSection animation="zoomIn">
            <div className="mb-8">
              <h1 className="text-[12rem] md:text-[16rem] font-black bg-gradient-to-r from-teal-600 via-orange-600 to-pink-600 bg-clip-text text-transparent leading-none select-none">
                <AnimatedCounter end={404} duration={2000} />
              </h1>
            </div>
          </AnimatedSection>

          {/* Main Content Card */}
          <AnimatedSection animation="fadeInUp" delay={200}>
            <Card className="bg-white/80 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-300 mx-auto max-w-2xl">
              <CardContent className="p-8 md:p-12">
                <AnimatedSection animation="zoomIn" delay={300}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-orange-600 flex items-center justify-center mx-auto mb-6 animate-glow">
                    <Compass className="w-10 h-10 text-white" />
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="fadeInUp" delay={400}>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Oops! Page Not Found
                  </h2>
                  <p className="text-lg text-gray-600 mb-2">
                    It looks like you've wandered off the beaten path.
                  </p>
                  <p className="text-gray-500 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                  </p>
                </AnimatedSection>

                {/* Current Path Display */}
                <AnimatedSection animation="fadeIn" delay={500}>
                  <div className="bg-gradient-to-r from-gray-50 to-teal-50 rounded-lg p-4 mb-8">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">You tried to visit:</span>
                      <code className="bg-white px-2 py-1 rounded border text-red-600">
                        {location.pathname}
                      </code>
                    </div>
                  </div>
                </AnimatedSection>

                {/* Search Bar */}
                <AnimatedSection animation="fadeInUp" delay={600}>
                  <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search for what you need..."
                      className="pl-10 h-12 border-2 border-gray-200 focus:border-teal-500 transition-colors"
                    />
                  </div>
                </AnimatedSection>

                {/* Quick Links */}
                <AnimatedSection animation="fadeIn" delay={700}>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Navigation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {quickLinks.map((link, index) => (
                        <AnimatedSection key={index} animation="zoomIn" delay={800 + index * 100}>
                          <Link to={link.to}>
                            <div className="group p-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-teal-300">
                              <div
                                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center text-white mx-auto mb-2 group-hover:scale-110 transition-transform`}
                              >
                                <link.icon className="w-5 h-5" />
                              </div>
                              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                {link.label}
                              </p>
                            </div>
                          </Link>
                        </AnimatedSection>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>

                {/* Action Buttons */}
                <AnimatedSection animation="fadeInUp" delay={1200}>
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Button
                      asChild
                      className="flex-1 group bg-gradient-to-r from-teal-500 to-orange-600 hover:from-teal-600 hover:to-orange-700 h-12"
                    >
                      <Link to="/">
                        <Home className="w-5 h-5 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                        Go Home
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 group border-2 hover:bg-gray-50 h-12"
                    >
                      <Link to="/contact">
                        <HelpCircle className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                        Get Help
                      </Link>
                    </Button>
                  </div>
                </AnimatedSection>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Fun Message */}
          <AnimatedSection animation="fadeIn" delay={1400}>
            <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <p className="text-sm">Don't worry, even the best explorers get lost sometimes!</p>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
