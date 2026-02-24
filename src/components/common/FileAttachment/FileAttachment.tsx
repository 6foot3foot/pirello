import { useRef, useState } from 'react';
import { files } from '../../../services';
import type { Attachment } from '../../../types';
import { generateId } from '../../../utils';
import styles from './FileAttachment.module.css';

interface FileAttachmentProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  readonly?: boolean;
}

export function FileAttachment({ attachments, onChange, readonly = false }: FileAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const newAttachments: Attachment[] = [];
      
      for (const file of Array.from(fileList)) {
        const uploaded = await files.upload(file);
        newAttachments.push({
          id: generateId(),
          hash: uploaded.hash,
          filename: uploaded.filename,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      
      onChange([...attachments, ...newAttachments]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  return (
    <div className={styles.container}>
      {attachments.length > 0 && (
        <div className={styles.list}>
          {attachments.map(attachment => (
            <div key={attachment.id} className={styles.item}>
              {isImage(attachment.mimeType) ? (
                <a
                  href={files.getUrl(attachment.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.imageLink}
                >
                  <img
                    src={files.getUrl(attachment.hash)}
                    alt={attachment.filename}
                    className={styles.thumbnail}
                  />
                </a>
              ) : (
                <a
                  href={files.getUrl(attachment.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileLink}
                >
                  <span className={styles.fileIcon}>📎</span>
                  <span className={styles.fileName}>{attachment.filename}</span>
                  <span className={styles.fileSize}>{formatSize(attachment.size)}</span>
                </a>
              )}
              {!readonly && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(attachment.id)}
                  title="Remove attachment"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readonly && (
        <label className={styles.uploadArea}>
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className={styles.input}
            disabled={isUploading}
          />
          {isUploading ? (
            <span className={styles.uploading}>Uploading...</span>
          ) : (
            <span className={styles.placeholder}>+ Add attachment</span>
          )}
        </label>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
