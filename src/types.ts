export type MemberRole = string;

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio: string;
  accentColor: string;
  joinedDate: string;
  supabaseUserId?: string;
  isOnline?: boolean;
  lastActiveAt?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  imageUrl?: string;
  likes: string[]; // User IDs who liked
  comments: Comment[];
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderAvatar: string;
  recipientName: string;
  recipientAvatar: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export type NotificationType = 'like' | 'comment' | 'post' | 'direct_message';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  type: NotificationType;
  postId?: string;
  snippet?: string;
  createdAt: string;
  read: boolean;
}

export type TabType = 'feed' | 'messages' | 'members' | 'notifications' | 'profile';
