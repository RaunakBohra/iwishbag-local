}
        <Flex justify="between" align="center">
          <Stack spacing="xs">
            <Heading level={3} size="lg">
              Tax Calculation Overview
            </Heading>
            <Text size="sm" color="muted">
              {quote.origin_country} → {quote.destination_country}
            </Text>
          </Stack>
          <Flex align="center" gap="sm">
            <Text size="xs" color="muted">
              Updated {lastUpdated.toLocaleTimeString()}
            </Text>
            {isAnalyzing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Flex>
        </Flex>

        {/* Current Method Status */}
        <LayoutCard variant="ghost" padding="md">
          <Flex align="center" gap="md">
            <div className={`p-2 rounded-lg ${getStatusColor(taxMethodInfo.status)}`}>
              {taxMethodInfo.icon}
            </div>
            <Stack spacing="xs" className="flex-1">
              <Flex align="center" gap="sm">
                <Heading level={4} size="base">
                  {taxMethodInfo.name}
                </Heading>
                <Badge variant={taxMethodInfo.status === 'active' ? 'default' : 'secondary'}>
                  {Math.round(taxMethodInfo.confidence * 100)}% confidence
                </Badge>
              </Flex>
              <Text size="sm" color="muted">
                {taxMethodInfo.description}
              </Text>
            </Stack>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('methods')}
              disabled={isCalculating}
            >
              Configure
            </Button>
          </Flex>
        </LayoutCard>

        {/* Tax Impact Overview */}
        <Stack spacing="md">
          <Flex justify="between" align="center">
            <Heading level={4} size="base">
              Tax Impact
            </Heading>
            <Text size="sm" color="accent">
              {taxImpact.percentageOfTotal.toFixed(1)}% of total
            </Text>
          </Flex>

          <Grid cols={3} gap="sm">
            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">
                  Customs & Duties
                </Text>
                <Text size="lg" weight="semibold" color="primary">
                  {formatCurrency(taxImpact.breakdown.customs, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>

            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">
                  Local Taxes
                </Text>
                <Text size="lg" weight="semibold" color="primary">
                  {formatCurrency(taxImpact.breakdown.localTax, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>

            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">
                  Total Tax
                </Text>
                <Text size="lg" weight="semibold" color="accent">
                  {formatCurrency(taxImpact.totalTax, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>
          </Grid>

          {/* Optimization indicator */}
          {!taxImpact.comparedToOptimal.isOptimal && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Potential savings of{' '}
                {formatCurrency(taxImpact.comparedToOptimal.difference, taxImpact.currency)}{' '}
                available with optimization.
              </AlertDescription>
            </Alert>
          )}
        </Stack>

        {/* Quick Actions */}
        <Stack spacing="sm">
          <Heading level={4} size="sm">
            Quick Actions
          </Heading>
          <Grid cols={2} gap="sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('breakdown')}
              className="justify-start"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Breakdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('valuations')}
              className="justify-start"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Item Valuations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalculate}
              disabled={isCalculating}
              className="justify-start"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeTaxSetup()}
              disabled={isAnalyzing}
              className="justify-start"
            >
              <Target className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Optimize'}
            </Button>
          </Grid>
        </Stack>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <Stack spacing="sm">
            <Heading level={4} size="sm">
              Recommendations
            </Heading>
            <Stack spacing="xs">
              {recommendations.map((rec) => (
                <LayoutCard key={rec.id} variant="ghost" padding="sm">
                  <Flex justify="between" align="center">
                    <Stack spacing="xs" className="flex-1">
                      <Flex align="center" gap="sm">
                        <Text size="sm" weight="medium" color="primary">
                          {rec.title}
                        </Text>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </Flex>
                      <Text size="xs" color="muted">
                        {rec.description}
                      </Text>
                      <Text size="xs" color="accent">
                        {rec.impact}
                      </Text>
                    </Stack>
                    <Button size="sm" variant="ghost" onClick={rec.action} className="ml-2">
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Flex>
                </LayoutCard>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </LayoutCard>
  );
};
