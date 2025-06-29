import AuthForm from "@/components/forms/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Shield, Users, Globe } from "lucide-react";

const Auth = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Simple Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Globe className="w-8 h-8 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Global Wishlist Hub</h1>
          </div>
          <p className="text-muted-foreground text-sm">Your gateway to global shopping</p>
        </div>

        {/* Clean Card Design */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-lg rounded-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-foreground rounded-full">
                <Lock className="w-6 h-6 text-background" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in to access your global shopping dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <AuthForm />
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-muted-foreground text-sm">
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Trusted</span>
            </div>
            <div className="flex items-center space-x-1">
              <Globe className="w-4 h-4" />
              <span>Global</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
