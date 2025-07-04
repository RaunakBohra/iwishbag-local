import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, 
  Send, 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Target
} from "lucide-react";
import { useCartAbandonmentEmails } from "@/hooks/useCartAbandonmentEmails";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { toast } from "sonner";

export const CartAbandonmentManager = () => {
  const {
    abandonedCarts,
    emailTemplates,
    emailCampaigns,
    abandonmentAnalytics,
    loadingCarts,
    sendRecoveryEmail,
    sendBulkRecoveryEmails,
    createEmailCampaign,
    getAbandonedCartsCount,
    getTotalAbandonedValue
  } = useCartAbandonmentEmails();

  const { formatMultiCurrency } = useAdminCurrencyDisplay();
  const [selectedCarts, setSelectedCarts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    template_id: '',
    scheduled_at: ''
  });

  const totalAbandonedValueCurrencies = formatMultiCurrency({
    usdAmount: getTotalAbandonedValue(),
    showAllVariations: false
  });

  const handleSelectAll = () => {
    if (selectedCarts.length === abandonedCarts?.length) {
      setSelectedCarts([]);
    } else {
      setSelectedCarts(abandonedCarts?.map(cart => cart.id) || []);
    }
  };

  const handleSelectCart = (cartId: string) => {
    setSelectedCarts(prev => 
      prev.includes(cartId) 
        ? prev.filter(id => id !== cartId)
        : [...prev, cartId]
    );
  };

  const handleSendBulkEmails = async () => {
    if (selectedCarts.length === 0) {
      toast.error('Please select carts to send emails to');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    await sendBulkRecoveryEmails.mutateAsync({
      cartIds: selectedCarts,
      templateId: selectedTemplate,
      delayBetweenEmails: 2000 // 2 seconds between emails
    });

    setSelectedCarts([]);
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.template_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    await createEmailCampaign.mutateAsync({
      name: campaignForm.name,
      template_id: campaignForm.template_id,
      target_count: getAbandonedCartsCount(),
      sent_count: 0,
      status: 'pending',
      scheduled_at: campaignForm.scheduled_at || undefined
    });

    setShowCreateCampaign(false);
    setCampaignForm({ name: '', template_id: '', scheduled_at: '' });
  };

  if (loadingCarts) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Carts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAbandonedCartsCount()}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours: {abandonmentAnalytics?.last24h || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAbandonedValueCurrencies.length > 0 ? (
                <MultiCurrencyDisplay 
                  currencies={totalAbandonedValueCurrencies}
                  orientation="horizontal"
                  showLabels={false}
                  compact={true}
                />
              ) : (
                "$0.00"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Recovery rate: {(abandonmentAnalytics?.recoveryRate || 0) * 100}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailCampaigns?.filter(c => c.status === 'sending' || c.status === 'scheduled').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailCampaigns?.filter(c => c.status === 'completed').length || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Quick Recovery Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="template-select">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates?.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSendBulkEmails}
                disabled={selectedCarts.length === 0 || !selectedTemplate || sendBulkRecoveryEmails.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Selected ({selectedCarts.length})
              </Button>
              <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Email Campaign</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="campaign-name">Campaign Name</Label>
                      <Input
                        id="campaign-name"
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Weekly Recovery Campaign"
                      />
                    </div>
                    <div>
                      <Label htmlFor="campaign-template">Email Template</Label>
                      <Select 
                        value={campaignForm.template_id} 
                        onValueChange={(value) => setCampaignForm(prev => ({ ...prev, template_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailTemplates?.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="campaign-schedule">Schedule (Optional)</Label>
                      <Input
                        id="campaign-schedule"
                        type="datetime-local"
                        value={campaignForm.scheduled_at}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleCreateCampaign} className="flex-1">
                        Create Campaign
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreateCampaign(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abandoned Carts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Abandoned Carts ({getAbandonedCartsCount()})
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedCarts.length === abandonedCarts?.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {abandonedCarts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No abandoned carts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {abandonedCarts?.map((cart) => (
                <div key={cart.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Checkbox
                    checked={selectedCarts.includes(cart.id)}
                    onCheckedChange={() => handleSelectCart(cart.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cart.email}</span>
                      <Badge variant="outline">{cart.quantity} items</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abandoned {new Date(cart.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatMultiCurrency({
                        usdAmount: cart.final_total_local,
                        showAllVariations: false
                      }).map(currency => `${currency.symbol}${currency.amount}`).join(' / ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendRecoveryEmail.mutate({ 
                        cartId: cart.id, 
                        templateId: emailTemplates?.[0]?.id || '' 
                      })}
                      disabled={sendRecoveryEmail.isPending}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Email Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emailCampaigns?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No email campaigns created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emailCampaigns?.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant={
                        campaign.status === 'completed' ? 'default' :
                        campaign.status === 'sending' ? 'secondary' :
                        campaign.status === 'scheduled' ? 'outline' : 'destructive'
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {campaign.sent_count} / {campaign.target_count} emails sent
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 