"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection, FileError } from 'react-dropzone';
import { motion } from 'framer-motion';
import { X, Camera, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (creation: any) => void;
  childName: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess, childName }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some((e: FileError) => e.code === 'file-too-large')) {
        setError(`File is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      } else if (rejection.errors.some((e: FileError) => e.code === 'file-invalid-type')) {
        setError('Only image files are allowed (JPEG, PNG, GIF, WEBP)');
      } else {
        setError('File rejected due to unknown error.');
      }
      return;
    }

    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': [],
    },
    disabled: isUploading
  });

  const handleSubmit = async () => {
    if (!file) return setError('Please select a file first');

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('childName', childName);
      formData.append('description', description);
      formData.append('isPublic', String(isPublic));

      const response = await fetch('/api/creations/upload', { method: 'POST', body: formData });
      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      await new Promise(res => setTimeout(res, 500));

      setSuccess(true);
      await new Promise(res => setTimeout(res, 1000));

      onSuccess(result);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Upload failed. Please try again.';
      if (err.message.includes('413')) msg = 'File too large (max 5MB).';
      else if (err.message.includes('415')) msg = 'Unsupported file type.';
      setError(msg);
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setDescription('');
    setIsPublic(true);
    setProgress(0);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{success ? 'Upload Complete!' : 'Share Your Creation'}</h2>
            <button onClick={() => { if (!isUploading) { resetForm(); onClose(); } }}
              className="text-purple-200 hover:text-white transition-colors" disabled={isUploading}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-400/20 mb-4">
                <CheckCircle className="h-10 w-10 text-green-300" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Successfully Uploaded!</h3>
              <p className="text-purple-200 mb-6">Your artwork has been shared with the community.</p>
              <Button onClick={() => { resetForm(); onClose(); }} className="w-full">Close</Button>
            </div>
          ) : (
            <>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${isDragActive ? 'border-blue-400 bg-blue-500/10' : error ? 'border-red-300 bg-red-500/10' : 'border-white/20 hover:border-white/40'} ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative h-48 w-full rounded-md overflow-hidden mb-4">
                    <img src={preview} alt="Preview" className="object-contain w-full h-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-white/10">
                      {error ? <AlertCircle className="h-6 w-6 text-red-400" /> : isDragActive ? <UploadCloud className="h-6 w-6 text-blue-400" /> : <Camera className="h-6 w-6 text-purple-200" />}
                    </div>
                    <p className="text-sm text-purple-200">{error ? 'Try another file' : isDragActive ? 'Drop your artwork here' : 'Drag & drop or click to select'}</p>
                    <p className="text-xs text-purple-300">JPEG, PNG, GIF, WEBP (max 5MB)</p>
                  </div>
                )}
              </div>

              {error && <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg text-red-300 text-sm mb-4"><div className="font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-2" />Upload Error</div><div className="mt-1">{error}</div></div>}

              <div className="space-y-4">
                <Input placeholder="What did you create? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                <div className="flex items-center space-x-2">
                  <Switch id="visibility" checked={isPublic} onCheckedChange={setIsPublic} disabled={isUploading} />
                  <label htmlFor="visibility" className="text-sm font-medium text-purple-100">{isPublic ? 'Public (Visible to everyone)' : 'Private (Only visible to family)'}</label>
                </div>

                {isUploading && <Progress value={progress} className="h-2" />}

                <div className="flex space-x-3 pt-2">
                  <Button onClick={() => { if (!isUploading) { resetForm(); onClose(); } }} variant="outline" className="flex-1" disabled={isUploading}>Cancel</Button>
                  <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white" disabled={!file || isUploading}>
                    {isUploading ? 'Uploading...' : 'Share Artwork'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
