import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MessageSquare, Bell, Calculator } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickActions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild variant="destructive" className="h-20 flex-col">
            <Link to="/quote">
              <Plus className="h-6 w-6 mb-2" />
              New Quote
            </Link>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col" asChild>
            <Link to="/cost-estimator">
              <Calculator className="h-6 w-6 mb-2" />
              Cost Estimator
            </Link>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col" asChild>
            <Link to="/messages">
              <MessageSquare className="h-6 w-6 mb-2" />
              Messages
            </Link>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col" asChild>
            <Link to="/notifications">
              <Bell className="h-6 w-6 mb-2" />
              Notifications
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
