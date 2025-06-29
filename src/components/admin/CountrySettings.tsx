import { useCountrySettings } from "@/hooks/useCountrySettings";
import { CountryForm } from "./CountryForm";
import { CountryListItem } from "./CountryListItem";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Plus } from "lucide-react";

export const CountrySettings = () => {
  const {
    countries,
    isLoading,
    error,
    editingCountry,
    isCreating,
    isUpdating,
    isDeleting,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry,
  } = useCountrySettings();

  console.log('CountrySettings render:', { 
    countriesCount: countries?.length, 
    isLoading, 
    error: error?.message,
    isCreating,
    isUpdating,
    isDeleting 
  }); // DEBUG

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Country Settings</h2>
          <Button onClick={handleAddNewClick} disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading country settings: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Country Settings</h2>
        <Button 
          onClick={handleAddNewClick} 
          disabled={isCreating || isUpdating || isDeleting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </div>

      {/* Dialog for Add/Edit Country Form */}
      <Dialog open={isCreating || !!editingCountry} onOpenChange={(open) => {
        if (!open) {
          handleCancelClick();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCountry ? 'Edit Country' : 'Add New Country'}
            </DialogTitle>
          </DialogHeader>
          <CountryForm
            editingCountry={editingCountry}
            onSubmit={handleSubmit}
            onCancel={handleCancelClick}
          />
        </DialogContent>
      </Dialog>

      {countries && countries.length > 0 ? (
        <div className="grid gap-4">
          {countries.map((country) => (
            <CountryListItem
              key={country.code}
              country={country}
              onEdit={handleEditClick}
              onDelete={deleteCountry}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No country settings found.</p>
          <Button 
            onClick={handleAddNewClick} 
            className="mt-4"
            disabled={isCreating || isUpdating || isDeleting}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Country
          </Button>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium mb-2">Debug Info:</h3>
          <pre className="text-xs">
            {JSON.stringify({
              countriesCount: countries?.length || 0,
              isLoading,
              error: error?.message,
              isCreating,
              isUpdating,
              isDeleting,
              editingCountry: editingCountry?.code
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
