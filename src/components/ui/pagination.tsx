// Complete pagination component for Blog.tsx
import React from 'react';
import { Button } from './button';

interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  children?: React.ReactNode;
}

export function Pagination({ currentPage = 1, totalPages = 1, onPageChange, children }: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {children}
    </div>
  );
}

export function PaginationContent({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

export function PaginationItem({ children }: { children: React.ReactNode }) {
  return <div className="pagination-item">{children}</div>;
}

export function PaginationLink({ 
  href, 
  children, 
  isActive = false 
}: { 
  href?: string; 
  children: React.ReactNode; 
  isActive?: boolean;
}) {
  return (
    <Button variant={isActive ? 'default' : 'outline'} size="sm">
      {children}
    </Button>
  );
}

export function PaginationPrevious({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      Previous
    </Button>
  );
}

export function PaginationNext({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      Next
    </Button>
  );
}

export function PaginationEllipsis() {
  return <span className="px-2">...</span>;
}