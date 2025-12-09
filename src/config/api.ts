// API Configuration

// Server options
export const API_SERVERS = {
  local: 'http://127.0.0.1:8000',
  remote: 'https://gb-ocr-stage.vertekx.com',
} as const;

export type ServerType = keyof typeof API_SERVERS;

// Default server (can be changed)
export const DEFAULT_SERVER: ServerType = 'remote';

// Get API base URL by server type
export const getApiBaseUrl = (serverType: ServerType): string => {
  return API_SERVERS[serverType];
};

// Legacy export for backward compatibility
export const API_BASE_URL = API_SERVERS.remote;
