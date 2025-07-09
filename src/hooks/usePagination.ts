import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  totalCount?: number;
  useUrlState?: boolean;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  goToPage: (page: number) => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  pageSizeOptions: number[];
  pageRange: { from: number; to: number };
}

export const usePagination = (options: PaginationOptions = {}): UsePaginationReturn => {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    totalCount: initialTotalCount = 0,
    useUrlState = true
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL if enabled
  const getInitialPage = () => {
    if (useUrlState) {
      const urlPage = searchParams.get('page');
      return urlPage ? Math.max(1, parseInt(urlPage, 10)) : initialPage;
    }
    return initialPage;
  };

  const getInitialPageSize = () => {
    if (useUrlState) {
      const urlPageSize = searchParams.get('pageSize');
      return urlPageSize && pageSizeOptions.includes(parseInt(urlPageSize, 10)) 
        ? parseInt(urlPageSize, 10) 
        : initialPageSize;
    }
    return initialPageSize;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [pageSize, setPageSizeState] = useState(getInitialPageSize());
  const [totalCount, setTotalCountState] = useState(initialTotalCount);

  // Update URL when pagination changes
  useEffect(() => {
    if (useUrlState) {
      const params = new URLSearchParams(searchParams);
      
      if (currentPage === 1) {
        params.delete('page');
      } else {
        params.set('page', currentPage.toString());
      }
      
      if (pageSize === initialPageSize) {
        params.delete('pageSize');
      } else {
        params.set('pageSize', pageSize.toString());
      }
      
      setSearchParams(params, { replace: true });
    }
  }, [currentPage, pageSize, useUrlState, searchParams, setSearchParams, initialPageSize]);

  // Calculate derived state
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const endIndex = useMemo(() => Math.min(startIndex + pageSize - 1, totalCount - 1), [startIndex, pageSize, totalCount]);

  // Calculate page range for Supabase
  const pageRange = useMemo(() => ({
    from: startIndex,
    to: endIndex
  }), [startIndex, endIndex]);

  // Actions
  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size)) {
      setPageSizeState(size);
      // Reset to first page when changing page size
      setCurrentPage(1);
    }
  }, [pageSizeOptions]);

  const setTotalCount = useCallback((count: number) => {
    setTotalCountState(Math.max(0, count));
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(currentPage + 1);
    }
  }, [currentPage, hasNextPage, setPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(currentPage - 1);
    }
  }, [currentPage, hasPreviousPage, setPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages, setPage]);

  const goToPage = useCallback((page: number) => {
    setPage(page);
  }, [setPage]);

  return {
    // State
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    pageSizeOptions,
    pageRange,
    
    // Actions
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    goToPage
  };
};