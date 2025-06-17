
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Save, X } from "lucide-react";

interface CustomerNameEditorProps {
  customerId: string;
  currentName: string | null;
  onUpdate: (userId: string, name: string) => void;
  isUpdating: boolean;
}

export const CustomerNameEditor = ({ 
  customerId, 
  currentName, 
  onUpdate, 
  isUpdating 
}: CustomerNameEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const displayName = currentName || 'No name provided';

  const handleEditName = () => {
    setIsEditing(true);
    setNameValue(currentName || "");
  };

  const handleSaveName = () => {
    onUpdate(customerId, nameValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNameValue("");
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <Input
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          placeholder="Enter customer name..."
          className="text-xl font-semibold"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveName();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        />
        <Button 
          size="sm" 
          onClick={handleSaveName}
          disabled={isUpdating}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 group">
      <span className="text-xl font-semibold">{displayName}</span>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleEditName}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
