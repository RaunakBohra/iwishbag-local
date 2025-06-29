
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Understanding International Shipping Costs",
      excerpt: "Learn about the factors that affect international shipping costs and how to estimate them accurately.",
      date: "2024-06-10",
      readTime: "5 min read",
      category: "Shipping",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      title: "Customs Duties and Taxes Explained",
      excerpt: "A comprehensive guide to understanding customs duties, taxes, and how they're calculated.",
      date: "2024-06-05",
      readTime: "7 min read",
      category: "Customs",
      image: "/placeholder.svg"
    },
    {
      id: 3,
      title: "Tips for Safe International Online Shopping",
      excerpt: "Best practices for shopping online from international retailers safely and securely.",
      date: "2024-05-28",
      readTime: "4 min read",
      category: "Shopping",
      image: "/placeholder.svg"
    },
    {
      id: 4,
      title: "How to Track Your International Shipments",
      excerpt: "Everything you need to know about tracking your packages from purchase to delivery.",
      date: "2024-05-20",
      readTime: "3 min read",
      category: "Tracking",
      image: "/placeholder.svg"
    }
  ];

  return (
    <div className="container py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-muted-foreground">
            Insights, tips, and updates about international shipping
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="aspect-video bg-muted rounded-t-lg"></div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {post.readTime}
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  {new Date(post.date).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            More blog posts coming soon! Follow us for updates on international shipping trends and tips.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Blog;
