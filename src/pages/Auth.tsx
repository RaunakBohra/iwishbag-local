import AuthForm from "@/components/forms/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Auth = () => {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="bg-white/60 shadow-xl rounded-xl backdrop-blur-md border border-white/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome</CardTitle>
            <CardDescription>
              Sign in or create an account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
