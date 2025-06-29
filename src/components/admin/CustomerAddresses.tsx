
import { MapPin } from "lucide-react";

interface CustomerAddress {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  country: string;
  postal_code: string;
  is_default: boolean;
}

interface CustomerAddressesProps {
  addresses: CustomerAddress[];
}

export const CustomerAddresses = ({ addresses }: CustomerAddressesProps) => {
  const formatAddress = (address: CustomerAddress) => {
    return `${address.address_line1}${address.address_line2 ? `, ${address.address_line2}` : ''}, ${address.city}, ${address.country}`;
  };

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Shipping Addresses</p>
      {addresses && addresses.length > 0 ? (
        <div className="space-y-1">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatAddress(address)}</span>
              {address.is_default && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No addresses saved.</p>
      )}
    </div>
  );
};
