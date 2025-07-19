import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';
import { useAnimationPause } from '@/hooks/useAnimationPause';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    location: 'Mumbai, India',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    rating: 5,
    date: '2 weeks ago',
    product: 'iPhone 15 Pro from USA',
    review:
      'Amazing service! Got my iPhone delivered in just 10 days. The price was 30% cheaper than local stores, even after customs. The tracking was accurate throughout.',
    flag: '🇮🇳',
    savedAmount: '₹25,000',
  },
  {
    id: 2,
    name: 'Raju Thapa',
    location: 'Kathmandu, Nepal',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    rating: 5,
    date: '1 month ago',
    product: 'Gaming Laptop from China',
    review:
      "Found a great gaming laptop on JD.com that wasn't available in Nepal. The team handled everything perfectly. Customs clearance was smooth!",
    flag: '🇳🇵',
    savedAmount: 'NPR 45,000',
  },
  {
    id: 3,
    name: 'Sarah Johnson',
    location: 'London, UK',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    rating: 5,
    date: '3 weeks ago',
    product: 'Japanese Skincare Set',
    review:
      "I've been trying to get authentic Japanese skincare products for months. This service made it so easy! Products arrived well-packaged and genuine.",
    flag: '🇬🇧',
    savedAmount: '£150',
  },
];

export const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const sectionRef = useAnimationPause();

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <section
      ref={sectionRef}
      className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
    >
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fadeInUp">
          <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            What Our{' '}
            <span className="bg-gradient-to-r from-teal-600 to-orange-600 bg-clip-text text-transparent">
              Customers Say
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of happy customers shopping globally with confidence
          </p>
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto relative">
          {/* Main Testimonial */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 relative transition-all duration-500">
            {/* Quote Icon */}
            <Quote className="absolute top-6 right-6 w-16 h-16 text-gray-100" />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <LazyImage
                    src={testimonials[currentIndex].avatar}
                    alt={testimonials[currentIndex].name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-gray-100"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      {testimonials[currentIndex].name}
                      <span className="text-2xl">{testimonials[currentIndex].flag}</span>
                    </h3>
                    <p className="text-sm text-gray-600">{testimonials[currentIndex].location}</p>
                  </div>
                </div>

                {/* Rating and Date */}
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < testimonials[currentIndex].rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{testimonials[currentIndex].date}</span>
                </div>
              </div>

              {/* Product Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-gray-700">
                  Purchased:{' '}
                  <span className="text-teal-600">{testimonials[currentIndex].product}</span>
                </p>
                <p className="text-sm font-medium text-green-600 mt-1">
                  Saved: {testimonials[currentIndex].savedAmount}
                </p>
              </div>

              {/* Review Text */}
              <p className="text-lg text-gray-700 leading-relaxed italic">
                "{testimonials[currentIndex].review}"
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full ml-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-teal-600 transition-colors" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full mr-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-teal-600 transition-colors" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-teal-600 rounded-full'
                    : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Trust Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto animate-fadeInUp">
          {[
            { label: 'Happy Customers', value: '50,000+' },
            { label: 'Average Rating', value: '4.9/5' },
            { label: 'Countries Served', value: '100+' },
            { label: 'Repeat Customers', value: '85%' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
