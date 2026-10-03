import { supabase } from './supabase';
import { Post, DirectMessage, User } from '../types';

export type RealtimeEventHandler = {
  onNewPost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onPostLike?: (payload: { postId: string; likes: string[] }) => void;
  onNewComment?: (payload: { postId: string; comment: any }) => void;
  onDirectMessage?: (msg: DirectMessage) => void;
  onPresenceUpdate?: (onlineUserIds: Set<string>, userProfiles: Record<string, Partial<User>>) => void;
};

class RealtimeCommunityService {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private handlers: RealtimeEventHandler[] = [];
  private currentUser: User | null = null;
  private onlineUserIds = new Set<string>();
  private userProfiles: Record<string, Partial<User>> = {};

  public init(user: User) {
    this.currentUser = user;

    if (this.channel) {
      this.channel.unsubscribe();
    }

    const channelName = 'kzyro_community_network';
    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
        broadcast: { ack: true },
      },
    });

    // 1. Presence tracking (Who is online / offline)
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel?.presenceState() || {};
      const newOnlineSet = new Set<string>();
      const newProfiles: Record<string, Partial<User>> = {};

      for (const [userId, presences] of Object.entries(state)) {
        if (Array.isArray(presences) && presences.length > 0) {
          newOnlineSet.add(userId);
          const p = presences[0] as any;
          if (p && p.name) {
            newProfiles[userId] = {
              id: userId,
              name: p.name,
              role: p.role,
              avatar: p.avatar,
              email: p.email,
              isOnline: true,
              lastActiveAt: Date.now(),
            };
          }
        }
      }

      this.onlineUserIds = newOnlineSet;
      this.userProfiles = { ...this.userProfiles, ...newProfiles };

      this.handlers.forEach((h) => h.onPresenceUpdate?.(this.onlineUserIds, this.userProfiles));
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.onlineUserIds.add(key);
      if (Array.isArray(newPresences) && newPresences.length > 0) {
        const p = newPresences[0] as any;
        if (p && p.name) {
          this.userProfiles[key] = {
            id: key,
            name: p.name,
            role: p.role,
            avatar: p.avatar,
            email: p.email,
            isOnline: true,
            lastActiveAt: Date.now(),
          };
        }
      }
      this.handlers.forEach((h) => h.onPresenceUpdate?.(this.onlineUserIds, this.userProfiles));
    });

    this.channel.on('presence', { event: 'leave' }, ({ key }) => {
      this.onlineUserIds.delete(key);
      if (this.userProfiles[key]) {
        this.userProfiles[key].isOnline = false;
        this.userProfiles[key].lastActiveAt = Date.now();
      }
      this.handlers.forEach((h) => h.onPresenceUpdate?.(this.onlineUserIds, this.userProfiles));
    });

    // 2. Broadcast events (New posts, likes, comments, private messages)
    this.channel.on('broadcast', { event: 'new_post' }, ({ payload }) => {
      if (payload && payload.post) {
        this.handlers.forEach((h) => h.onNewPost?.(payload.post));
      }
    });

    this.channel.on('broadcast', { event: 'delete_post' }, ({ payload }) => {
      if (payload && payload.postId) {
        this.handlers.forEach((h) => h.onDeletePost?.(payload.postId));
      }
    });

    this.channel.on('broadcast', { event: 'toggle_like' }, ({ payload }) => {
      if (payload && payload.postId) {
        this.handlers.forEach((h) => h.onPostLike?.(payload));
      }
    });

    this.channel.on('broadcast', { event: 'new_comment' }, ({ payload }) => {
      if (payload && payload.postId && payload.comment) {
        this.handlers.forEach((h) => h.onNewComment?.(payload));
      }
    });

    this.channel.on('broadcast', { event: 'direct_message' }, ({ payload }) => {
      if (payload && payload.message) {
        const msg = payload.message as DirectMessage;
        // Strictly only deliver if current user is the recipient or sender
        if (this.currentUser && (msg.recipientId === this.currentUser.id || msg.senderId === this.currentUser.id)) {
          this.handlers.forEach((h) => h.onDirectMessage?.(msg));
        }
      }
    });

    // Subscribe and track presence
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await this.channel?.track({
            id: user.id,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            email: user.email,
            onlineAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Realtime presence tracking notice:', err);
        }
      }
    });
  }

  public subscribeEvents(handler: RealtimeEventHandler) {
    this.handlers.push(handler);
    // Trigger initial presence state immediately
    if (this.onlineUserIds.size > 0) {
      handler.onPresenceUpdate?.(this.onlineUserIds, this.userProfiles);
    }
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  public broadcastPost(post: Post) {
    this.channel?.send({
      type: 'broadcast',
      event: 'new_post',
      payload: { post },
    }).catch(() => {});
  }

  public broadcastDeletePost(postId: string) {
    this.channel?.send({
      type: 'broadcast',
      event: 'delete_post',
      payload: { postId },
    }).catch(() => {});
  }

  public broadcastLike(postId: string, likes: string[]) {
    this.channel?.send({
      type: 'broadcast',
      event: 'toggle_like',
      payload: { postId, likes },
    }).catch(() => {});
  }

  public broadcastComment(postId: string, comment: any) {
    this.channel?.send({
      type: 'broadcast',
      event: 'new_comment',
      payload: { postId, comment },
    }).catch(() => {});
  }

  public broadcastDirectMessage(message: DirectMessage) {
    this.channel?.send({
      type: 'broadcast',
      event: 'direct_message',
      payload: { message },
    }).catch(() => {});
  }

  public getOnlineUserIds(): Set<string> {
    return this.onlineUserIds;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUserIds.has(userId);
  }

  public destroy() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.handlers = [];
  }
}

export const realtimeService = new RealtimeCommunityService();
