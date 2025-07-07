import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, CameraIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (base64: string, file: File) => void;
  currentImagePreview?: string | null;
  label: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'custom';
  idSuffix?: string;
}

const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const IMAGE_QUALITY = 0.9;

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  currentImagePreview,
  label,
  aspectRatio = 'square',
  idSuffix = 'default'
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Max 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const originalBase64 = e.target?.result as string;
      if (!originalBase64) {
        setError('Failed to read file.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_IMAGE_WIDTH) {
            height = Math.round(height * (MAX_IMAGE_WIDTH / width));
            width = MAX_IMAGE_WIDTH;
          }
        } else {
          if (height > MAX_IMAGE_HEIGHT) {
            width = Math.round(width * (MAX_IMAGE_HEIGHT / height));
            height = MAX_IMAGE_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas error.');
          onImageUpload(originalBase64, file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let outputType = file.type;
        if (outputType !== 'image/png' && outputType !== 'image/webp') {
          outputType = 'image/jpeg';
        }

        const resizedBase64 = canvas.toDataURL(outputType, IMAGE_QUALITY);
        onImageUpload(resizedBase64, file);
      };
      img.onerror = () => {
        setError('Failed to process image.');
      };
      img.src = originalBase64;
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  let aspectClass = 'aspect-square';
  if (aspectRatio === 'portrait') aspectClass = 'aspect-[3/4]';
  else if (aspectRatio === 'landscape') aspectClass = 'aspect-video';

  return (
    <div className="w-full">
      <label
        htmlFor={`file-upload-${idSuffix}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer group
                    transition-colors duration-200 ease-in-out
                    ${dragOver ? 'border-[#ff1818] bg-gray-100' : 'border-gray-300 hover:border-gray-400 bg-white'}
                    ${currentImagePreview ? `p-0 overflow-hidden ${aspectClass}` : `flex-col ${aspectClass}`}`}
        aria-label={label}
      >
        {currentImagePreview ? (
          <img src={currentImagePreview} alt="Preview" className="object-cover w-full h-full rounded-xl group-hover:opacity-75 transition-opacity" />
        ) : (
          <div className="space-y-1 text-center p-4">
            <CameraIcon className="mx-auto h-12 w-12 text-gray-400 group-hover:text-[#ff1818] transition-colors" aria-hidden="true" />
            <div className="flex text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
              <span className="font-medium text-[#ff1818] group-hover:text-[#ff4545]">Upload a file</span>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP. Max 10MB.</p>
            <p className="text-xs text-gray-500">(Will resize if needed)</p>
          </div>
        )}
        <input
          id={`file-upload-${idSuffix}`}
          name={`file-upload-${idSuffix}`}
          type="file"
          className="sr-only"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
      </label>
      {currentImagePreview && (
        <button
          type="button"
          onClick={triggerFileInput}
          className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff1818] hover:bg-[#e00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#ff1818] transition-colors"
        >
          <UploadIcon className="w-5 h-5 mr-2" aria-hidden="true" />
          Change {label}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
};

export default ImageUploader;