// src/components/dashboard/BankTransferDetails.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types"; // Correct import for Tables
import { Loader2, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type BankAccountType = Tables<'bank_account_details'>; // Define BankAccountType

interface BankTransferDetailsProps {
  onConfirm?: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
}

export const BankTransferDetails: React.FC<BankTransferDetailsProps> = ({
  onConfirm,
  onCancel,
  isProcessing,
}) => {
  const { data: bankAccounts, isLoading, isError, error } = useQuery<BankAccountType[], Error>({ // Use BankAccountType
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_account_details')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !bankAccounts || bankAccounts.length === 0) {
    return (
      <div className="text-center text-red-500 py-4">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p>Error loading bank details or no active accounts found. {error?.message}</p>
      </div>
    );
  }

  const defaultAccount = bankAccounts[0]; // Assuming first active account is used for display

  return (
    <Card className="shadow-none border-dashed bg-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Bank Account Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p><strong>Bank Name:</strong> {defaultAccount.bank_name}</p>
          <p><strong>Account Name:</strong> {defaultAccount.account_name}</p>
          <p><strong>Account Number:</strong> {defaultAccount.account_number}</p>
          {defaultAccount.swift_code && <p><strong>SWIFT Code:</strong> {defaultAccount.swift_code}</p>}
        </div>

        {onConfirm && (
          <>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Payment
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};