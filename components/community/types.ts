export type ShareMethod = "public" | "whatsapp";

export type CreationType = "art" | "coloring" | "story";

export interface UploadFormState {
  childName: string;
  age: string;
  description: string;
  isPublic: boolean;
  imageFile: File | null;
  previewUrl: string;
  uploadProgress: number;
  isUploading: boolean;
  shareMethod: ShareMethod;
  creationType: CreationType;
}

export interface Comment {
  id: string;
  creationId: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export type ModerationStatus = "pending" | "approved" | "rejected";

export interface Creation {
  id: string;
  childName: string;
  age: number;
  imageUrl: string;
  likes: number;
  type: string;
  isPublic: boolean;
  createdAt: string;
  description?: string;
  comments?: Comment[];
  likedByUser?: boolean;
  completionStatus?: "draft" | "in-progress" | "completed";
  status?: ModerationStatus;
}
