"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";

type CommentType = {
  id: number;
  creationId: number;
  author: string;
  content: string;
  createdAt?: string;
};

type Creation = {
  id: number;
  image: string;
  childName: string;
  age: number;
  mission: string;
  emoji: string;
  likes: number;
  comments?: CommentType[];
  isPublic: boolean;
  creation: string;
  type: string;
};

type CreationCardProps = {
  creation: Creation;
  onLike: (id: number) => void;
  onComment: (id: number, comment: string) => void;
  onClick?: (creation: Creation) => void;
};

export default function CreationCard({
  creation,
  onLike,
  onComment,
  onClick,
}: CreationCardProps) {
  const m = useThemeMotion();
  const [commentInput, setCommentInput] = useState("");
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: creation.mission,
          text: `${creation.childName}'s creation`,
          url: window.location.href,
        });
      } else {
        alert("Web Share API not supported");
      }
    } catch (error) {
      console.error("Sharing failed", error);
    }
  };

  const handleLike = async () => {
    if (likeAnimating) return;
    setLikeAnimating(true);
    onLike(creation.id);
    setTimeout(() => setLikeAnimating(false), 800);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={() => onClick?.(creation)}
      className={`bg-white border border-ds-border shadow-ds-card hover:shadow-lg ${m.transitionSlow} hover:scale-[1.02] overflow-hidden leaf-lg cursor-pointer`}
    >
      <div className="relative h-48 w-full">
        <img
          src={creation.image}
          alt={`Artwork by ${creation.childName}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
          }}
        />
        <div className="absolute top-2 right-2 flex items-center space-x-2">
          <div className="text-3xl select-none">{creation.emoji}</div>
          <Badge variant={creation.isPublic ? "default" : "secondary"} className="flex items-center">
            {creation.isPublic ? (
              <>
                <Globe className="w-3 h-3 mr-1" />
                Public
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" />
                Private
              </>
            )}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2">
          <Badge className="bg-white text-gray-800 font-semibold border border-ds-border">
            {creation.type}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-lg">{creation.creation}</h3>
        <p className="text-sm text-muted-foreground">
          {creation.childName}, {creation.age} yrs
        </p>
        <p className="text-xs text-gray-500">from {creation.mission}</p>

        <div className="flex gap-2 pt-2">
          <motion.button
            whileTap={{ scale: 1.3 }}
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)]"
          >
            <motion.span
              animate={likeAnimating ? {
                scale: [1, 1.4, 1],
                rotate: [0, 15, -15, 0],
                transition: { duration: 0.6 },
              } : {}}
              className="flex items-center space-x-1"
            >
              <Heart className="w-4 h-4" />
              <span>{creation.likes}</span>
            </motion.span>
          </motion.button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (commentInput.trim()) {
                onComment(creation.id, commentInput.trim());
                setCommentInput("");
              }
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {creation.comments?.length || 0}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="pt-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border rounded-md text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && commentInput.trim()) {
                onComment(creation.id, commentInput.trim());
                setCommentInput("");
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {creation.comments?.length ? (
          <div className="space-y-1 pt-2">
            {creation.comments.map((comment) => (
              <p key={comment.id} className="text-sm text-muted-foreground">
                {comment.author}: {comment.content}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </motion.div>
  );
}