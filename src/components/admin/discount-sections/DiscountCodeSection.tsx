import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, Plus, Tag, Clock, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DiscountCode } from '@/services/DiscountService';

interface DiscountCodeSectionProps {
  discountCodes: DiscountCode[];
  selectedCodes: string[];
  setSelectedCodes: (codes: string[]) => void;
  onCreateCode: () => void;
  onEditCode: (code: DiscountCode) => void;
  onRefresh: () => void;
}

export const DiscountCodeSection: React.FC<DiscountCodeSectionProps> = ({
  discountCodes,
  selectedCodes,
  setSelectedCodes,
  onCreateCode,
  onEditCode,
  onRefresh
}) => {
  const [showInactive, setShowInactive] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const filteredCodes = showInactive 
    ? discountCodes 
    : discountCodes.filter(c => c.is_active);

  const handleSelectCode = (codeId: string, checked: boolean) => {
    if (checked) {
      setSelectedCodes([...selectedCodes, codeId]);
    } else {
      setSelectedCodes(selectedCodes.filter(id => id !== codeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCodes(filteredCodes.map(c => c.id));
    } else {
      setSelectedCodes([]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied to clipboard!');
  };

  const bulkActivateCodes = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: true })
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes activated`);
      setSelectedCodes([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to activate codes');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeactivateCodes = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: false })
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes deactivated`);
      setSelectedCodes([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to deactivate codes');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDeleteCodes = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCodes.length} codes? This action cannot be undone.`)) {
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .in('id', selectedCodes);
      
      if (error) throw error;
      toast.success(`${selectedCodes.length} codes deleted`);
      setSelectedCodes([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete codes');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const deleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this code? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      toast.success('Code deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete code');
    }
  };

  const getCodeStatus = (code: DiscountCode) => {
    const now = new Date();
    const startDate = new Date(code.valid_from);
    const endDate = new Date(code.valid_until);
    
    if (!code.is_active) return { status: 'Inactive', color: 'secondary' };
    if (now < startDate) return { status: 'Scheduled', color: 'outline' };
    if (now > endDate) return { status: 'Expired', color: 'secondary' };
    return { status: 'Active', color: 'default' };
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive-codes"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor="show-inactive-codes" className="text-sm font-medium">
              Show inactive codes
            </label>
          </div>
          {selectedCodes.length > 0 && (
            <Badge variant="secondary">
              {selectedCodes.length} selected
            </Badge>
          )}
        </div>
        <Button onClick={onCreateCode}>
          <Plus className="h-4 w-4 mr-2" />
          Create Code
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedCodes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Bulk Actions:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkActivateCodes}
              disabled={bulkActionLoading}
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkDeactivateCodes}
              disabled={bulkActionLoading}
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDeleteCodes}
              disabled={bulkActionLoading}
            >
              Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Codes grid */}
      <div className="grid gap-4">
        {filteredCodes.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No discount codes found</h3>
              <p className="text-sm">
                {showInactive 
                  ? "No discount codes have been created yet." 
                  : "No active codes. Toggle 'Show inactive' to see all codes."}
              </p>
            </div>
          </Card>
        ) : (
          filteredCodes.map((code) => {
            const statusInfo = getCodeStatus(code);
            return (
              <Card key={code.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(code.id)}
                        onChange={(e) => handleSelectCode(code.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {code.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={statusInfo.color as any}>
                            {statusInfo.status}
                          </Badge>
                          <Badge variant="outline">
                            {code.discount_type === 'percentage' 
                              ? `${code.discount_value}%` 
                              : `$${code.discount_value}`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditCode(code)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCode(code.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Campaign:</span>
                      <p className="mt-1">
                        {code.discount_campaigns?.name || 'No campaign'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valid Period:</span>
                      <div className="mt-1 flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>
                          {format(new Date(code.valid_from), 'MMM d')} - {' '}
                          {format(new Date(code.valid_until), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-500">Usage:</span>
                      <p className="mt-1">
                        {code.usage_count || 0} / {code.usage_limit || 'Unlimited'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Order:</span>
                      <p className="mt-1">
                        {code.min_order_amount ? `$${code.min_order_amount}` : 'None'}
                      </p>
                    </div>
                  </div>
                  {code.usage_limit && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(100, ((code.usage_count || 0) / code.usage_limit) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Select all checkbox */}
      {filteredCodes.length > 0 && (
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            checked={selectedCodes.length === filteredCodes.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label className="text-sm text-gray-600">
            Select all {filteredCodes.length} codes
          </label>
        </div>
      )}
    </div>
  );
};