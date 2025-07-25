/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HSN_ENCRYPTION_KEY?: string
  readonly VITE_INDIA_GST_API_KEY?: string
  readonly VITE_TAXJAR_API_KEY?: string
  readonly VITE_SCRAPER_API_KEY?: string
  readonly VITE_NODE_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
