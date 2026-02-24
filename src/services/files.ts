const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const FILES_ENDPOINT = `${API_BASE}/api/files`;

export interface UploadedFile {
  hash: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export const files = {
  /**
   * Upload a file and return its metadata
   */
  async upload(file: File): Promise<UploadedFile> {
    const buffer = await file.arrayBuffer();
    
    const response = await fetch(FILES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': file.name,
      },
      body: buffer,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `Upload failed with status ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Get the URL for a file by its hash
   */
  getUrl(hash: string): string {
    return `${FILES_ENDPOINT}/${hash}`;
  },

  /**
   * Check if a URL is a local file reference
   */
  isLocalFile(url: string): boolean {
    return url.startsWith('/api/files/') || url.startsWith(FILES_ENDPOINT);
  },
};
