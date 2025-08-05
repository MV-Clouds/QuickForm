import React, { useState, useCallback } from 'react';
import { FaEdit } from 'react-icons/fa';

const ImageUploader = ({ defaultImage, onImageUpload }) => {
  const [image, setImage] = useState(defaultImage);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileChange = useCallback(async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const imageUrl = event.target.result;
      console.log('img url:: ',imageUrl);
      
      setImage(imageUrl);
      
      if (onImageUpload) {
        try {
          const base64String = imageUrl.split(',')[1];
          const apiUrl = `https://gqmyfq34x5.execute-api.us-east-1.amazonaws.com/image?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            body: base64String,
            headers: { 'Content-Type': 'application/octet-stream' },
          });
          
          const data = await response.json();
          if (response.ok) {
            onImageUpload({ backgroundImage: data.fileUrl });
          }
        } catch (error) {
          console.error('Upload error:', error);
        }
      }
    };
    
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div 
      className="relative w-[200px] h-48 bg-gray-100 rounded-sm overflow-hidden flex items-center justify-start"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={triggerFileInput}
    >
      {/* Default/Uploaded Image */}
      {image && (
        <img
          src={image}
          alt="Upload preview"
          className={`h-full w-[200px] object-cover transition-opacity duration-300 ${isHovered ? 'opacity-50' : 'opacity-100'}`}
        />
      )}
      
      {/* Edit Icon (shown on hover) */}
      {isHovered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 bg-white bg-opacity-80 rounded-full shadow-md">
            <FaEdit className="text-gray-700 text-xl" />
          </div>
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {/* Instruction text (only shown when no image) */}
      {!image && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">Click to upload image</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;