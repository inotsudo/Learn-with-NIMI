"use client";

import React, { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Camera, Share2, MessageCircle, Heart, Loader2 } from "lucide-react";
import { CreationCard } from "@/components/community/CreationCard";
import  UploadModal  from "@/components/community/UploadModal";
import { NimiChat } from "@/components/community/NimiChat";
import type { Comment as AppComment} from "@/components/community/types";
import { CelebrationBanner } from "@/components/community/CelebrationBanner";
import { ErrorToast } from "@/components/community/ErrorToast";
import { Creation,UploadFormState, ShareMethod, PikoPal, UserMessage } from "@/components/community/types";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { useNimiChat } from "@/hooks/useNimiChat";
import Link from "next/link";



// const observerTarget = useRef<HTMLDivElement>(null);

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CommunityPage Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We're having trouble loading the community page. Please try refreshing.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-full font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Skeleton Components
const PikopalSkeleton = () => (
  <Card className="mb-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-none shadow-xl">
    <CardHeader>
      <CardTitle className="flex items-center justify-center text-2xl">
        <Skeleton className="w-8 h-8 mr-3 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </CardContent>
  </Card>
);

const CreationCardSkeleton = () => (
  <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <Skeleton className="h-60 w-full" />
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-full mr-2" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-10" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const CommentSkeleton = () => (
  <div className="flex items-start space-x-3 animate-pulse">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

const CommunityPage = () => {
  const supabase = createClientComponentClient();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [pikopals, setPikopals] = useState<PikoPal[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    creations: true,
    pikopals: true,
    user: true,
    comments: {} as Record<string, boolean>,
    likes: {} as Record<string, boolean>,
    initialLoad: true
  });
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState("");
  const [currentUser, setCurrentUser] = useState({
    id: "",
    name: "Guest",
    avatar: "👤",
    avatarUrl: ""
  });
  const [headerImageError, setHeaderImageError] = useState(false);
  const [hasMoreCreations, setHasMoreCreations] = useState(true);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const creationsContainerRef = useRef<HTMLDivElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    childName: "",
    age: "",
    description: "",
    isPublic: true,
    imageFile: null,
    previewUrl: "",
    uploadProgress: 0,
    isUploading: false,
    shareMethod: "public", // ✅ must be ShareMethod type
  });
  
  // Use custom hooks for data fetching
  const { data: userData, loading: userLoading } = useSupabaseQuery(
    () => supabase.auth.getUser().then(({ data: { user } }) => user),
    [supabase]
  );

  // Nimi chat hook
  const { messages: nimiMessages, isTyping: isNimiTyping, sendMessage: handleNimiSend } = useNimiChat(currentUser);

  // Generate unique ID
  const generateUniqueId = () => uuidv4();

  // Validate image file
  const validateImage = async (file: File): Promise<boolean> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Please upload JPG, PNG, GIF, or WebP images only');
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Image must be smaller than 5MB');
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width > 4000 || img.height > 4000) {
          reject(new Error('Image dimensions too large (max 4000x4000 pixels)'));
        } else {
          resolve(true);
        }
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Fetch current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (userData) {
          // Try both tables
          const userQuery = supabase.from("users").select("*").eq("auth_user_id", userData.id).maybeSingle();
          const profileQuery = supabase.from("profiles").select("*").eq("id", userData.id).maybeSingle();
          
          const { data: profileData } = await Promise.race([
            userQuery,
            profileQuery,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 5000))
          ]) as any;

          if (profileData) {
            setCurrentUser({
              id: userData.id,
              name: profileData.full_name || userData.email?.split("@")[0] || "User",
              avatar: profileData.avatar_url || "👤",
              avatarUrl: profileData.avatar_url || ""
            });
          }
        }
      } catch (err: any) {
        console.error("Error fetching user:", err);
        setCurrentUser({
          id: "guest",
          name: "Guest",
          avatar: "👤",
          avatarUrl: ""
        });
      } finally {
        setLoadingStates(prev => ({ ...prev, user: false }));
      }
    };

    if (userData) {
      getCurrentUser();
    } else if (!userLoading) {
      setLoadingStates(prev => ({ ...prev, user: false }));
    }
  }, [userData, userLoading, supabase]);

