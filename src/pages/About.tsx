import { Heart, Globe, Users } from 'lucide-react';
import { H1, H2, H3, Body, BodyLarge, StatNumber, StatLabel } from '@/components/ui/typography';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple Hero */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <H1 className="mb-6">
              About iwishBag
            </H1>
            <BodyLarge className="text-gray-600">
              We believe everyone should have access to the world's best products, 
              no matter where they live.
            </BodyLarge>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <H2 className="mb-6">
                  Our Mission
                </H2>
                <BodyLarge className="text-gray-600 mb-6">
                  Founded in 2019, iwishBag was born from a simple frustration: 
                  great products were often out of reach due to geography and 
                  complex international shipping.
                </BodyLarge>
                <BodyLarge className="text-gray-600">
                  Today, we connect customers worldwide to products they love, 
                  handling all the complexity of international shopping so you don't have to.
                </BodyLarge>
              </div>
              <div className="relative">
                <div className="w-full h-64 bg-gradient-to-br from-teal-50 to-orange-50 rounded-2xl flex items-center justify-center">
                  <Globe className="w-24 h-24 text-teal-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <H2 className="mb-12">
              What We Stand For
            </H2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-teal-600" />
                </div>
                <H3 className="mb-3">Transparency</H3>
                <Body className="text-gray-600">
                  No hidden fees, no surprises. You know exactly what you're paying for.
                </Body>
              </div>
              <div className="p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <H3 className="mb-3">Simplicity</H3>
                <Body className="text-gray-600">
                  International shopping should be as easy as buying from your local store.
                </Body>
              </div>
              <div className="p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-green-600" />
                </div>
                <H3 className="mb-3">Reliability</H3>
                <Body className="text-gray-600">
                  Your packages are safe with us. We handle every step with care.
                </Body>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="w-full h-64 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <StatNumber className="text-orange-600 mb-2">50,000+</StatNumber>
                    <StatLabel>Happy Customers</StatLabel>
                  </div>
                </div>
              </div>
              <div>
                <H2 className="mb-6">
                  Our Journey
                </H2>
                <BodyLarge className="text-gray-600 mb-6">
                  What started as a solution for a few friends has grown into a 
                  platform serving customers in over 100 countries.
                </BodyLarge>
                <BodyLarge className="text-gray-600">
                  Every day, we help thousands of people get the products they want, 
                  delivered safely to their door. That's what drives us forward.
                </BodyLarge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <H2 className="mb-6">
              Our Team
            </H2>
            <BodyLarge className="text-gray-600 mb-12 max-w-2xl mx-auto">
              We're a small but passionate team spread across the globe, 
              united by our mission to make international shopping accessible to everyone.
            </BodyLarge>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Sarah Chen',
                  role: 'CEO & Founder',
                  description: 'Former logistics executive who started iwishBag to solve her own international shopping challenges.',
                },
                {
                  name: 'David Kim',
                  role: 'Head of Operations',
                  description: 'Shipping expert ensuring every package gets to its destination safely and on time.',
                },
                {
                  name: 'Maya Patel',
                  role: 'Customer Success',
                  description: 'Your friendly voice when you need help, making sure every customer has a great experience.',
                },
              ].map((member, index) => (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <H3 className="mb-2">{member.name}</H3>
                  <Body className="text-teal-600 font-medium mb-3">{member.role}</Body>
                  <Body className="text-gray-600 text-sm">{member.description}</Body>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Simple Close */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <H2 className="mb-6">
              That's Our Story
            </H2>
            <BodyLarge className="text-gray-600">
              We're just getting started. Every day, we're working to make 
              international shopping simpler, more transparent, and more accessible.
            </BodyLarge>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
