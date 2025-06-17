
import { useCountrySettings } from "@/hooks/useCountrySettings";
import { CountryForm } from "./CountryForm";
import { CountryListItem } from "./CountryListItem";
import { Button } from "@/components/ui/button";

export const CountrySettings = () => {
  const {
    countries,
    isLoading,
    editingCountry,
    isCreating,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry,
  } = useCountrySettings();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Country Settings</h2>
        <Button onClick={handleAddNewClick}>Add Country</Button>
      </div>

      {(isCreating || editingCountry) && (
        <CountryForm
          editingCountry={editingCountry}
          onSubmit={handleSubmit}
          onCancel={handleCancelClick}
        />
      )}

      <div className="grid gap-4">
        {countries?.map((country) => (
          <CountryListItem
            key={country.code}
            country={country}
            onEdit={handleEditClick}
            onDelete={deleteCountry}
          />
        ))}
      </div>
    </div>
  );
};
