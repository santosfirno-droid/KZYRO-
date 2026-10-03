import { Notification, User } from '../types';
import { StorageService } from '../services/storage';
import { formatRelativeTime } from '../utils/date';
import { Heart, MessageSquare, PlusCircle, CheckCheck, Bell, MessageCircle } from 'lucide-react';

interface NotificationsViewProps {
  currentUser: User;
  onNavigateToPost: (postId: string) => void;
  onNavigateToChat: (senderId: string) => void;
  onNotificationsUpdated: () => void;
}

export function NotificationsView({
  currentUser,
  onNavigateToPost,
  onNavigateToChat,
  onNotificationsUpdated,
}: NotificationsViewProps) {
  const notifications = StorageService.getNotifications(currentUser.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    StorageService.markNotificationsAsRead(currentUser.id);
    onNotificationsUpdated();
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      const all = StorageService.getNotifications();
      const updated = all.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
      localStorage.setItem('kzyro_community_notifications_v2', JSON.stringify(updated));
      onNotificationsUpdated();
    }

    if (notif.type === 'direct_message') {
      onNavigateToChat(notif.senderId);
    } else if (notif.postId) {
      onNavigateToPost(notif.postId);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-400 fill-blue-400/20" />;
      case 'post':
        return <PlusCircle className="w-4 h-4 text-emerald-400" />;
      case 'direct_message':
        return <MessageCircle className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActionText = (notif: Notification) => {
    switch (notif.type) {
      case 'like':
        return 'curtiu sua publicação';
      case 'comment':
        return 'comentou na sua publicação';
      case 'post':
        return 'compartilhou uma nova atualização na comunidade';
      case 'direct_message':
        return 'enviou uma mensagem privada para você';
      default:
        return 'interagiu com você';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Notificações</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Interações e mensagens direcionadas a você na KZYRO
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Marcar lidas</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#0b1222] border border-slate-800/80 rounded-2xl text-slate-400">
          <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-200">Tudo em dia!</div>
          <p className="text-xs text-slate-500 mt-1">
            Você ainda não tem nenhuma notificação pendente.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                !notif.read
                  ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/50'
                  : 'bg-[#0b1222] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Unread dot indicator */}
              {!notif.read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
              )}

              {/* Sender Avatar with type mini icon */}
              <div className="relative shrink-0 mt-0.5">
                <img
                  src={notif.senderAvatar}
                  alt={notif.senderName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-[#0b1222] rounded-full">
                  {getIcon(notif.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pr-4">
                <div className="text-xs text-slate-200 leading-snug">
                  <strong className="text-white font-semibold">{notif.senderName}</strong>{' '}
                  <span className="text-[11px] text-slate-400">({notif.senderRole})</span>{' '}
                  {getActionText(notif)}
                </div>

                {notif.snippet && (
                  <p className="text-xs text-slate-400 mt-1 italic line-clamp-1 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800/50">
                    &ldquo;{notif.snippet}&rdquo;
                  </p>
                )}

                <div className="text-[10px] text-slate-500 mt-1.5">
                  {formatRelativeTime(notif.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
