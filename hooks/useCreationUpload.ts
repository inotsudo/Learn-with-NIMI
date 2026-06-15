"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import supabase from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Creation, UploadFormState } from "@/components/community/types";

const IMAGE_ERROR_KEYS = ['invalidImageTypeMsg', 'imageTooLargeMsg', 'imageDimensionsTooLargeMsg', 'invalidImageFileMsg'];

export const defaultUploadForm: UploadFormState = {
  childName: "",
  age: "",
  description: "",
  isPublic: true,
  imageFile: null,
  previewUrl: "",
  uploadProgress: 0,
  isUploading: false,
  shareMethod: "public",
  creationType: "art",
};

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function getPublicUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http')) return imageUrl;
  const pathParts = imageUrl.split('/creations/');
  const fileName = pathParts[pathParts.length - 1];
  const { data: { publicUrl } } = supabase.storage.from('creations').getPublicUrl(fileName);
  return publicUrl;
}

// Validates an image file. Throws translation keys (from IMAGE_ERROR_KEYS), translated by the caller.
function validateImage(file: File): Promise<boolean> {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return Promise.reject(new Error('invalidImageTypeMsg'));
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return Promise.reject(new Error('imageTooLargeMsg'));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > 4000 || img.height > 4000) {
        reject(new Error('imageDimensionsTooLargeMsg'));
      } else {
        resolve(true);
      }
    };
    img.onerror = () => reject(new Error('invalidImageFileMsg'));
    img.src = URL.createObjectURL(file);
  });
}

interface UseCreationUploadOptions {
  parentId: string;
  childId: string | null;
  onCreated?: (creation: Creation) => void;
  onError: (message: string) => void;
  onCelebrate: (message: string) => void;
}

export function useCreationUpload({ parentId, childId, onCreated, onError, onCelebrate }: UseCreationUploadOptions) {
  const { t } = useLanguage();
  const [uploadForm, setUploadForm] = useState<UploadFormState>(defaultUploadForm);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.imageFile) return onError(t("selectImageErrorMsg"));

    try {
      setUploadForm(prev => ({ ...prev, isUploading: true }));
      await validateImage(uploadForm.imageFile);

      const fileExt = uploadForm.imageFile.name.split('.').pop();
      const tempFileName = `${uploadForm.shareMethod === 'whatsapp' ? 'temp_' : ''}${uuidv4()}.${fileExt}`;
      const filePath = `${uploadForm.shareMethod === 'whatsapp' ? 'temp-creations' : 'creations'}/${tempFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('creations')
        .upload(filePath, uploadForm.imageFile, {
          cacheControl: '3600',
          upsert: uploadForm.shareMethod === 'whatsapp',
          contentType: uploadForm.imageFile.type,
        });
      if (uploadError) throw uploadError;

      const imageUrl = getPublicUrl(filePath);

      if (uploadForm.shareMethod === 'whatsapp') {
        const shareText = `${t("whatsappShareText").replace("{name}", uploadForm.childName)}${uploadForm.description ? `\n${uploadForm.description}` : ''}\n\n${imageUrl}`;
        const encodedText = encodeURIComponent(shareText);

        const whatsappUrl = isMobileDevice()
          ? `whatsapp://send?text=${encodedText}`
          : `https://web.whatsapp.com/send?text=${encodedText}`;

        window.open(whatsappUrl, "_blank");

        setTimeout(async () => {
          try {
            await supabase.storage.from('creations').remove([filePath]);
          } catch (cleanupError) {
            console.error("Error cleaning up temporary file:", cleanupError);
          }
        }, 3600000);

        setShowUploadModal(false);
        setUploadForm(defaultUploadForm);
        onCelebrate(t("sharedViaWhatsappMsg"));
        return;
      }

      const { data: creation, error: insertError } = await supabase
        .from('creations')
        .insert({
          parent_id: parentId,
          child_id: childId,
          child_name: uploadForm.childName,
          age: parseInt(uploadForm.age),
          description: uploadForm.description,
          is_public: uploadForm.isPublic,
          image_url: imageUrl,
          type: uploadForm.creationType,
          completion_status: 'completed',
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const newCreation: Creation = {
        id: creation.id,
        childName: creation.child_name,
        age: creation.age,
        description: creation.description,
        imageUrl: creation.image_url,
        likes: 0,
        likedByUser: false,
        isPublic: creation.is_public,
        type: creation.type,
        completionStatus: creation.completion_status,
        createdAt: creation.created_at,
        status: creation.status,
      };

      onCreated?.(newCreation);

      setShowUploadModal(false);
      setUploadForm({ ...defaultUploadForm, isPublic: true });
      onCelebrate(t("creationSharedMsg"));
    } catch (err: any) {
      onError(IMAGE_ERROR_KEYS.includes(err?.message) ? t(err.message) : t("uploadFailedErrorMsg"));
    } finally {
      setUploadForm(prev => ({ ...prev, isUploading: false }));
    }
  };

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (uploadForm.previewUrl) URL.revokeObjectURL(uploadForm.previewUrl);
    };
  }, [uploadForm.previewUrl]);

  return { uploadForm, setUploadForm, showUploadModal, setShowUploadModal, handleUploadSubmit };
}
