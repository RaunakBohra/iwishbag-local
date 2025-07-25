import React from 'react';
import { Star, Quote } from 'lucide-react';

export const AirbnbTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Priya Sharma',
      location: 'Mumbai, India',
      rating: 5,
      text: 'Finally got my dream MacBook Pro from Best Buy US. The whole process was transparent and delivery was faster than expected.',
      product: 'MacBook Pro 16"',
      savings: '₹15,000'
    },
    {
      name: 'Arjun Patel',
      location: 'Kathmandu, Nepal', 
      rating: 5,
      text: 'Amazing service! Got my Nike collection from multiple US stores in one shipment. Saved a lot on shipping costs.',
      product: 'Nike Air Jordan Collection',
      savings: '$120'
    },
    {
      name: 'Sneha Gupta',
      location: 'Delhi, India',
      rating: 5,
      text: 'The team handled everything professionally. From purchase to customs clearance, I didn\'t have to worry about anything.',
      product: 'iPhone 15 Pro Max',
      savings: '₹8,500'
    }
  ];

  return (
    <div className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
            Trusted by thousands
          </h2>
          <p className="text-lg text-gray-600 font-light">
            Join customers who've discovered hassle-free international shopping
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-teal-600 mb-4 opacity-60" />

              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 mb-6 font-light leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Product & Savings */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div className="font-medium text-gray-900 mb-1">
                    {testimonial.product}
                  </div>
                  <div className="text-teal-600 font-medium">
                    Saved {testimonial.savings}
                  </div>
                </div>
              </div>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-light text-gray-900 mb-1">50,000+</div>
              <div className="text-sm text-gray-500">Happy Customers</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-900 mb-1">4.9/5</div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-900 mb-1">100+</div>
              <div className="text-sm text-gray-500">Supported Stores</div>
            </div>
            <div>
              <div className="text-2xl font-light text-gray-900 mb-1">7-14</div>
              <div className="text-sm text-gray-500">Days Delivery</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};