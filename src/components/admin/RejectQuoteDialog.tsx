import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";

type RejectionReason = Tables<'rejection_reasons'>;

interface RejectQuoteDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reasonId: string, details: string) => void;
    isPending: boolean;
}

export const RejectQuoteDialog = ({ isOpen, onOpenChange, onConfirm, isPending }: RejectQuoteDialogProps) => {
    const { data: reasons, isLoading } = useQuery<RejectionReason[]>({
        queryKey: ['rejection-reasons'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rejection_reasons')
                .select('*')
                .eq('is_active', true)
                .order('reason', { ascending: true });
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const [selectedReasonId, setSelectedReasonId] = useState<string | undefined>();
    const [details, setDetails] = useState("");

    const handleSubmit = () => {
        if (selectedReasonId) {
            onConfirm(selectedReasonId, details);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedReasonId(undefined);
            setDetails("");
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject Quote(s)</DialogTitle>
                    <DialogDescription>
                        Please select a reason for rejecting the quote(s) and add any relevant details.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Select onValueChange={setSelectedReasonId} value={selectedReasonId}>
                            <SelectTrigger id="rejection-reason" disabled={isLoading}>
                                <SelectValue placeholder={isLoading ? "Loading reasons..." : "Select a reason"} />
                            </SelectTrigger>
                            <SelectContent>
                                {reasons?.map(reason => (
                                    <SelectItem key={reason.id} value={reason.id}>
                                        {reason.reason}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rejection-details">Additional Details (Optional)</Label>
                        <Textarea
                            id="rejection-details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Provide more context for the rejection..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={isLoading}
                        onClick={handleSubmit}
                    >
                        {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
