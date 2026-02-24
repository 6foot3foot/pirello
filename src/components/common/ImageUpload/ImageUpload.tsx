import { useRef, useState } from 'react';
import { files } from '../../../services';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  placeholder?: string;
}

export function ImageUpload({ value, onChange, placeholder = 'Upload image' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = await files.upload(file);
      onChange(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={styles.container}>
      {value ? (
        <div className={styles.preview}>
          <img src={value} alt="" className={styles.image} />
          <button
            type="button"
            className={styles.removeBtn}
            onClick={handleRemove}
            title="Remove image"
          >
            ×
          </button>
        </div>
      ) : (
        <label className={styles.uploadArea}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={styles.input}
            disabled={isUploading}
          />
          {isUploading ? (
            <span className={styles.uploading}>Uploading...</span>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