// Fetch public creations with pagination - UPDATED
const fetchCreations = useCallback(async (pageNum: number = 0, refresh: boolean = false) => {
  try {
    if (refresh) {
      setLoadingStates(prev => ({ ...prev, creations: true }));
      setPage(0);
    }
    
    const PAGE_SIZE = 9;
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("creations")
      .select(`
        *,
        comments:comments(id, creation_id, author, author_avatar, content, created_at),
        likes:likes(id, user_id)
      `, { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (data) {
      const formattedCreations: Creation[] = data.map((c: any) => ({
        id: c.id,
        childId: c.child_id,
        childName: c.child_name || "Unknown",
        age: c.age,
        description: c.description,
        imageUrl: c.image_url,
        likes: c.likes?.length || 0,
        likedByUser: c.likes?.some((l: any) => l.user_id === currentUser.id) || false,
        isPublic: c.is_public !== undefined ? c.is_public : true,
        type: c.type || "art",
        completionStatus: c.completion_status || "completed",
        createdAt: c.created_at,
        comments: (c.comments || []).map((comment: any) => ({
          id: comment.id,
          creation_id: comment.creation_id,
          author: comment.author || "Anonymous",
          author_avatar: comment.author_avatar || "👤",
          content: comment.content,
          created_at: comment.created_at
        }))
      }));

      setCreations(prev => refresh ? formattedCreations : [...prev, ...formattedCreations]);
      setHasMoreCreations((count || 0) > to + 1);
    }
  } catch (err) {
    setError("Couldn't load creations. Please try refreshing the page.");
    console.error(err);
  } finally {
    setLoadingStates(prev => ({ ...prev, creations: false, initialLoad: false }));
  }
}, [currentUser.id, supabase]);

  // Initial fetch and refresh
  useEffect(() => {
    fetchCreations(0, true);
  }, [fetchCreations]);


  useInfiniteScroll(observerTarget as RefObject<HTMLElement>, () => {
    if (!loadingStates.creations && hasMoreCreations) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCreations(nextPage, false);
    }
  });
  

  const fetchPikopals = useCallback(async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, pikopals: true }));
  
      // Fetch children ordered by points
      const { data: children, error: childrenError } = await supabase
        .from("children")
        .select("*")
        .order("points", { ascending: false })
        .limit(5);
  
      if (childrenError) throw childrenError;
  
      if (children && children.length > 0) {
        const pikopalsData = children.map((child) => {
          let publicUrl = "";
          if (child.avatar_url) {
            // ✅ Generate public URL from Supabase storage path
            const { data } = supabase.storage
              .from("avatars") // <-- change this to your actual bucket name
              .getPublicUrl(child.avatar_url);
            publicUrl = data.publicUrl;
          }
  
          const count = child.achievements ?? 0;
          return {
            id: child.id,
            name: child.name,
            age: child.age,
            achievements: count,
            streak: child.streak || 0,
            avatar: publicUrl || "default-avatar.png", 
            avatarUrl: publicUrl, 
            title:
              count > 10
                ? "Master Creator"
                : count > 5
                ? "Creative Explorer"
                : "Rising Star",
          };
        });
  
        setPikopals(pikopalsData);
      }
    } catch (err) {
      console.error("Error fetching pikopals:", err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, pikopals: false }));
    }
  }, [supabase]);
  

  useEffect(() => {
    fetchPikopals();
  }, [fetchPikopals]);

  // Celebration animation
  const triggerCelebration = useCallback((text: string) => {
    setCelebrationText(text);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  // Handle like/unlike
  const handleLike = useCallback(async (creationId: string) => {
    try {
      const creation = creations.find(c => c.id === creationId);
      if (!creation) return;

      const newLikeState = !creation.likedByUser;

      // Set loading state for this like
      setLoadingStates(prev => ({
        ...prev,
        likes: { ...prev.likes, [creationId]: true }
      }));

      // Optimistic update
      setCreations(prev => prev.map(c => c.id === creationId ? {
        ...c,
        likedByUser: newLikeState,
        likes: newLikeState ? c.likes + 1 : c.likes - 1
      } : c));

      if (newLikeState) {
        await supabase.from("likes").insert({ creation_id: creationId, user_id: currentUser.id });
      } else {
        await supabase.from("likes").delete().eq("creation_id", creationId).eq("user_id", currentUser.id);
      }

      if (newLikeState && creation) {
        triggerCelebration(`You liked ${creation.childName}'s creation!`);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't update like. Please try again.");
      fetchCreations(0, true); // rollback
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        likes: { ...prev.likes, [creationId]: false }
      }));
    }
  }, [creations, currentUser.id, fetchCreations, supabase, triggerCelebration]);
  // CommunityPage.tsx
