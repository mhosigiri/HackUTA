/**
 * Application configuration constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  ENDPOINTS: {
    DOCUMENTS: '/api/documents',
    UPLOAD: '/api/documents/upload',
    PROCESS: (documentId: string) => `/api/documents/${documentId}/process`,
    RAG_QUERY: '/api/rag/query',
    RAG_STATS: '/api/rag/stats',
    DETAIL: (documentId: string) => `/api/documents/${documentId}`,
    MORTGAGE_KB_QUERY: '/api/mortgage-kb/query',
    MORTGAGE_KB_STATS: '/api/mortgage-kb/stats',
    MORTGAGE_KB_TTS: '/api/mortgage-kb/tts',
  },
} as const;

// Upload Configuration
export const UPLOAD_CONFIG = {
  ACCEPTED_FILE_TYPES: '.pdf,.jpg,.jpeg,.png',
  ACCEPTED_FILE_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png'],
  MAX_FILE_SIZE_MB: 10,
  USE_RAG_PROCESSING: true,
} as const;

// UI Configuration
export const UI_CONFIG = {
  SUCCESS_MESSAGE_DURATION_MS: 2000,
  RAG_DEFAULT_RESULTS_COUNT: 3,
} as const;

// Status Messages
export const STATUS_MESSAGES = {
  UPLOAD: {
    IN_PROGRESS: (count: number) => `Uploading ${count} file(s)...`,
    SUCCESS: (count: number) => `Successfully uploaded ${count} file(s)!`,
    PROCESSING: (fileName: string) => `Processing ${fileName}...`,
    WAITING: (fileName: string) => `Waiting for ${fileName} to finish...`,
    COMPLETE: 'All files processed successfully!',
    ERROR: 'Failed to upload documents. Please try again.',
  },
  RAG: {
    SEARCHING: 'Searching...',
    BUTTON_LABEL: 'Ask AI',
    ERROR: 'Failed to get response. Please make sure documents are processed first.',
    NO_QUERY: 'Please enter a question',
  },
} as const;

// Document Status Types
export const DOCUMENT_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];
