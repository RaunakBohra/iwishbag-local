import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Package, Zap, ArrowRight, Settings, User } from "lucide-react";

export const TestUnifiedQuotes: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Unified Quote Detail System Test</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This page tests the unified quote detail system with separate admin and user components.
            Both components use the same unified data hook but provide different interfaces.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Regular Quote Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Regular Quote Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test the unified quote detail page with a regular quote from the quotes table.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <User className="h-4 w-4" />
                    User View:
                  </span>
                  <Link to="/quote/test-regular-quote">
                    <Button variant="outline" size="sm">
                      View as User
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Admin View:
                  </span>
                  <Link to="/admin/quotes/test-regular-quote">
                    <Button variant="outline" size="sm">
                      View as Admin
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Regular Quote</Badge>
                <Badge variant="outline">Editable (Admin)</Badge>
                <Badge variant="outline">Read-only (User)</Badge>
                <Badge variant="outline">Messaging</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Automatic Quote Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automatic Quote Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Test the unified quote detail page with an automatic quote from the automatic_quotes table.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <User className="h-4 w-4" />
                    User View:
                  </span>
                  <Link to="/quote/test-automatic-quote">
                    <Button variant="outline" size="sm">
                      View as User
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Admin View:
                  </span>
                  <Link to="/admin/quotes/test-automatic-quote">
                    <Button variant="outline" size="sm">
                      View as Admin
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">Automatic Quote</Badge>
                <Badge variant="outline" className="text-yellow-700 bg-yellow-100">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
                <Badge variant="outline">Read-only</Badge>
                <Badge variant="outline">Admin Actions</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Architecture Overview */}
        <Card>
          <CardHeader>
            <CardTitle>System Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Unified Data Layer
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• `useUnifiedQuoteDetail` hook</li>
                  <li>• Handles both quote types</li>
                  <li>• Intelligent ID resolution</li>
                  <li>• Unified getters</li>
                  <li>• Error handling</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User Component
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• `UnifiedQuoteDetail`</li>
                  <li>• Read-only interface</li>
                  <li>• Quote approval/rejection</li>
                  <li>• Add to cart functionality</li>
                  <li>• Messaging system</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Admin Component
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• `AdminUnifiedQuoteDetail`</li>
                  <li>• Full editing capabilities</li>
                  <li>• Admin calculator</li>
                  <li>• Quote management</li>
                  <li>• Order actions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Component Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">User Component Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Clean, simplified interface</li>
                  <li>• Quote approval/rejection workflow</li>
                  <li>• Add to cart functionality</li>
                  <li>• Messaging with admin</li>
                  <li>• Quote stepper for regular quotes</li>
                  <li>• Product analysis display for auto quotes</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Admin Component Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Full quote editing capabilities</li>
                  <li>• Admin calculator and costs</li>
                  <li>• Currency conversion tools</li>
                  <li>• Order management actions</li>
                  <li>• Email sending functionality</li>
                  <li>• Automatic quote conversion tools</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
          <Link to="/admin/quotes">
            <Button variant="outline">
              Admin Quotes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TestUnifiedQuotes; 