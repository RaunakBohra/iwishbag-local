import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CustomerPaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
  itemType?: string; // "quotes" or "orders"
}

export const CustomerPaginationControls: React.FC<CustomerPaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageSize,
  total,
  hasNext,
  hasPrev,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  itemType = 'items',
}) => {
  // Calculate the range of items being shown
  const startItem = totalPages === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  // Generate limited page numbers for mobile-friendly display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    
    if (currentPage <= 3) {
      // Show first 3 pages, ellipsis, then last page
      pages.push(1, 2, 3);
      if (totalPages > 4) pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Show first page, ellipsis, then last 3 pages
      pages.push(1);
      if (totalPages > 4) pages.push('ellipsis');
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Show first page, ellipsis, current page, ellipsis, last page
      pages.push(1, 'ellipsis', currentPage, 'ellipsis', totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Showing {total} {itemType}</span>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              Total: {total}
            </Badge>
          )}
        </div>
        
        {total > 10 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      {/* Results info and page size selector */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{total}</span> {itemType}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev || isLoading}
          className="h-9 w-20"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {/* Page numbers - simplified for mobile */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className="h-9 w-9 p-0"
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext || isLoading}
          className="h-9 w-20"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Page indicator for very small screens */}
      <div className="sm:hidden">
        <Badge variant="outline">
          Page {currentPage} of {totalPages}
        </Badge>
      </div>
    </div>
  );
};