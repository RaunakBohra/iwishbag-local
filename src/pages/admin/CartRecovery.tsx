import React from "react";
import { CartAbandonmentManager } from "@/components/admin/CartAbandonmentManager";

const CartRecoveryPage = () => {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Cart Recovery</h1>
      <CartAbandonmentManager />
    </div>
  );
};

export default CartRecoveryPage; 