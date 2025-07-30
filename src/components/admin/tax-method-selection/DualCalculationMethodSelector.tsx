}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculationMethods.map((method) => (
          <Card
            key={method.id}
            className={`cursor-pointer transition-all duration-200 ${
              selectedMethod === method.id
                ? 'ring-2 ring-primary border-primary bg-primary/5'
                : 'hover:shadow-md hover:border-gray-300'
            } ${isLoading || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleMethodSelection(method.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedMethod === method.id ? 'bg-primary text-white' : 'bg-gray-100'
                    }`}
                  >
                    {method.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <span>{method.name}</span>
                      {method.recommended && (
                        <Badge variant="default" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`text-sm font-medium ${getConfidenceColor(method.confidence)}`}
                      >
                        {Math.round(method.confidence * 100)}% confidence
                      </span>
                      {getConfigurationBadge(method)}
                    </div>
                  </div>
                </div>
                {selectedMethod === method.id && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-3">{method.description}</p>

              <div className="space-y-3">
                {method.pros.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">Advantages:</div>
                    <ul className="text-xs text-green-600 space-y-1">
                      {method.pros.slice(0, 2).map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {method.cons.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1">Considerations:</div>
                    <ul className="text-xs text-red-600 space-y-1">
                      {method.cons.slice(0, 2).map((con, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={analyzeMethodAvailability}
          disabled={isAnalyzing}
          className="flex items-center space-x-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span>{isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}</span>
        </Button>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>{adminId ? 'Admin Override' : 'System Selection'}</span>
        </div>
      </div>

      {/* Method-specific warnings */}
      {selectedMethod === 'hsn_only' && !hsnAvailability && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            HSN data is not available for this route. The system will automatically fall back to
            legacy calculation. Consider setting up HSN codes for items or using Auto method for
            intelligent selection.
          </AlertDescription>
        </Alert>
      )}

      {selectedMethod === 'legacy_fallback' &&
        methodAnalysis?.unified_data.confidence_score < 0.7 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Legacy fallback has low confidence (
              {Math.round(methodAnalysis.unified_data.confidence_score * 100)}%) for this route.
              Consider configuring specific shipping routes or using Auto method.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
};
