import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { startOfMonth, subMonths, format } from 'date-fns';

type RejectedQuote = Tables<'quotes'>;

const fetchRejectedQuotes = async (): Promise<RejectedQuote[]> => {
    const { data, error } = await supabase
        .from('quotes')
        .select('final_total, rejected_at, approval_status, status, rejection_reason_id, rejection_details')
        .or('status.eq.cancelled,approval_status.eq.rejected')
        .not('rejection_reason_id', 'is', null);
    
    if (error) {
        console.error("Error fetching rejected quotes:", error);
        throw error;
    }

    return data as RejectedQuote[];
};

export const useRejectionAnalytics = () => {
    const { data: rejectedQuotes, isLoading, error } = useQuery({
        queryKey: ['rejection-analytics'],
        queryFn: fetchRejectedQuotes,
    });

    const processAnalytics = () => {
        if (!rejectedQuotes) {
            return {
                stats: { totalRejected: 0, totalValueLost: 0, topReason: 'N/A' },
                reasonsBreakdown: [],
                categoryBreakdown: [],
                trends: [],
            };
        }

        const totalRejected = rejectedQuotes.length;
        const totalValueLost = rejectedQuotes.reduce((acc, quote) => acc + (quote.final_total || 0), 0);

        const reasonsCount = rejectedQuotes.reduce((acc, quote) => {
            const reason = quote.rejection_details || 'Unknown';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topReason = Object.entries(reasonsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        const reasonsBreakdown = Object.entries(reasonsCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const categoryCount = rejectedQuotes.reduce((acc, quote) => {
            const category = quote.rejection_details || 'Unknown';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryBreakdown = Object.entries(categoryCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        const trendData: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(startOfMonth(date), 'yyyy-MM');
            trendData[monthKey] = 0;
        }

        rejectedQuotes.forEach(quote => {
            if (quote.rejected_at) {
                const monthKey = format(startOfMonth(new Date(quote.rejected_at)), 'yyyy-MM');
                if (monthKey in trendData) {
                    trendData[monthKey]++;
                }
            }
        });

        const trends = Object.entries(trendData).map(([month, count]) => ({
            name: format(new Date(`${month}-02`), 'MMM yy'),
            "Rejected Quotes": count,
        }));

        return {
            stats: { totalRejected, totalValueLost, topReason },
            reasonsBreakdown,
            categoryBreakdown,
            trends,
        };
    };
    
    const analytics = processAnalytics();

    return {
        isLoading,
        error,
        ...analytics,
    };
};
