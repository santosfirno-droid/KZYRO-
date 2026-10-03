import { User, Post, Comment, DirectMessage, Notification } from '../types';

export const ApiService = {
  // Presence Heartbeat
  async sendHeartbeat(userId: string): Promise<void> {
    try {
      await fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // noop
    }
  },

  // Users & Search
  async searchUsers(query: string = ''): Promise<User[]> {
    try {
      const url = query ? `/api/users?q=${encodeURIComponent(query)}` : '/api/users';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      return await res.json();
    } catch (err) {
      console.warn('API searchUsers notice:', err);
      return [];
    }
  },

  async getUser(id: string): Promise<User | null> {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async register(params: {
    name: string;
    role: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return { user: null, error: data.error || 'Erro ao registrar usuário' };
      }
      return { user: data, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão com o servidor';
      return { user: null, error: msg };
    }
  },

  async login(
    email: string,
    pass: string
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { user: null, error: data.error || 'Credenciais inválidas' };
      }
      return { user: data, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar ao servidor';
      return { user: null, error: msg };
    }
  },

  async updateProfile(
    userId: string,
    updates: { name?: string; role?: string; avatar?: string; bio?: string; email?: string }
  ): Promise<User | null> {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Posts (Unified Feed for all members)
  async getPosts(): Promise<Post[]> {
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) throw new Error('Falha ao carregar publicações');
      return await res.json();
    } catch (err) {
      console.warn('API getPosts notice:', err);
      return [];
    }
  },

  async createPost(params: {
    authorId: string;
    authorName: string;
    authorRole: string;
    authorAvatar: string;
    authorEmail?: string;
    content: string;
    imageUrl?: string;
  }): Promise<Post | null> {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao publicar no servidor.');
      }
      return await res.json();
    } catch (err) {
      console.error('API createPost error:', err);
      throw err;
    }
  },

  async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/posts/${postId}?userId=${userId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async toggleLike(postId: string, userId: string): Promise<string[] | null> {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.likes;
    } catch {
      return null;
    }
  },

  async addComment(params: {
    postId: string;
    authorId: string;
    authorName?: string;
    authorRole?: string;
    authorAvatar?: string;
    content: string;
  }): Promise<Comment | null> {
    try {
      const res = await fetch(`/api/posts/${params.postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}?userId=${userId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Private Messages (Strict Account Separation)
  async getMessages(userId: string): Promise<DirectMessage[]> {
    try {
      const res = await fetch(`/api/messages?userId=${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
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
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/messages/${messageId}?userId=${userId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async markMessagesRead(userId: string, partnerId: string): Promise<void> {
    try {
      await fetch('/api/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, partnerId }),
      });
    } catch {
      // noop
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async markNotificationsRead(userId: string): Promise<void> {
    try {
      await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // noop
    }
  },
};