const handleAddComment = useCallback(
  async (creationId: string, content: string) => {
    console.log("[DEBUG] handleAddComment received content:", content);

    const sanitizedContent = DOMPurify.sanitize(content?.trim());
    if (!sanitizedContent) return false;

    const tempId = `temp-${Date.now()}`;

    // ✅ use currentUser instead of undefined "user"
    const tempComment: AppComment = {
      id: tempId,
      creationId,
      author: currentUser?.name || "Guest",
      authorAvatar: currentUser?.avatar || "",
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setCreations(prev =>
      prev.map(c =>
        c.id === creationId
          ? { ...c, comments: [...(c.comments || []), tempComment] }
          : c
      )
    );

    try {
      // Insert into Supabase
      console.log("[DEBUG] Inserting into Supabase:", sanitizedContent);
      const { data, error } = await supabase
        .from("comments")
        .insert({
          creation_id: creationId,
          author: currentUser?.name || "Guest",
          author_avatar: currentUser?.avatar || "",
          content: sanitizedContent,
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ Map DB fields → AppComment fields
      const dbComment: AppComment = {
        id: data.id,
        creationId: data.creation_id,
        author: data.author,
        authorAvatar: data.author_avatar,
        content: data.content,
        createdAt: data.created_at,
      };

      // Replace temp with DB result
      setCreations(prev =>
        prev.map(c =>
          c.id === creationId
            ? {
                ...c,
                comments: [
                  ...(c.comments?.filter(comment => comment.id !== tempId) || []),
                  dbComment,
                ],
              }
            : c
        )
      );

      return true;
    } catch (err) {
      console.error("Error adding comment:", err);

      // Rollback optimistic update
      setCreations(prev =>
        prev.map(c =>
          c.id === creationId
            ? {
                ...c,
                comments:
                  c.comments?.filter(comment => comment.id !== tempId) || [],
              }
            : c
        )
      );

      return false;
    }
  },
  [currentUser, supabase, setCreations]
);

  
 // Default upload form state
const defaultUploadForm = {
  childName: "",
  age: "",
  description: "",
  isPublic: false,
  imageFile: null as File | null,
  previewUrl: "",
  uploadProgress: 0,
  isUploading: false,
  shareMethod: 'whatsapp' as 'whatsapp' | 'public'
};

// Helper: Get public URL from Supabase storage
const getPublicUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http')) return imageUrl;
  const pathParts = imageUrl.split('/creations/');
  const fileName = pathParts[pathParts.length - 1];
  const { data: { publicUrl } } = supabase.storage
    .from('creations')
    .getPublicUrl(fileName);
  return publicUrl;
};

// Helper: Detect if device is mobile
const isMobileDevice = (): boolean => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Share via WhatsApp
const shareViaWhatsApp = async (creation: Creation) => {
  try {
    const imageUrl = getPublicUrl(creation.imageUrl);
    const shareText = `${creation.description || "Check out this amazing creation!"}\n\nBy ${creation.childName} (age ${creation.age})`;
    const encodedText = encodeURIComponent(`${shareText}\n\n${imageUrl}`);

    const whatsappUrl = isMobileDevice()
      ? `whatsapp://send?text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;

    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow) setError("Could not open WhatsApp. Please copy the link manually.");
  } catch (err) {
    console.error("WhatsApp sharing failed:", err);
    setError("WhatsApp sharing failed. Try copying the link manually.");
  }
};

// Share creation on multiple platforms
const shareCreation = useCallback(async (creation: Creation, platform?: string) => {
  try {
    const imageUrl = getPublicUrl(creation.imageUrl);
    const shareText = `${creation.description || "Check out this amazing creation!"}\n\nBy ${creation.childName} (age ${creation.age})`;
    const shareTitle = `Art by ${creation.childName}`;

    if (platform === 'whatsapp') {
      await shareViaWhatsApp(creation);
      return;
    }

    if (platform === 'facebook') {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbUrl, '_blank');
      return;
    }

    if (platform === 'twitter') {
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(imageUrl)}`;
      window.open(twUrl, '_blank');
      return;
    }

    // Generic Web Share API
    if (navigator.share) {
      await navigator.share({ title: shareTitle, text: shareText, url: imageUrl });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(imageUrl);
      triggerCelebration("Link copied to clipboard!");
    } else {
      setCelebrationText("Copy the image URL to share");
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }

  } catch (err) {
    console.error("Sharing failed:", err);
    setError("Sharing failed. Try copying the link manually.");
  }
}, [triggerCelebration, supabase]);

