}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Per-Item Valuation Selection</h3>
          <p className="text-sm text-gray-600">
            Configure valuation methods for individual items with HSN codes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={calculateAllItemTaxes}
            disabled={isCalculating}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate All</span>
          </Button>
        </div>
      </div>

      {}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Valuation Method Configuration
              {selectedItemId && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  for {items.find((i) => i.id === selectedItemId)?.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItemId && itemValuationData[selectedItemId] ? (
              <Tabs defaultValue="methods" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="methods">Methods</TabsTrigger>
                  {showComparison && <TabsTrigger value="comparison">Comparison</TabsTrigger>}
                  {showPreview && <TabsTrigger value="preview">Tax Preview</TabsTrigger>}
                </TabsList>

                {/* Method Selection Tab */}
                <TabsContent value="methods" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {valuationMethods.map((method) => {
                      const isSelected = currentValuationMethods[selectedItemId] === method.id;
                      const valuationData = itemValuationData[selectedItemId];

                      return (
                        <div
                          key={method.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                          } ${isLoading || isCalculating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() =>
                            !isLoading &&
                            !isCalculating &&
                            handleValuationMethodChange(selectedItemId, method.id)
                          }
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`p-1 rounded ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}
                              >
                                {method.icon}
                              </div>
                              <span className="font-medium">{method.name}</span>
                            </div>
                            {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                          </div>

                          <p className="text-sm text-gray-600 mb-3">{method.description}</p>

                          {method.id === 'admin_override' && isSelected && (
                            <div className="space-y-2">
                              <Label htmlFor="override-amount">Override Amount</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="override-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={overrideAmounts[selectedItemId] || ''}
                                  onChange={(e) =>
                                    handleOverrideAmountChange(
                                      selectedItemId,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  placeholder="Enter amount..."
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => saveOverrideAmount(selectedItemId)}
                                  disabled={
                                    !overrideAmounts[selectedItemId] ||
                                    overrideAmounts[selectedItemId] <= 0
                                  }
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          )}

                          {valuationData && isSelected && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-sm font-medium text-gray-700">
                                Current Tax:{' '}
                                {formatCurrency(
                                  valuationData.tax_preview.total_tax,
                                  valuationData.currency,
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Comparison Tab */}
                {showComparison && (
                  <TabsContent value="comparison" className="space-y-4">
                    {itemValuationData[selectedItemId] && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Actual Price Method</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].method_comparison
                                    .actual_price_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Based on item price:{' '}
                                {formatCurrency(
                                  itemValuationData[selectedItemId].actual_price,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Minimum Valuation Method</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].method_comparison
                                    .minimum_valuation_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Based on minimum:{' '}
                                {itemValuationData[selectedItemId].minimum_valuation
                                  ? formatCurrency(
                                      itemValuationData[selectedItemId].minimum_valuation!,
                                      itemValuationData[selectedItemId].currency,
                                    )
                                  : 'Not available'}
                              </div>
                            </div>
                          </Card>
                        </div>

                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Tax Difference Analysis</span>
                            <Badge
                              variant={
                                itemValuationData[selectedItemId].method_comparison
                                  .difference_percent > 10
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {itemValuationData[
                                selectedItemId
                              ].method_comparison.difference_percent.toFixed(1)}
                              % difference
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-lg font-semibold">
                              {formatCurrency(
                                itemValuationData[selectedItemId].method_comparison
                                  .difference_amount,
                                itemValuationData[selectedItemId].currency,
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="text-sm text-gray-600">
                              {itemValuationData[selectedItemId].method_comparison
                                .actual_price_tax >
                              itemValuationData[selectedItemId].method_comparison
                                .minimum_valuation_tax
                                ? 'Actual price results in higher tax'
                                : 'Minimum valuation results in higher tax'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Tax Preview Tab */}
                {showPreview && (
                  <TabsContent value="preview" className="space-y-4">
                    {itemValuationData[selectedItemId] && (
                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Calculator className="h-5 w-5 text-primary" />
                            <span className="font-medium">Current Tax Breakdown</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.customs_amount,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Customs Duty</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.local_tax_amount,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Local Tax (GST/VAT)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.total_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Total Tax</div>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Valuation Method:</span>
                            <Badge variant="outline">
                              {
                                valuationMethods.find(
                                  (m) => m.id === itemValuationData[selectedItemId].current_method,
                                )?.name
                              }
                            </Badge>
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedItemId ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <div>Calculating tax breakdown...</div>
                  </div>
                ) : (
                  <div>Select an item to configure valuation method</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
