import { User, Post, Comment, Notification, DirectMessage } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  MEMBERS: 'kzyro_community_members_v3',
  POSTS: 'kzyro_community_posts_v3',
  NOTIFICATIONS: 'kzyro_community_notifications_v3',
  CURRENT_USER_ID: 'kzyro_community_current_user_v3',
  DIRECT_MESSAGES: 'kzyro_community_direct_messages_v3',
};

const notifySubscribers = () => {
  window.dispatchEvent(new Event('kzyro_storage_change'));
};

export const StorageService = {
  getMembers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getMemberById(id: string): User | undefined {
    return this.getMembers().find((m) => m.id === id);
  },

  getMemberByEmail(email: string): User | undefined {
    return this.getMembers().find(
      (m) => m.email.toLowerCase() === email.trim().toLowerCase()
    );
  },

  registerUser(user: User): void {
    const members = this.getMembers();
    const existingIndex = members.findIndex(
      (m) => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase()
    );

    let updated: User[];
    if (existingIndex >= 0) {
      updated = [...members];
      updated[existingIndex] = { ...members[existingIndex], ...user };
    } else {
      updated = [...members, user];
    }

    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    notifySubscribers();
  },

  updateUserProfile(
    userId: string,
    updates: { name?: string; role?: string; avatar?: string; bio?: string }
  ): User | null {
    const members = this.getMembers();
    let updatedUser: User | null = null;

    const newMembers = members.map((m) => {
      if (m.id === userId) {
        updatedUser = {
          ...m,
          name: updates.name !== undefined ? updates.name.trim() || m.name : m.name,
          role: updates.role !== undefined ? updates.role.trim() || m.role : m.role,
          avatar: updates.avatar !== undefined ? updates.avatar.trim() || m.avatar : m.avatar,
          bio: updates.bio !== undefined ? updates.bio.trim() : m.bio,
        };
        return updatedUser;
      }
      return m;
    });

    if (!updatedUser) return null;

    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(newMembers));

    // Propagate updated name and avatar across all posts and comments
    const posts = this.getPosts();
    const updatedPosts = posts.map((p) => {
      let postChanged = false;
      let newAuthorName = p.authorName;
      let newAuthorAvatar = p.authorAvatar;
      let newAuthorRole = p.authorRole;

      if (p.authorId === userId) {
        if (updates.name) newAuthorName = updates.name.trim();
        if (updates.avatar) newAuthorAvatar = updates.avatar.trim();
        if (updates.role) newAuthorRole = updates.role.trim();
        postChanged = true;
      }

      const updatedComments = p.comments.map((c) => {
        if (c.authorId === userId) {
          postChanged = true;
          return {
            ...c,
            authorName: updates.name ? updates.name.trim() : c.authorName,
            authorAvatar: updates.avatar ? updates.avatar.trim() : c.authorAvatar,
            authorRole: updates.role ? updates.role.trim() : c.authorRole,
          };
        }
        return c;
      });

      if (postChanged) {
        return {
          ...p,
          authorName: newAuthorName,
          authorAvatar: newAuthorAvatar,
          authorRole: newAuthorRole,
          comments: updatedComments,
        };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    // Propagate updated name and avatar across direct messages
    const messages = this.getAllDirectMessages();
    const updatedMessages = messages.map((msg) => {
      let changed = false;
      let sName = msg.senderName;
      let sAvatar = msg.senderAvatar;
      let rName = msg.recipientName;
      let rAvatar = msg.recipientAvatar;

      if (msg.senderId === userId) {
        if (updates.name) sName = updates.name.trim();
        if (updates.avatar) sAvatar = updates.avatar.trim();
        changed = true;
      }
      if (msg.recipientId === userId) {
        if (updates.name) rName = updates.name.trim();
        if (updates.avatar) rAvatar = updates.avatar.trim();
        changed = true;
      }

      if (changed) {
        return {
          ...msg,
          senderName: sName,
          senderAvatar: sAvatar,
          recipientName: rName,
          recipientAvatar: rAvatar,
        };
      }
      return msg;
    });

    localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(updatedMessages));

    // Sync to Supabase profiles table in background
    if (updatedUser) {
      const u = updatedUser as User;
      supabase.auth.getUser().then(({ data: authUser }) => {
        if (authUser?.user) {
          supabase
            .from('profiles')
            .update({
              name: u.name,
              avatar_url: u.avatar,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authUser.user.id)
            .then(() => {});
        }
      });
    }

    notifySubscribers();
    return updatedUser;
  },

  getCurrentUser(): User | null {
    const members = this.getMembers();
    const storedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (storedId) {
      const found = members.find((m) => m.id === storedId);
      if (found) return found;
    }
    return null;
  },

  setCurrentUser(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    notifySubscribers();
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    supabase.auth.signOut().catch(() => {});
    notifySubscribers();
  },

  /* ---------------- POSTS (Zeroed Out by Default) ---------------- */

  getPosts(): Post[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  createPost(content: string, imageUrl?: string): Post | null {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      content: content.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    const currentPosts = this.getPosts();
    const updatedPosts = [newPost, ...currentPosts];
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    // Send notifications to all other registered members
    const allMembers = this.getMembers();
    const otherMembers = allMembers.filter((m) => m.id !== currentUser.id);
    const notifications = this.getNotifications();

    const newNotifications: Notification[] = otherMembers.map((member) => ({
      id: `notif_${Date.now()}_${member.id}`,
      recipientId: member.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: currentUser.role,
      type: 'post',
      postId: newPost.id,
      snippet: newPost.content.slice(0, 50) + (newPost.content.length > 50 ? '...' : ''),
      createdAt: new Date().toISOString(),
      read: false,
    }));

    localStorage.setItem(
      STORAGE_KEYS.NOTIFICATIONS,
      JSON.stringify([...newNotifications, ...notifications])
    );

    notifySubscribers();
    return newPost;
  },

  deletePost(postId: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const posts = this.getPosts();
    const beforeCount = posts.length;
    const updated = posts.filter(
      (p) => !(p.id === postId && p.authorId === currentUser.id)
    );

    if (updated.length !== beforeCount) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      notifySubscribers();
      return true;
    }
    return false;
  },

  deleteComment(postId: string, commentId: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const posts = this.getPosts();
    let deleted = false;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        const remaining = p.comments.filter(
          (c) => !(c.id === commentId && c.authorId === currentUser.id)
        );
        if (remaining.length !== p.comments.length) {
          deleted = true;
          return { ...p, comments: remaining };
        }
      }
      return p;
    });

    if (deleted) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
      notifySubscribers();
      return true;
    }
    return false;
  },

  toggleLike(postId: string): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const posts = this.getPosts();
    let isLikedNow = false;
    let postTarget: Post | undefined;

    const updated = posts.map((post) => {
      if (post.id === postId) {
        postTarget = post;
        const hasLiked = post.likes.includes(currentUser.id);
        isLikedNow = !hasLiked;
        const newLikes = hasLiked
          ? post.likes.filter((id) => id !== currentUser.id)
          : [...post.likes, currentUser.id];
        return { ...post, likes: newLikes };
      }
      return post;
    });

    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

    if (isLikedNow && postTarget && postTarget.authorId !== currentUser.id) {
      const notifications = this.getNotifications();
      const newNotif: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: postTarget.authorId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        senderRole: currentUser.role,
        type: 'like',
        postId: postTarget.id,
        snippet: postTarget.content.slice(0, 50) + (postTarget.content.length > 50 ? '...' : ''),
        createdAt: new Date().toISOString(),
        read: false,
      };
      localStorage.setItem(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify([newNotif, ...notifications])
      );
    }

    notifySubscribers();
  },

  addComment(postId: string, content: string): Comment | null {
    if (!content.trim()) return null;
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    const posts = this.getPosts();
    let newComment: Comment | null = null;
    let targetPost: Post | undefined;

    const updated = posts.map((post) => {
      if (post.id === postId) {
        targetPost = post;
        newComment = {
          id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          postId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          authorAvatar: currentUser.avatar,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        };
        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      }
      return post;
    });

    if (newComment) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

      if (targetPost && targetPost.authorId !== currentUser.id) {
        const notifications = this.getNotifications();
        const newNotif: Notification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientId: targetPost.authorId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          senderRole: currentUser.role,
          type: 'comment',
          postId: targetPost.id,
          snippet: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          createdAt: new Date().toISOString(),
          read: false,
        };
        localStorage.setItem(
          STORAGE_KEYS.NOTIFICATIONS,
          JSON.stringify([newNotif, ...notifications])
        );
      }

      notifySubscribers();
    }

    return newComment;
  },

  /* ---------------- DIRECT MESSAGES (ACCOUNT SEPARATION) ---------------- */

  getAllDirectMessages(): DirectMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DIRECT_MESSAGES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getDirectMessagesForUser(currentUserId: string): DirectMessage[] {
    const all = this.getAllDirectMessages();
    return all.filter((m) => m.senderId === currentUserId || m.recipientId === currentUserId);
  },

  getConversation(userAId: string, userBId: string): DirectMessage[] {
    const userMessages = this.getDirectMessagesForUser(userAId);
    return userMessages
      .filter(
        (m) =>
          (m.senderId === userAId && m.recipientId === userBId) ||
          (m.senderId === userBId && m.recipientId === userAId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  sendDirectMessage(params: {
    senderId: string;
    recipientId: string;
    content: string;
    imageUrl?: string;
  }): DirectMessage | null {
    if (!params.content.trim() && !params.imageUrl) return null;

    const sender = this.getMemberById(params.senderId);
    const recipient = this.getMemberById(params.recipientId);
    if (!sender || !recipient) return null;

    const newMessage: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      recipientId: recipient.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      recipientName: recipient.name,
      recipientAvatar: recipient.avatar,
      content: params.content.trim(),
      imageUrl: params.imageUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const allMessages = this.getAllDirectMessages();
    const updated = [...allMessages, newMessage];
    localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(updated));

    // Create notification for recipient
    const notifications = this.getNotifications(recipient.id);
    const notif: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientId: recipient.id,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      senderRole: sender.role,
      type: 'direct_message',
      snippet: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const allNotifsRaw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    let allNotifs: Notification[] = [];
    try {
      allNotifs = allNotifsRaw ? JSON.parse(allNotifsRaw) : [];
    } catch {
      allNotifs = [];
    }
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([notif, ...allNotifs]));

    notifySubscribers();
    return newMessage;
  },

  markConversationAsRead(currentUserId: string, partnerId: string): void {
    const all = this.getAllDirectMessages();
    let changed = false;

    const updated = all.map((m) => {
      if (m.recipientId === currentUserId && m.senderId === partnerId && !m.read) {
        changed = true;
        return { ...m, read: true };
      }
      return m;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(updated));
      notifySubscribers();
    }
  },

  deleteDirectMessage(messageId: string, currentUserId: string): boolean {
    const all = this.getAllDirectMessages();
    const filtered = all.filter(
      (m) => !(m.id === messageId && m.senderId === currentUserId)
    );
    if (filtered.length !== all.length) {
      localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(filtered));
      notifySubscribers();
      return true;
    }
    return false;
  },

  getUnreadDirectMessagesCount(currentUserId: string): number {
    const userMessages = this.getDirectMessagesForUser(currentUserId);
    return userMessages.filter((m) => m.recipientId === currentUserId && !m.read).length;
  },

  /* ---------------- NOTIFICATIONS ---------------- */

  getNotifications(userId?: string): Notification[] {
    const current = this.getCurrentUser();
    const targetUserId = userId || (current ? current.id : '');
    if (!targetUserId) return [];

    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    let all: Notification[] = [];
    if (!raw) return [];
    try {
      all = JSON.parse(raw);
    } catch {
      return [];
    }
    return all.filter((n) => n.recipientId === targetUserId);
  },

  markNotificationsAsRead(userId?: string): void {
    const current = this.getCurrentUser();
    const targetUserId = userId || (current ? current.id : '');
    if (!targetUserId) return;

    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) return;
    try {
      const all: Notification[] = JSON.parse(raw);
      const updated = all.map((n) => (n.recipientId === targetUserId ? { ...n, read: true } : n));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      notifySubscribers();
    } catch {
      // noop
    }
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.POSTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.DIRECT_MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    notifySubscribers();
  },
};
