import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RefreshCw } from 'lucide-react';

interface GeneralSettingsTabProps {
  settings: any;
  onUpdate: (settings: any) => void;
  isLoading: boolean;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  settings,
  onUpdate,
  isLoading
}) => {
  const [localSettings, setLocalSettings] = useState(settings || {});

  const handleSave = () => {
    onUpdate(localSettings);
  };

  const handleReset = () => {
    setLocalSettings(settings || {});
  };

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Enable or disable the auto quote system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="system-active">Auto Quote System</Label>
              <p className="text-sm text-muted-foreground">
                Enable instant quote generation for supported websites
              </p>
            </div>
            <Switch
              id="system-active"
              checked={localSettings.isActive || false}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Confidence & Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence & Thresholds</CardTitle>
          <CardDescription>
            Configure confidence thresholds and approval limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Minimum confidence score required for auto approval (0.0 - 1.0)
              </p>
              <Input
                id="confidence-threshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.confidenceThreshold || 0.7}
                onChange={(e) => 
                  setLocalSettings(prev => ({ 
                    ...prev, 
                    confidenceThreshold: parseFloat(e.target.value) 
                  }))
                }
              />
            </div>
            
            <div>
              <Label htmlFor="auto-approval-limit">Auto Approval Limit</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Maximum quote amount for automatic approval ($)
              </p>
              <Input
                id="auto-approval-limit"
                type="number"
                min="0"
                value={localSettings.autoApprovalLimit || 2000}
                onChange={(e) => 
                  setLocalSettings(prev => ({ 
                    ...prev, 
                    autoApprovalLimit: parseFloat(e.target.value) 
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Markup */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Markup</CardTitle>
          <CardDescription>
            Configure default pricing and markup settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="markup-percentage">Default Markup Percentage</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Default markup percentage applied to quotes (%)
              </p>
              <Input
                id="markup-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={localSettings.markupPercentage || 5.0}
                onChange={(e) => 
                  setLocalSettings(prev => ({ 
                    ...prev, 
                    markupPercentage: parseFloat(e.target.value) 
                  }))
                }
              />
            </div>
            
            <div>
              <Label htmlFor="weight-estimation">Weight Estimation Method</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Default method for weight estimation
              </p>
              <Select
                value={localSettings.weightEstimationMethod || 'scraped'}
                onValueChange={(value) => 
                  setLocalSettings(prev => ({ 
                    ...prev, 
                    weightEstimationMethod: value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scraped">Use Scraped Weight</SelectItem>
                  <SelectItem value="estimated">Estimated Weight</SelectItem>
                  <SelectItem value="category">Category Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Review Settings</CardTitle>
          <CardDescription>
            Configure when quotes require admin review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="admin-review">Require Admin Review</Label>
              <p className="text-sm text-muted-foreground">
                All auto quotes require admin approval before being sent to users
              </p>
            </div>
            <Switch
              id="admin-review"
              checked={localSettings.requiresAdminReview || true}
              onCheckedChange={(checked) => 
                setLocalSettings(prev => ({ ...prev, requiresAdminReview: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}; 