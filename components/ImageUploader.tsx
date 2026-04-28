import React, { useRef, useState } from 'react';
import Icon from './Icons';

interface ImageUploaderProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onImageRemove: () => void;
  uploadedImagePreview?: string | null;
  label: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onImageRemove, uploadedImagePreview, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onImageUpload(file, previewUrl);
    }
    // Reset input value so the same file can be selected again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      onImageUpload(file, previewUrl);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Icon name="image" className="w-3 h-3" />
          {label}
        </label>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/png, image/jpeg, image/jpg"
          onChange={handleFileChange}
        />
        
        {uploadedImagePreview ? (
            <div className="relative w-full h-48 bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden group">
                <img src={uploadedImagePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onImageRemove();
                        }}
                        className="bg-red-500 text-white rounded-full h-10 w-10 flex items-center justify-center hover:bg-red-600 transition shadow-lg transform hover:scale-110"
                        aria-label="Remove image"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
            </div>
        ) : (
            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full h-32 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                    ${isDragging
                        ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]' 
                        : 'border-gray-700 bg-gray-900/30 hover:border-gray-500 hover:bg-gray-800/50'}
                `}
            >
                <div className="mb-3 text-gray-500 group-hover:text-pink-400 transition-colors">
                    <Icon name="upload" className="w-8 h-8" />
                </div>
                <p className="text-gray-400 text-center text-sm px-4 font-medium">Klik atau Seret Foto</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">PNG, JPG, JPEG</p>
            </div>
        )}
    </div>
  );
};

export default ImageUploader;