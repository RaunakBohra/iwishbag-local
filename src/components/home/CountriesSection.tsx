import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, MapPin, ShoppingBag } from "lucide-react";

const countries = [
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    description: "Shop from the world's largest marketplace",
    stores: ["Amazon", "Walmart", "Best Buy", "Target", "Nike"],
    popularProducts: ["Electronics", "Fashion", "Home Goods", "Sports Equipment"],
    brands: [
      "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
      "https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Best_Buy_logo_2018.svg"
    ],
    color: "from-blue-500 to-red-500"
  },
  {
    id: "china",
    name: "China",
    flag: "🇨🇳",
    description: "Direct access to manufacturers",
    stores: ["Taobao", "JD.com", "AliExpress", "1688", "Tmall"],
    popularProducts: ["Electronics", "Gadgets", "Fashion", "Home Decor"],
    brands: [
      "https://upload.wikimedia.org/wikipedia/en/1/11/Taobao_logo.svg",
      "https://upload.wikimedia.org/wikipedia/en/b/b2/AliExpress_logo.svg"
    ],
    color: "from-red-500 to-yellow-500"
  },
  {
    id: "japan",
    name: "Japan",
    flag: "🇯🇵",
    description: "Premium quality and unique products",
    stores: ["Rakuten", "Amazon Japan", "Mercari", "Yahoo Shopping"],
    popularProducts: ["Anime Goods", "Electronics", "Beauty", "Stationery"],
    brands: [
      "https://upload.wikimedia.org/wikipedia/commons/4/40/Rakuten_Global_Brand_Logo.svg"
    ],
    color: "from-red-500 to-white"
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    description: "European fashion and lifestyle",
    stores: ["Amazon UK", "Argos", "ASOS", "John Lewis"],
    popularProducts: ["Fashion", "Books", "Home & Garden", "Electronics"],
    brands: [
      "https://upload.wikimedia.org/wikipedia/commons/d/d5/ASOS_logo_2022.svg"
    ],
    color: "from-blue-600 to-red-600"
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    description: "Engineering excellence and quality",
    stores: ["Amazon.de", "Otto", "MediaMarkt", "Zalando"],
    popularProducts: ["Auto Parts", "Tools", "Electronics", "Fashion"],
    brands: [],
    color: "from-black to-yellow-500"
  },
  {
    id: "korea",
    name: "South Korea",
    flag: "🇰🇷",
    description: "K-Beauty and K-Fashion hub",
    stores: ["Coupang", "Gmarket", "11st", "SSG"],
    popularProducts: ["K-Beauty", "K-Fashion", "K-Pop Goods", "Electronics"],
    brands: [],
    color: "from-blue-600 to-red-600"
  }
];

export const CountriesSection = () => {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-20" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-100 rounded-full filter blur-3xl opacity-20" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Global Access</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Shop from <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">100+ Countries</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access millions of products from the world's biggest marketplaces
          </p>
        </motion.div>

        {/* Countries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {countries.map((country, index) => (
            <motion.div
              key={country.id}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              onMouseEnter={() => setHoveredCountry(country.id)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              <div className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 ${
                expandedCountry === country.id ? 'scale-105' : ''
              }`}>
                {/* Card Header */}
                <div className={`p-6 bg-gradient-to-br ${country.color} bg-opacity-10`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="text-6xl"
                        animate={{ 
                          scale: hoveredCountry === country.id ? 1.2 : 1,
                          rotate: hoveredCountry === country.id ? [0, -10, 10, 0] : 0
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {country.flag}
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{country.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{country.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Popular Stores */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {country.stores.slice(0, 3).map((store) => (
                      <span key={store} className="px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                        {store}
                      </span>
                    ))}
                    {country.stores.length > 3 && (
                      <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs font-medium text-gray-600">
                        +{country.stores.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Brand Logos */}
                  {country.brands.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                      {country.brands.map((brand, idx) => (
                        <img 
                          key={idx} 
                          src={brand} 
                          alt="Brand" 
                          className="h-6 object-contain filter grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                        />
                      ))}
                    </div>
                  )}

                  {/* Popular Products */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="font-medium">Popular:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {country.popularProducts.map((product) => (
                        <span key={product} className="text-xs text-gray-600">
                          {product} •
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => setExpandedCountry(expandedCountry === country.id ? null : country.id)}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>View all stores</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      expandedCountry === country.id ? 'rotate-180' : ''
                    }`} />
                  </button>
                </div>

                {/* Expanded Content */}
                <motion.div
                  initial={false}
                  animate={{ height: expandedCountry === country.id ? 'auto' : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0">
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">All Available Stores:</h4>
                      <div className="flex flex-wrap gap-2">
                        {country.stores.map((store) => (
                          <span key={store} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer">
                            {store}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Hover Effect Border */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={false}
                animate={{
                  boxShadow: hoveredCountry === country.id 
                    ? `0 0 0 2px ${country.id === 'us' ? '#3B82F6' : country.id === 'china' ? '#EF4444' : '#8B5CF6'}`
                    : '0 0 0 0px transparent'
                }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          ))}
        </div>

        {/* View All Countries Button */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-all duration-300">
            <MapPin className="w-5 h-5" />
            View All 100+ Supported Countries
          </button>
        </motion.div>
      </div>
    </section>
  );
};