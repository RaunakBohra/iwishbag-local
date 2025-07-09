import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock, Search, TrendingUp, ArrowRight, Bookmark, Share2, Filter } from "lucide-react";
import { ParallaxSection } from "@/components/shared/ParallaxSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { LazyImage } from "@/components/ui/lazy-image";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lazy load components
const LazySection = lazy(() => import("@/components/home/LazySection").then(m => ({ default: m.LazySection })));

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredPost, setHoveredPost] = useState<number | null>(null);

  const categories = [
    { value: "all", label: "All Categories", count: 12 },
    { value: "shipping", label: "Shipping", count: 4 },
    { value: "customs", label: "Customs", count: 3 },
    { value: "shopping", label: "Shopping", count: 3 },
    { value: "tracking", label: "Tracking", count: 2 }
  ];

  const blogPosts = [
    {
      id: 1,
      title: "Understanding International Shipping Costs",
      excerpt: "Learn about the factors that affect international shipping costs and how to estimate them accurately.",
      date: "2024-06-10",
      readTime: 5,
      category: "shipping",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=450&fit=crop",
      author: "Sarah Chen",
      authorImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      featured: true
    },
    {
      id: 2,
      title: "Customs Duties and Taxes Explained",
      excerpt: "A comprehensive guide to understanding customs duties, taxes, and how they're calculated.",
      date: "2024-06-05",
      readTime: 7,
      category: "customs",
      image: "https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=800&h=450&fit=crop",
      author: "Michael Kumar",
      authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      featured: true
    },
    {
      id: 3,
      title: "Tips for Safe International Online Shopping",
      excerpt: "Best practices for shopping online from international retailers safely and securely.",
      date: "2024-05-28",
      readTime: 4,
      category: "shopping",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop",
      author: "Emily Rodriguez",
      authorImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      featured: false
    },
    {
      id: 4,
      title: "How to Track Your International Shipments",
      excerpt: "Everything you need to know about tracking your packages from purchase to delivery.",
      date: "2024-05-20",
      readTime: 3,
      category: "tracking",
      image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&h=450&fit=crop",
      author: "Sarah Chen",
      authorImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      featured: false
    },
    {
      id: 5,
      title: "Top 10 International Shopping Destinations",
      excerpt: "Discover the best countries for online shopping and what makes them special.",
      date: "2024-05-15",
      readTime: 6,
      category: "shopping",
      image: "https://images.unsplash.com/photo-1523365280197-f1783db9fe62?w=800&h=450&fit=crop",
      author: "Michael Kumar",
      authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      featured: false
    },
    {
      id: 6,
      title: "Express vs Standard Shipping: Which to Choose?",
      excerpt: "Compare shipping options to find the best balance between cost and delivery time.",
      date: "2024-05-10",
      readTime: 5,
      category: "shipping",
      image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&h=450&fit=crop",
      author: "Emily Rodriguez",
      authorImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      featured: true
    }
  ];

  const featuredPost = blogPosts.find(post => post.featured);
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    { value: 1000, label: "Articles Read Daily", suffix: "+" },
    { value: 50, label: "Expert Contributors", suffix: "+" },
    { value: 25, label: "Countries Covered", suffix: "+" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ParallaxSection 
        className="min-h-[400px] flex items-center"
        backgroundImage="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1920&h=1080&fit=crop"
        overlayOpacity={0.7}
      >
        <div className="container py-16">
          <AnimatedSection animation="fadeInUp" className="text-center text-white max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Insights & Updates
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8">
              Expert tips and the latest trends in international shipping
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-300"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            </div>
          </AnimatedSection>
        </div>
      </ParallaxSection>

      {/* Stats Section */}
      <section className="py-12 -mt-16 relative z-10">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <Card className="text-center hover:shadow-lg transition-all duration-300 bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="text-3xl font-bold text-primary mb-2">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12">
          <div className="container">
            <AnimatedSection animation="fadeInUp">
              <div className="flex items-center gap-2 mb-8">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">Featured Article</h2>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="zoomIn" delay={200}>
              <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                <div className="grid lg:grid-cols-2">
                  <div className="relative h-[300px] lg:h-auto overflow-hidden">
                    <LazyImage
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-4 left-4 bg-primary text-white">
                      Featured
                    </Badge>
                  </div>
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <Badge variant="secondary" className="w-fit mb-4">
                      {featuredPost.category}
                    </Badge>
                    <h3 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={featuredPost.authorImage}
                          alt={featuredPost.author}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{featuredPost.author}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(featuredPost.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {featuredPost.readTime} min read
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button className="group">
                        Read More
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8">
        <div className="container">
          <AnimatedSection animation="fadeInUp">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Browse by Category</h2>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <AnimatedSection key={category.value} animation="fadeInRight" delay={index * 50}>
                    <Button
                      variant={selectedCategory === category.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.value)}
                      className="transition-all duration-300"
                    >
                      {category.label}
                      <Badge variant="secondary" className="ml-2 bg-transparent">
                        {category.count}
                      </Badge>
                    </Button>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-12">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <LazySection key={post.id} threshold={0.1} rootMargin="50px">
                <Suspense fallback={
                  <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
                }>
                  <AnimatedSection animation="fadeInUp" delay={index * 100}>
                    <Card 
                      className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      onMouseEnter={() => setHoveredPost(post.id)}
                      onMouseLeave={() => setHoveredPost(null)}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <LazyImage
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 ${
                          hoveredPost === post.id ? 'opacity-100' : 'opacity-0'
                        }`} />
                        <div className={`absolute bottom-4 left-4 right-4 flex justify-between items-center transition-all duration-300 ${
                          hoveredPost === post.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}>
                          <Button size="sm" variant="secondary">
                            <Bookmark className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                        </div>
                      </div>
                      
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {post.category}
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 mr-1" />
                            {post.readTime} min
                          </div>
                        </div>
                        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={post.authorImage}
                              alt={post.author}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="text-sm">
                              <p className="font-medium">{post.author}</p>
                              <p className="text-muted-foreground">
                                {new Date(post.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className={`w-5 h-5 transition-all duration-300 ${
                            hoveredPost === post.id ? 'translate-x-2 text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                </Suspense>
              </LazySection>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <AnimatedSection animation="fadeIn" className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No articles found matching your search criteria.
              </p>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center text-white max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stay Updated
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Get the latest shipping tips and industry insights delivered to your inbox
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-300"
                required
              />
              <Button variant="secondary" size="lg" type="submit">
                Subscribe
              </Button>
            </form>
            
            <p className="text-sm text-blue-100 mt-4">
              Join <AnimatedCounter end={5000} suffix="+" /> subscribers worldwide
            </p>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
};

export default Blog;