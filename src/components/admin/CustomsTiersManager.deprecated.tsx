/**
 * ⚠️ DEPRECATED COMPONENT - DO NOT USE
 *
 * CustomsTiersManager has been replaced by the CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, ArrowRight, Database } from 'lucide-react';

export const CustomsTiersManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-yellow-800">Component Deprecated</CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            This customs tiers management system has been replaced by the new Clothing = 12%)</li>
              <li>• Better accuracy for multi-product orders</li>
              <li>• Support for government minimum valuation rules</li>
              <li>• Automatic product classification</li>
            </ul>
          </div>

          <div className="bg-white border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Migration Required</h4>
            <p className="text-sm text-gray-700 mb-3">
              Your existing customs rules need to be migrated to the new HSN system for continued
              functionality.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => (window.location.href = '/admin/hsn')}
              >
                <Database className="h-4 w-4 mr-2" />
                Open HSN Admin Dashboard
              </Button>
              <Button
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => (window.location.href = '/admin/hsn#overrides')}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                View Admin Overrides
              </Button>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Important Notice</h4>
            <p className="text-sm text-red-700">
              This component will be completely removed in the next major version. Please migrate to
              the HSN system immediately to avoid service disruption.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Keep the old component name for backward compatibility during migration
export default CustomsTiersManager;
