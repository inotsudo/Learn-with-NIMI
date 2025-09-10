export interface Comment {
  id: string;
  creationId: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}
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
    completionStatus?: 'draft' | 'in-progress' | 'completed';
  }
  
  export interface PikoPal {
    id: string;
    name: string;
    age: number;
    achievements: number;
    streak: number;
    avatar: string;
    title: string;
  }
  
  export interface UserMessage {
    sender: 'user' | 'nimi';
    text: string;
  }
  // types.ts
export type ShareMethod = "public" | "whatsapp";

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
}

export interface Comment {
  id: string;
  creationId: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

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
}
