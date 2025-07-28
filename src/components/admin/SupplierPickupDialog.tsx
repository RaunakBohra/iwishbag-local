import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CalendarIcon, Truck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SupplierPickupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnId: string;
  customerAddress?: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
}

interface PickupTimeSlot {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export const SupplierPickupDialog: React.FC<SupplierPickupDialogProps> = ({
  isOpen,
  onClose,
  returnId,
  customerAddress,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [pickupDate, setPickupDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState(customerAddress?.name || '');
  const [contactPhone, setContactPhone] = useState(customerAddress?.phone || '');
  const [pickupAddress, setPickupAddress] = useState({
    street1: customerAddress?.street1 || '',
    street2: customerAddress?.street2 || '',
    city: customerAddress?.city || '',
    state: customerAddress?.state || '',
    postalCode: customerAddress?.postalCode || '',
    country: customerAddress?.country || '',
  });
  const [instructions, setInstructions] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Fetch available time slots
  const { data: timeSlots } = useQuery({
    queryKey: ['pickup-time-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickup_time_slots')
        .select('*')
        .eq('is_active', true)
        .order('start_time');
      
      if (error) throw error;
      return data as PickupTimeSlot[];
    },
  });

  // Schedule pickup mutation
  const schedulePickupMutation = useMutation({
    mutationFn: async () => {
      if (!pickupDate || !selectedTimeSlot) {
        throw new Error('Please select pickup date and time slot');
      }

      const { data, error } = await supabase.rpc('schedule_supplier_pickup', {
        p_return_id: returnId,
        p_pickup_date: format(pickupDate, 'yyyy-MM-dd'),
        p_pickup_time_slot: selectedTimeSlot,
        p_pickup_address: pickupAddress,
        p_contact_name: contactName,
        p_contact_phone: contactPhone,
        p_supplier_name: supplierName || null,
        p_instructions: instructions || null,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Pickup Scheduled',
        description: `Supplier pickup scheduled successfully. Confirmation: ${data.confirmation_number}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-package-returns'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Scheduling Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSchedulePickup = () => {
    if (!pickupDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a pickup date',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTimeSlot) {
      toast({
        title: 'Missing Information',
        description: 'Please select a time slot',
        variant: 'destructive',
      });
      return;
    }

    if (!contactName || !contactPhone) {
      toast({
        title: 'Missing Information',
        description: 'Please provide contact name and phone',
        variant: 'destructive',
      });
      return;
    }

    schedulePickupMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Schedule Supplier Pickup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Schedule a pickup when the supplier will collect the return package directly from the customer.
            </AlertDescription>
          </Alert>

          {/* Supplier Information */}
          <div>
            <Label htmlFor="supplier-name">Supplier Name (Optional)</Label>
            <Input
              id="supplier-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g., FedEx, UPS, DHL"
              className="mt-2"
            />
          </div>

          {/* Pickup Date */}
          <div>
            <Label>Pickup Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !pickupDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pickupDate ? format(pickupDate, "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={pickupDate}
                  onSelect={setPickupDate}
                  disabled={(date) =>
                    date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slot */}
          <div>
            <Label htmlFor="time-slot">Preferred Time Slot</Label>
            <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
              <SelectTrigger id="time-slot" className="mt-2">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots?.map((slot) => (
                  <SelectItem key={slot.id} value={slot.slot_name}>
                    {slot.slot_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-name">Contact Name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Person available during pickup"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Contact Phone</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Pickup Address */}
          <div className="space-y-4">
            <Label>Pickup Address</Label>
            <div>
              <Input
                placeholder="Street Address Line 1"
                value={pickupAddress.street1}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, street1: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Input
                placeholder="Street Address Line 2 (Optional)"
                value={pickupAddress.street2}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, street2: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="City"
                value={pickupAddress.city}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, city: e.target.value })
                }
                required
              />
              <Input
                placeholder="State/Province"
                value={pickupAddress.state}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, state: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Postal Code"
                value={pickupAddress.postalCode}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, postalCode: e.target.value })
                }
                required
              />
              <Input
                placeholder="Country"
                value={pickupAddress.country}
                onChange={(e) =>
                  setPickupAddress({ ...pickupAddress, country: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions for the pickup..."
              rows={3}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedulePickup}
            disabled={isScheduling || !pickupDate || !selectedTimeSlot}
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Schedule Pickup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};