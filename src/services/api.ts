import { User, Post, Comment, DirectMessage, Notification } from '../types';
import { StorageService } from './storage';
import { realtimeService } from './realtime';

const BACKEND_URL =
  typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')
    ? 'https://ais-pre-b2izp7httvsypnolvsfk55-524258665175.us-east1.run.app'
    : '';

export const ApiService = {
  // Presence Heartbeat
  async sendHeartbeat(userId: string): Promise<void> {
    try {
      if (BACKEND_URL || !window.location.hostname.includes('netlify.app')) {
        await fetch(`${BACKEND_URL}/api/users/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).catch(() => {});
      }
    } catch {
      // noop
    }
  },

  // Users & Search (Combines Local, Supabase Presence, and Backend)
  async searchUsers(query: string = ''): Promise<User[]> {
    let localMembers = StorageService.getMembers();

    // Try fetching from backend to see other devices' members
    try {
      const url = query
        ? `${BACKEND_URL}/api/users?q=${encodeURIComponent(query)}`
        : `${BACKEND_URL}/api/users`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const remoteUsers: User[] = await res.json();
        for (const ru of remoteUsers) {
          const idx = localMembers.findIndex(
            (lm) => lm.id === ru.id || lm.email.toLowerCase() === ru.email.toLowerCase()
          );
          if (idx >= 0) {
            localMembers[idx] = { ...localMembers[idx], ...ru };
          } else {
            localMembers.push(ru);
          }
        }
        localStorage.setItem('kzyro_community_members_v3', JSON.stringify(localMembers));
      }
    } catch {
      // noop
    }

    // Attach real-time presence from Supabase
    const q = query.trim().toLowerCase();
    const result = localMembers.map((u) => ({
      ...u,
      isOnline: realtimeService.isUserOnline(u.id) || Boolean(u.isOnline),
    }));

    if (q) {
      return result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    return result;
  },

  async getUser(id: string): Promise<User | null> {
    const local = StorageService.getMemberById(id);
    if (local) {
      return { ...local, isOnline: realtimeService.isUserOnline(local.id) };
    }
    return null;
  },

  async register(params: {
    name: string;
    role: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    const cleanEmail = params.email.trim().toLowerCase();

    // Create user object
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: params.name.trim(),
      role: params.role.trim() || 'Equipe KZYRO',
      email: cleanEmail,
      avatar:
        params.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
      bio: 'Membro da equipe KZYRO.',
      accentColor: '#38bdf8',
      joinedDate: 'Hoje',
      isOnline: true,
      lastActiveAt: Date.now(),
    };

    // Save locally
    StorageService.registerUser(newUser);

    // Sync to backend if available
    try {
      fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }).catch(() => {});
    } catch {
      // noop
    }

    return { user: newUser, error: null };
  },

  async login(
    email: string,
    pass: string
  ): Promise<{ user: User | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();

    // Check local members
    const local = StorageService.getMemberByEmail(cleanEmail);
    if (local) {
      StorageService.setCurrentUser(local.id);
      return { user: { ...local, isOnline: true }, error: null };
    }

    // Try backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        StorageService.registerUser(data);
        return { user: data, error: null };
      }
    } catch {
      // noop
    }

    // Create temporary session if member doesn't exist
    const fallbackUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: cleanEmail.split('@')[0],
      role: 'Equipe KZYRO',
      email: cleanEmail,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
      bio: 'Membro da equipe KZYRO.',
      accentColor: '#38bdf8',
      joinedDate: 'Hoje',
      isOnline: true,
    };
    StorageService.registerUser(fallbackUser);
    return { user: fallbackUser, error: null };
  },

  async updateProfile(
    userId: string,
    updates: { name?: string; role?: string; avatar?: string; bio?: string }
  ): Promise<User | null> {
    const updated = StorageService.updateUserProfile(userId, updates);

    // Try backend
    try {
      fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(() => {});
    } catch {
      // noop
    }

    return updated;
  },

  // Posts (Unified Feed for all members)
  async getPosts(): Promise<Post[]> {
    let localPosts = StorageService.getPosts();

    // Try remote fetch and merge
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts`).catch(() => null);
      if (res && res.ok) {
        const remotePosts: Post[] = await res.json();
        // Merge without duplicates
        const map = new Map<string, Post>();
        remotePosts.forEach((p) => map.set(p.id, p));
        localPosts.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem('kzyro_community_posts_v3', JSON.stringify(merged));
        return merged;
      }
    } catch {
      // noop
    }

    return localPosts;
  },

  async createPost(params: {
    authorId: string;
    authorName: string;
    authorRole: string;
    authorAvatar: string;
    authorEmail?: string;
    content: string;
    imageUrl?: string;
  }): Promise<Post> {
    // 1. Immediately create post in local storage
    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      authorAvatar: params.authorAvatar,
      content: params.content.trim(),
      imageUrl: params.imageUrl?.trim() || undefined,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    const currentPosts = StorageService.getPosts();
    const updated = [newPost, ...currentPosts];
    localStorage.setItem('kzyro_community_posts_v3', JSON.stringify(updated));

    // 2. Broadcast immediately over Supabase Realtime to all other devices!
    realtimeService.broadcastPost(newPost);

    // 3. Try saving to backend server if reachable
    try {
      fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }).catch(() => {});
    } catch {
      // noop
    }

    // Trigger local storage event
    window.dispatchEvent(new Event('kzyro_storage_change'));

    return newPost;
  },

  async deletePost(postId: string, userId: string): Promise<boolean> {
    StorageService.deletePost(postId);
    realtimeService.broadcastDeletePost(postId);

    try {
      fetch(`${BACKEND_URL}/api/posts/${postId}?userId=${userId}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
    return true;
  },

  async toggleLike(postId: string, userId: string): Promise<string[] | null> {
    StorageService.toggleLike(postId);
    const posts = StorageService.getPosts();
    const p = posts.find((x) => x.id === postId);
    const likes = p ? p.likes : [];

    realtimeService.broadcastLike(postId, likes);

    try {
      fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
    return likes;
  },

  async addComment(params: {
    postId: string;
    authorId: string;
    authorName?: string;
    authorRole?: string;
    authorAvatar?: string;
    content: string;
  }): Promise<Comment | null> {
    const comment = StorageService.addComment(params.postId, params.content);

    if (comment) {
      realtimeService.broadcastComment(params.postId, comment);

      try {
        fetch(`${BACKEND_URL}/api/posts/${params.postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }).catch(() => {});
      } catch {
        // noop
      }

      window.dispatchEvent(new Event('kzyro_storage_change'));
    }

    return comment;
  },

  async deleteComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<boolean> {
    StorageService.deleteComment(postId, commentId);

    try {
      fetch(`${BACKEND_URL}/api/posts/${postId}/comments/${commentId}?userId=${userId}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
    return true;
  },

  // Private Messages (Strict Account Separation)
  async getMessages(userId: string): Promise<DirectMessage[]> {
    let localMsgs = StorageService.getDirectMessagesForUser(userId);

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages?userId=${userId}`).catch(() => null);
      if (res && res.ok) {
        const remoteMsgs: DirectMessage[] = await res.json();
        const map = new Map<string, DirectMessage>();
        remoteMsgs.forEach((m) => map.set(m.id, m));
        localMsgs.forEach((m) => {
          if (!map.has(m.id)) map.set(m.id, m);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        localStorage.setItem('kzyro_community_direct_messages_v3', JSON.stringify(merged));
        return merged;
      }
    } catch {
      // noop
    }

    return localMsgs;
  },

  async sendMessage(params: {
    senderId: string;
    recipientId: string;
    senderName?: string;
    senderAvatar?: string;
    recipientName?: string;
    recipientAvatar?: string;
    content: string;
    imageUrl?: string;
  }): Promise<DirectMessage | null> {
    // 1. Save locally
    const newMsg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: params.senderId,
      recipientId: params.recipientId,
      senderName: params.senderName || 'Membro',
      senderAvatar: params.senderAvatar || '',
      recipientName: params.recipientName || 'Membro',
      recipientAvatar: params.recipientAvatar || '',
      content: params.content.trim(),
      imageUrl: params.imageUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const all = StorageService.getAllDirectMessages();
    const updated = [...all, newMsg];
    localStorage.setItem('kzyro_community_direct_messages_v3', JSON.stringify(updated));

    // 2. Broadcast via Supabase Realtime to recipient device!
    realtimeService.broadcastDirectMessage(newMsg);

    // 3. Sync to backend if available
    try {
      fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
    return newMsg;
  },

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    StorageService.deleteDirectMessage(messageId, userId);

    try {
      fetch(`${BACKEND_URL}/api/messages/${messageId}?userId=${userId}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
    return true;
  },

  async markMessagesRead(userId: string, partnerId: string): Promise<void> {
    StorageService.markConversationAsRead(userId, partnerId);

    try {
      fetch(`${BACKEND_URL}/api/messages/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, partnerId }),
      }).catch(() => {});
    } catch {
      // noop
    }

    window.dispatchEvent(new Event('kzyro_storage_change'));
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return StorageService.getNotifications(userId);
  },

  async markNotificationsRead(userId: string): Promise<void> {
    StorageService.markNotificationsAsRead(userId);
  },
};
