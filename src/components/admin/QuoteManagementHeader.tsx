
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";

interface QuoteManagementHeaderProps {
  onOpenCreateDialog: () => void;
  onDownloadCSV: () => void;
}

export const QuoteManagementHeader = ({ onOpenCreateDialog, onDownloadCSV }: QuoteManagementHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-bold">Quote Management</h2>
      <div className="flex gap-2">
        <Button onClick={onOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Quote
        </Button>
        <Button onClick={onDownloadCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};