// Handle form upload & sharing
const handleUploadSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!uploadForm.imageFile) return setError("Please select an image to share");

  try {
    setUploadForm(prev => ({ ...prev, isUploading: true }));
    await validateImage(uploadForm.imageFile);

    const fileExt = uploadForm.imageFile.name.split('.').pop();
    const tempFileName = `${uploadForm.shareMethod === 'whatsapp' ? 'temp_' : ''}${generateUniqueId()}.${fileExt}`;
    const filePath = `${uploadForm.shareMethod === 'whatsapp' ? 'temp-creations' : 'creations'}/${tempFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('creations')
      .upload(filePath, uploadForm.imageFile, {
        cacheControl: '3600',
        upsert: uploadForm.shareMethod === 'whatsapp',
        contentType: uploadForm.imageFile.type
      });
    if (uploadError) throw uploadError;

    const imageUrl = getPublicUrl(filePath);

    // WhatsApp private sharing
    if (uploadForm.shareMethod === 'whatsapp') {
      const shareText = `Check out ${uploadForm.childName}'s creation!${uploadForm.description ? `\n${uploadForm.description}` : ''}\n\n${imageUrl}`;
      const encodedText = encodeURIComponent(shareText);

      const whatsappUrl = isMobileDevice()
        ? `whatsapp://send?text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;

      window.open(whatsappUrl, "_blank");

      // Cleanup temporary file after 1 hour
      setTimeout(async () => {
        try {
          await supabase.storage.from('creations').remove([filePath]);
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }, 3600000);

      setShowUploadModal(false);
      setUploadForm(defaultUploadForm);
      triggerCelebration("Shared privately via WhatsApp!");
      return;
    }

    // Public upload
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', currentUser.id)
      .limit(1);
    const childId = children?.[0]?.id || null;

    const { data: creation, error: insertError } = await supabase
      .from('creations')
      .insert({
        child_id: childId,
        child_name: uploadForm.childName,
        age: parseInt(uploadForm.age),
        description: uploadForm.description,
        is_public: uploadForm.isPublic,
        image_url: imageUrl,
        type: 'art',
        completion_status: 'completed'
      })
      .select()
      .single();
    if (insertError) throw insertError;

    setCreations(prev => [{
      id: creation.id,
      childId: creation.child_id,
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
      comments: []
    }, ...prev]);

    setShowUploadModal(false);
    setUploadForm({ ...defaultUploadForm, isPublic: true });
    triggerCelebration("Your creation has been shared publicly!");

  } catch (err: any) {
    setError(err.message || "Failed to upload creation. Please try again.");
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


  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <CelebrationBanner isVisible={showCelebration} text={celebrationText} />
        <ErrorToast error={error} onDismiss={() => setError(null)} />

        <UploadModal
        open={showUploadModal} // ✅ corrected from isOpen
        onClose={() => !uploadForm.isUploading && setShowUploadModal(false)}
        onSubmit={handleUploadSubmit}
        formState={uploadForm}
        setFormState={setUploadForm}
      />
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center">
              {headerImageError ? (
                <div className="flex items-center justify-center w-full max-h-[600px] bg-gradient-to-r from-purple-200 to-pink-200 rounded-2xl shadow-xl">
                  <span className="text-6xl">👥</span>
                </div>
              ) : (
                <img
                  src="/community.jpeg"
                  alt="Creative Community"
                  className="w-full max-h-[600px] object-cover rounded-2xl shadow-xl transition-transform duration-500 hover:scale-[1.02]"
                  onError={() => setHeaderImageError(true)}
                  loading="lazy"
                />
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Creative Community
            </h1>
            <p className="text-xl text-gray-700 mb-6">
              Share, explore, and celebrate creativity together!
            </p>
          </div>

          {/* Upload Card */}
          <Card className="mb-8 bg-gradient-to-r from-pink-100 to-purple-100 border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-2xl">
                <Sparkles className="w-8 h-8 mr-3 text-pink-600" />
                <span>Share Your Creation!</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-6 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
                disabled={loadingStates.user}
              >
                {loadingStates.user ? (
                  <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 mr-3" />
                )}
                Share Your Work
              </Button>
              <p className="text-sm text-gray-600 mt-4">
                Share publicly or privately with friends on WhatsApp
              </p>
            </CardContent>
          </Card>

          {/*{/* 🌟 PikoPal of the Week */}
        {loadingStates.pikopals ? (
          <PikopalSkeleton />
        ) : pikopals[0] ? (
          <Link href={`/pikopal/${pikopals[0].id}`} passHref>
            <Card className="mb-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-none shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-center text-2xl font-bold text-gray-800">
                  <Trophy className="w-8 h-8 mr-3 text-yellow-600" />
                  <span>🌟 Featured Creator</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center">
                  {/* Avatar Section */}
                  <div className="mb-4 animate-bounce">
                    <img
                      src={
                        pikopals[0].avatar
                          ? pikopals[0].avatar // Supabase storage public URL
                          : "/default-avatar.png" // fallback placeholder
                      }
                      alt={pikopals[0].name}
                      className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-yellow-300 shadow-md"
                      loading="lazy"
                    />
                  </div>

                  {/* Name + Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {pikopals[0].name}
                  </h3>
                  {pikopals[0].title && (
                    <p className="text-lg text-yellow-700 font-medium mb-2">
                      {pikopals[0].title}
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-gray-700 max-w-xs">
                    Our featured creator this week! Say hello to{" "}
                    <span className="font-semibold">{pikopals[0].name}</span> 👋
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : null}


          {/* Creations Grid */}
          <div className="mb-8" ref={creationsContainerRef}>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center">
              <Sparkles className="w-8 h-8 mr-3 text-pink-500" />
              Community Creations
            </h2>
            
            {loadingStates.initialLoad ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(null).map((_, i) => (
                  <CreationCardSkeleton key={`skeleton-${i}`} />
                ))}
              </div>
            ) : creations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  No Creations Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Be the first to share your amazing creation! The community is waiting to see what you'll create.
                </p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                >
                  Share Your First Creation
                </Button>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creations.map((creation) => (
                <CreationCard
                  key={creation.id}
                  creation={creation}
                  currentUser={currentUser}
                  onLike={handleLike}
                  onAddComment={handleAddComment}
                  onShare={shareCreation}
                  isLoadingComment={loadingStates.comments[creation.id] || false}
                  isLoadingLike={loadingStates.likes[creation.id] || false}
                />
              ))}

              </div>

                {/* Infinite scroll target */}
                <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
                  {loadingStates.creations && (
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  )}
                  {!hasMoreCreations && creations.length > 0 && (
                    <p className="text-gray-500 text-center"></p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Nimi Chat */}
          <Card className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-100 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3 shadow-sm border border-purple-200">
                  <span className="text-2xl">🤖</span>
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Chat with Nimi
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <NimiChat 
                messages={nimiMessages}
                isTyping={isNimiTyping}
                onSend={handleNimiSend}
                currentUser={currentUser}
                voiceEnabled={true}
              />
            </CardContent>
          </Card>
    
          {/* Coming Soon */}
          <Card className="bg-gradient-to-r from-green-100 to-emerald-100 border-none shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">More Features Coming!</h3>
              <p className="text-gray-700 mb-6">We're working on new ways to create and share together!</p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center">
                  <MessageCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span>Enhanced Comments</span>
                </div>
                <div className="flex items-center">
                  <Heart className="w-5 h-5 text-red-600 mr-2" />
                  <span>Reactions</span>
                </div>
                <div className="flex items-center">
                  <Share2 className="w-5 h-5 text-blue-600 mr-2" />
                  <span>More Sharing Options</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <BottomNavigation />
      </div>
    </ErrorBoundary>
  );
};

export default CommunityPage;