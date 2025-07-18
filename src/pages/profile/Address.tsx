import { AddressList } from '@/components/profile/AddressList';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { H1, BodySmall } from '@/components/ui/typography';

export default function AddressPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <H1 className="text-2xl mb-1">Shipping Addresses</H1>
                <BodySmall className="text-gray-600">
                  Manage your saved shipping addresses for orders
                </BodySmall>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AddressList />
      </div>
    </div>
  );
}
