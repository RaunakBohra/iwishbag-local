import { AddressList } from '@/components/profile/AddressList';

export default function AddressPage() {
  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold mb-6">Shipping Address</h1>
        <AddressList />
      </div>
    </div>
  );
} 