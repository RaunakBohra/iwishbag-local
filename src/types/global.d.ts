/**
 * Global type definitions for enhanced features
 */

import type { QueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    __REACT_QUERY_CLIENT__?: QueryClient;
  }
}