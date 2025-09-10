"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import { Creation, Comment } from "./types";


interface CreationCardProps {
  creation: Creation;
  onLike: (creationId: string) => Promise<void>;
  onAddComment: (creationId: string, content: string) => Promise<boolean>;
  onShare: (creation: Creation) => void;
  currentUser: { name: string; avatar?: string };
  isLoadingComment?: boolean;
  isLoadingLike?: boolean;
}

export const CreationCard: React.FC<CreationCardProps> = ({
  creation,
  onLike,
  onAddComment,
  onShare,
  currentUser,
  isLoadingComment = false,
  isLoadingLike = false
}) => {
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [localComments, setLocalComments] = useState(creation.comments || []);

  const handleLikeClick = async () => {
    try {
      setIsLiking(true);
      await onLike(creation.id);
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = useCallback(async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
  
    const sanitizedContent = DOMPurify.sanitize(trimmed);
    if (!sanitizedContent) return;
  
    const tempId = `temp-${Date.now()}`;
  
    // Match Comment type exactly
    const tempComment: Comment = {
      id: tempId,
      creationId: creation.id, // required
      author: currentUser.name || "Guest",
      authorAvatar: currentUser.avatar || "",
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
    };
  
    // Optimistic update
    setLocalComments((prev) => [...prev, tempComment]);
    setComment("");
    setIsCommenting(true);
  
    console.log("[DEBUG] Sending to handleAddComment:", sanitizedContent);
  
    try {
      const saved = await onAddComment(creation.id, sanitizedContent);
  
      if (!saved) {
        setLocalComments((prev) => prev.filter((c) => c.id !== tempId));
      }
    } catch (err) {
      console.error("Comment error:", err);
      setLocalComments((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setIsCommenting(false);
    }
  }, [comment, creation.id, currentUser, onAddComment]);
  
  return (
    <div className="overflow-hidden hover:shadow-lg transition-shadow relative bg-white rounded-lg border">
      {/* Image */}
      <div className="relative aspect-square">
        <img
          src={creation.imageUrl}
          alt={`Art by ${creation.childName}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">{creation.childName} ({creation.age})</h3>
          <div className="text-xs text-gray-500">{new Date(creation.createdAt).toLocaleDateString()}</div>
        </div>

        {creation.description && (
          <p className="text-sm text-gray-600 mb-3">{creation.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex justify-around border-t pt-3">
          <Button
            variant="ghost"
            className="flex items-center gap-1"
            onClick={handleLikeClick}
            disabled={isLoadingLike || isLiking}
          >
            {isLoadingLike || isLiking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart
                className="w-5 h-5"
                fill={creation.likedByUser ? "currentColor" : "none"}
                color={creation.likedByUser ? "#ec4899" : "currentColor"}
              />
            )}
            <span>{creation.likes}</span>
          </Button>

          <Button
            variant="ghost"
            className="flex items-center gap-1"
            onClick={() => setShowComments(!showComments)}
            disabled={isLoadingComment || isCommenting}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{localComments.length}</span>
          </Button>

          <Button variant="ghost" onClick={() => onShare(creation)}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {localComments.length > 0 ? (
              localComments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                    {c.author?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
                    <div className="font-medium text-xs">{c.author || 'Guest'}</div>
                    <div className="text-sm">{c.content}</div>
                    {c.createdAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      )}

                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-2">No comments yet</div>
            )}

            <div className="flex gap-2 mt-2 sticky bottom-0 bg-white pt-2">
              <Input
                placeholder="Add a comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={e => e.key === "Enter" && handleCommentSubmit()}
                disabled={isCommenting || isLoadingComment}
              />
              <Button
                onClick={handleCommentSubmit}
                disabled={!comment.trim() || isCommenting || isLoadingComment}
                size="sm"
              >
                {isCommenting || isLoadingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

CreationCard.displayName = "CreationCard";
