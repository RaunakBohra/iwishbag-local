}
        {showHistoricalAnalysis && (
          <TabsContent value="historical" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Historical Performance</h3>
              <div className="flex items-center space-x-2">
                <Label htmlFor="time-range">Time Range:</Label>
                <select
                  id="time-range"
                  value={analysisTimeRange}
                  onChange={(e) => setAnalysisTimeRange(e.target.value as '7d' | '30d' | '90d')}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Method Usage Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {methodAnalysis.map((method) => (
                      <div key={method.method_id} className="flex justify-between text-sm">
                        <span>{method.method_name.split(' ')[0]}</span>
                        <span className="font-medium">{method.usage_frequency}x</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Customer Approval Rates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {methodAnalysis.map((method) => (
                      <div key={method.method_id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{method.method_name.split(' ')[0]}</span>
                          <span className="font-medium">
                            {Math.round(method.customer_approval_rate * 100)}%
                          </span>
                        </div>
                        <Progress value={method.customer_approval_rate * 100} className="h-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Cost Impact Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {methodAnalysis.map((method) => (
                      <div key={method.method_id} className="flex justify-between text-sm">
                        <span>{method.method_name.split(' ')[0]}</span>
                        <span
                          className={`font-medium ${method.cost_difference_percent > 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {method.cost_difference_percent > 0 ? '+' : ''}
                          {method.cost_difference_percent.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Bulk Operations Tab */}
        {showBulkOperations && (
          <TabsContent value="bulk-ops" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Bulk operations allow you to update tax calculation methods for multiple quotes
                simultaneously. Use with caution as this affects customer quotes directly.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="bulk-mode"
                    checked={bulkSelectionMode}
                    onCheckedChange={setBulkSelectionMode}
                  />
                  <Label htmlFor="bulk-mode">Enable Bulk Selection Mode</Label>
                </div>
                {bulkSelectionMode && (
                  <Badge variant="outline">{selectedQuotes.length} quotes selected</Badge>
                )}
              </div>
              {bulkSelectionMode && selectedQuotes.length > 0 && (
                <div className="flex space-x-2">
                  {methodAnalysis.map((method) => (
                    <Button
                      key={method.method_id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkMethodUpdate(method.method_id)}
                      className="flex items-center space-x-1"
                    >
                      <span>Apply {method.method_name.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {bulkSelectionMode && (
              <Card className="p-4">
                <CardHeader>
                  <CardTitle>Bulk Quote Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    Select quotes to update by clicking the checkboxes. This feature requires
                    integration with the quote management interface to display available quotes.
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    Quote selection interface will be integrated here
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Configuration Tab */}
        {showAdvancedConfig && (
          <TabsContent value="config" className="space-y-4">
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Panel Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-optimization">Auto-Optimization</Label>
                      <p className="text-sm text-gray-600">
                        Automatically select best performing methods
                      </p>
                    </div>
                    <Switch
                      id="auto-optimization"
                      checked={autoOptimizationEnabled}
                      onCheckedChange={setAutoOptimizationEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="bulk-operations">Bulk Operations</Label>
                      <p className="text-sm text-gray-600">Enable bulk method updates</p>
                    </div>
                    <Switch
                      id="bulk-operations"
                      checked={showBulkOperations}
                      onCheckedChange={() => {}} // Would be controlled by parent props
                      disabled
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Analysis Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Default Time Range</Label>
                      <select
                        value={analysisTimeRange}
                        onChange={(e) =>
                          setAnalysisTimeRange(e.target.value as '7d' | '30d' | '90d')
                        }
                        className="w-full mt-1 px-3 py-1 border rounded-md"
                      >
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                        <option value="90d">90 days</option>
                      </select>
                    </div>
                    <div>
                      <Label>Cache Duration</Label>
                      <div className="mt-1 px-3 py-1 bg-gray-50 rounded-md">10 minutes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security & Audit</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Admin ID</span>
                    <div className="font-medium">{adminId || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Analysis</span>
                    <div className="font-medium">{lastAnalysisUpdate.toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  All method changes are logged with timestamps, admin IDs, and detailed reasoning
                  for audit purposes.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
