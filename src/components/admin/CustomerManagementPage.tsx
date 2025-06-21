import { useState } from "react";
import { useCustomerManagement } from "@/hooks/useCustomerManagement";
import { CustomerTable } from "./CustomerTable";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const CustomerManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { 
    customers, 
    isLoading, 
    updateCodMutation,
    updateNotesMutation,
    updateProfileMutation
  } = useCustomerManagement();

  const filteredCustomers = customers?.filter(customer => 
    (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleUpdateCod = (userId: string, codEnabled: boolean) => {
    updateCodMutation.mutate({ userId, codEnabled });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Management
          </CardTitle>
          <CardDescription>
            View, search, and manage your customers. Currently managing {customers?.length || 0} users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <CustomerTable 
            customers={filteredCustomers}
            onUpdateCod={handleUpdateCod}
            onUpdateNotes={updateNotesMutation.mutate}
            onUpdateName={(userId, name) => updateProfileMutation.mutate({ userId, fullName: name })}
            isUpdating={updateCodMutation.isPending || updateNotesMutation.isPending || updateProfileMutation.isPending}
          />
          
          {filteredCustomers.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No customers found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
