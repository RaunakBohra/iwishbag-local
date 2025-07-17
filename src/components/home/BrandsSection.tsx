import { useAnimationPause } from '@/hooks/useAnimationPause';

const brands = [
  { name: 'Amazon' },
  { name: 'eBay' },
  { name: 'Walmart' },
  { name: 'AliExpress' },
  { name: 'Nike' },
  { name: 'Best Buy' },
  { name: 'Target' },
  { name: 'ASOS' },
  { name: 'Rakuten' },
  { name: 'Taobao' },
];

// Duplicate the brands array for seamless scrolling
const duplicatedBrands = [...brands, ...brands];

export const BrandsSection = () => {
  const sectionRef = useAnimationPause();

  return (
    <section ref={sectionRef} className="py-16 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="text-center animate-fadeInUp">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Shop from Your Favorite Brands
          </h2>
          <p className="text-gray-600">Access products from 1000+ global brands and retailers</p>
        </div>
      </div>

      {/* Scrolling Marquee */}
      <div className="relative">
        {/* Gradient Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10" />

        {/* Scrolling Container - CSS Animation */}
        <div className="flex gap-12 animate-scroll-x">
          {duplicatedBrands.map((brand, index) => (
            <div key={`${brand.name}-${index}`} className="flex-shrink-0 group">
              <div className="w-40 h-20 flex items-center justify-center bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 px-6 cursor-pointer">
                <span className="text-lg font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                  {brand.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Purchased Section */}
      <div className="container mx-auto px-4 mt-16">
        <div className="animate-fadeInUp">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Recently Purchased
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {[
              {
                product: 'iPhone 15 Pro',
                price: '$999',
                image: '📱',
                from: 'USA',
              },
              {
                product: 'Sony Camera',
                price: '$1,200',
                image: '📷',
                from: 'Japan',
              },
              {
                product: 'Gaming Console',
                price: '$499',
                image: '🎮',
                from: 'USA',
              },
              {
                product: 'Designer Bag',
                price: '$850',
                image: '👜',
                from: 'Italy',
              },
              {
                product: 'Smart Watch',
                price: '$399',
                image: '⌚',
                from: 'Korea',
              },
              {
                product: 'Sneakers',
                price: '$180',
                image: '👟',
                from: 'Germany',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition-all duration-300 text-center group animate-fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {item.image}
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">{item.product}</h4>
                <p className="text-lg font-bold text-blue-600">{item.price}</p>
                <p className="text-xs text-gray-500 mt-1">from {item.from}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
