}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 bg-white">
            <div className="p-6">
              {/* Navigation breadcrumb */}
              <Flex align="center" gap="sm" className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100"
                >
                  <Home className="h-4 w-4" />
                </Button>
                {currentConfig.breadcrumb.map((crumb, index) => (
                  <React.Fragment key={crumb}>
                    {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                    <Text
                      size="sm"
                      color={index === currentConfig.breadcrumb.length - 1 ? 'primary' : 'muted'}
                      weight={index === currentConfig.breadcrumb.length - 1 ? 'medium' : 'normal'}
                    >
                      {crumb}
                    </Text>
                  </React.Fragment>
                ))}
              </Flex>

              {/* Title and description */}
              <Flex justify="between" align="start">
                <Stack spacing="sm">
                  <Flex align="center" gap="sm">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      {currentConfig.icon}
                    </div>
                    <Heading level={2} size="xl">
                      {currentConfig.title}
                    </Heading>
                  </Flex>
                  <Text color="muted">{currentConfig.description}</Text>
                  {quote && (
                    <Flex align="center" gap="sm">
                      <Badge variant="outline">
                        {quote.origin_country} → {quote.destination_country}
                      </Badge>
                      <Badge variant="secondary">Quote #{quote.display_id}</Badge>
                    </Flex>
                  )}
                </Stack>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Flex>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div key={contentKey}>{renderPanelContent()}</div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
            <div className="p-4">
              <Flex justify="between" align="center">
                <Flex align="center" gap="sm">
                  {isCalculating && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <Text size="sm" color="muted">
                        Calculating...
                      </Text>
                    </>
                  )}
                </Flex>

                <Flex gap="sm">
                  <Button variant="outline" onClick={onClose}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Overview
                  </Button>
                  <Button onClick={onRecalculate} disabled={isCalculating}>
                    Apply Changes
                  </Button>
                </Flex>
              </Flex>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
