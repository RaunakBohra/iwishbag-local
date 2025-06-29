import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShippingAddress {
  fullName: string;
  recipientName?: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode?: string;
  phone?: string;
}

interface ShippingAddressDisplayProps {
  address: ShippingAddress | null;
  title?: string;
  showBadge?: boolean;
  variant?: "default" | "compact" | "detailed";
}

export const ShippingAddressDisplay = ({ 
  address, 
  title = "Shipping Address",
  showBadge = true,
  variant = "default"
}: ShippingAddressDisplayProps) => {
  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Address Provided</h3>
            <p className="text-gray-500">
              Customer hasn't provided a shipping address yet.
            </p>
            {variant === "detailed" && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Full address management features (editing, history, locking) will be available after running the address management migration.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-start space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <MapPin className="h-4 w-4 text-gray-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm space-y-1">
            <p><strong>Recipient:</strong> {address.recipientName || address.fullName}</p>
            <p>{address.streetAddress}</p>
            {address.addressLine2 && <p>{address.addressLine2}</p>}
            <p>
              {address.city}
              {address.state && `, ${address.state}`}
              {address.postalCode && ` ${address.postalCode}`}
            </p>
            <p><strong>{address.country}</strong></p>
            {address.phone && <p>📞 {address.phone}</p>}
          </div>
        </div>
        {showBadge && (
          <Badge variant="default" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Address
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
          {showBadge && (
            <Badge variant="default" className="ml-auto">
              <MapPin className="h-3 w-3 mr-1" />
              Address Provided
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-800 mb-2">Shipping Address</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Recipient:</strong> {address.recipientName || address.fullName}</p>
                <p>{address.streetAddress}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}
                  {address.state && `, ${address.state}`}
                  {address.postalCode && ` ${address.postalCode}`}
                </p>
                <p><strong>{address.country}</strong></p>
                {address.phone && <p>📞 {address.phone}</p>}
                {address.countryCode && (
                  <p className="text-xs text-blue-600">Country Code: {address.countryCode}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {variant === "detailed" && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-2">Address Information</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Address Type:</strong> Customer-provided shipping address</p>
                <p><strong>Storage:</strong> Stored in quote internal notes</p>
                <p><strong>Status:</strong> Address available for shipping</p>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-2">Coming Soon</h5>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Full Address Management:</strong> Edit, lock/unlock, and view change history</p>
                <p><strong>Address Validation:</strong> Real-time address verification and formatting</p>
                <p><strong>Audit Trail:</strong> Complete history of all address changes</p>
                <p className="text-xs mt-2">These features will be available after running the address management migration.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 