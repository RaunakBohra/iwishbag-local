import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DiscountService, type DiscountCode, type DiscountCampaign } from '@/services/DiscountService';
import { Tag, Edit2, Trash2, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCodesSectionProps {
  discountCodes: DiscountCode[];
  campaigns: DiscountCampaign[];
  selectedCodes: string[];
  onCodesChange: (codes: DiscountCode[]) => void;
  onSelectedCodesChange: (selected: string[]) => void;
  onCodeEdit: (code: DiscountCode) => void;
}

export const DiscountCodesSection: React.FC<DiscountCodesSectionProps> = ({
  discountCodes,
  campaigns,
  selectedCodes,
  onCodesChange,
  onSelectedCodesChange,
  onCodeEdit,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    campaign_id: '',
    usage_limit: '',
    is_active: true,
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const handleCreateCode = async () => {
    try {
      const newCode = await DiscountService.createDiscountCode({
        code: formData.code.toUpperCase(),
        campaign_id: formData.campaign_id,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
      });

      onCodesChange([...discountCodes, newCode]);
      setCreateDialogOpen(false);
      setFormData({ code: '', campaign_id: '', usage_limit: '', is_active: true });
      
      toast.success('Discount code created successfully');
    } catch (error) {
      console.error('Error creating discount code:', error);
      toast.error('Failed to create discount code');
    }
  };

  const handleDeleteCodes = async () => {
    if (!selectedCodes.length) return;
    
    try {
      const promises = selectedCodes.map(id => DiscountService.deleteDiscountCode(id));
      await Promise.all(promises);
      
      const updatedCodes = discountCodes.filter(c => !selectedCodes.includes(c.id));
      onCodesChange(updatedCodes);
      onSelectedCodesChange([]);
      
      toast.success(`Deleted ${selectedCodes.length} code(s)`);
    } catch (error) {
      console.error('Error deleting codes:', error);
      toast.error('Failed to delete codes');
    }
  };

  const toggleCodeActive = async (code: DiscountCode) => {
    try {
      const updatedCode = await DiscountService.toggleCodeActive(code.id);
      const updatedCodes = discountCodes.map(c => 
        c.id === code.id ? { ...c, is_active: updatedCode.is_active } : c
      );
      onCodesChange(updatedCodes);
      
      toast.success(`Code ${updatedCode.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling code:', error);
      toast.error('Failed to update code status');
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Discount Codes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create and manage individual discount codes
            </p>
          </div>
          <div className="flex gap-2">
            {selectedCodes.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteCodes}
              >
                Delete Selected ({selectedCodes.length})
              </Button>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Tag className="mr-2 h-4 w-4" />
                  Create Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Discount Code</DialogTitle>
                  <DialogDescription>
                    Generate a new discount code for customers
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Discount Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER20"
                        className="uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomCode}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Campaign</Label>
                    <Select value={formData.campaign_id} onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Usage Limit (Optional)</Label>
                    <Input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="100"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is-active">Active</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCode} disabled={!formData.code || !formData.campaign_id}>
                    Create Code
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {discountCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No discount codes found. Create your first code to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {discountCodes.map((code) => (
                <div 
                  key={code.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(code.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectedCodesChange([...selectedCodes, code.id]);
                        } else {
                          onSelectedCodesChange(selectedCodes.filter(id => id !== code.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg">{code.code}</code>
                        <Badge 
                          variant={code.is_active ? 'default' : 'secondary'}
                        >
                          {code.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCodeToClipboard(code.code)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Campaign: {campaigns.find(c => c.id === code.campaign_id)?.name || 'Unknown'}</span>
                        <span>Uses: {code.usage_count || 0}</span>
                        {code.usage_limit && (
                          <span>Limit: {code.usage_limit}</span>
                        )}
                        <span>
                          Created: {new Date(code.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCodeActive(code)}
                    >
                      {code.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCodeEdit(code)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectedCodesChange([code.id]);
                        handleDeleteCodes();
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};