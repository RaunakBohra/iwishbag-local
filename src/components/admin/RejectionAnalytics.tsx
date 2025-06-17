
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRejectionAnalytics } from '@/hooks/useRejectionAnalytics';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const chartConfig = {
  "Rejected Quotes": {
    label: "Rejected Quotes",
    color: "hsl(var(--primary))",
  },
  value: {
    label: "Count",
    color: "hsl(var(--primary))",
  }
} satisfies ChartConfig;

export const RejectionAnalytics = () => {
    const { stats, reasonsBreakdown, categoryBreakdown, trends, isLoading } = useRejectionAnalytics();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold">Rejection Analytics</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
                <Skeleton className="h-96" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">Rejection Analytics</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Rejected Quotes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.totalRejected}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Value Lost (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{currencyFormatter.format(stats.totalValueLost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Rejection Reason</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.topReason}</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Rejections by Reason</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-80 w-full">
                            <BarChart data={reasonsBreakdown} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={10} minTickGap={1} width={120} />
                                <XAxis type="number" dataKey="value" hide />
                                <Tooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Rejections by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-80 w-full">
                            <BarChart data={categoryBreakdown} margin={{ top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis />
                                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rejection Trends (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-80 w-full">
                        <LineChart data={trends} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis />
                            <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Legend content={() => null} />
                            <Line type="monotone" dataKey="Rejected Quotes" stroke="var(--color-Rejected Quotes)" strokeWidth={2} dot={true} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
};
