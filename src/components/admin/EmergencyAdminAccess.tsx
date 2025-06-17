
import { AdminRoleRecovery } from "./AdminRoleRecovery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

export const EmergencyAdminAccess = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-orange-500" />
          <h1 className="text-2xl font-bold">Admin Access Recovery</h1>
          <p className="text-muted-foreground mt-2">
            Admin roles were reset for security. Restore access for legitimate administrators.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> All admin privileges were temporarily removed due to a security 
            migration that previously granted admin access to all users. This page allows you to restore 
            admin access to legitimate administrators only.
          </AlertDescription>
        </Alert>

        <AdminRoleRecovery />
      </div>
    </div>
  );
};
