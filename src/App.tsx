import { useState, useEffect } from 'react';
import { User, TabType } from './types';
import { StorageService } from './services/storage';
import { ApiService } from './services/api';
import { realtimeService } from './services/realtime';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FeedView } from './components/FeedView';
import { MessagesView } from './components/MessagesView';
import { MembersView } from './components/MembersView';
import { ProfileView } from './components/ProfileView';
import { NotificationsView } from './components/NotificationsView';
import { CreatePostModal } from './components/CreatePostModal';
import { ImageLightbox } from './components/ImageLightbox';
import { LoginView } from './components/LoginView';
import { SidebarWidget } from './components/SidebarWidget';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return StorageService.getCurrentUser();
  });

  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [selectedProfileMemberId, setSelectedProfileMemberId] = useState<string | null>(null);
  const [selectedChatPartnerId, setSelectedChatPartnerId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Initialize Realtime Supabase presence and live event sync
  useEffect(() => {
    if (!currentUser) return;

    realtimeService.init(currentUser);

    const unsubscribe = realtimeService.subscribeEvents({
      onNewPost: (newPost) => {
        const posts = StorageService.getPosts();
        if (!posts.some((p) => p.id === newPost.id)) {
          localStorage.setItem(
            'kzyro_community_posts_v3',
            JSON.stringify([newPost, ...posts])
          );
          setVersion((v) => v + 1);
        }
      },
      onDeletePost: (postId) => {
        StorageService.deletePost(postId);
        setVersion((v) => v + 1);
      },
      onPostLike: ({ postId, likes }) => {
        const posts = StorageService.getPosts();
        const updated = posts.map((p) => (p.id === postId ? { ...p, likes } : p));
        localStorage.setItem('kzyro_community_posts_v3', JSON.stringify(updated));
        setVersion((v) => v + 1);
      },
      onNewComment: ({ postId, comment }) => {
        const posts = StorageService.getPosts();
        const updated = posts.map((p) => {
          if (p.id === postId && !p.comments.some((c) => c.id === comment.id)) {
            return { ...p, comments: [...p.comments, comment] };
          }
          return p;
        });
        localStorage.setItem('kzyro_community_posts_v3', JSON.stringify(updated));
        setVersion((v) => v + 1);
      },
      onDirectMessage: (msg) => {
        const all = StorageService.getAllDirectMessages();
        if (!all.some((m) => m.id === msg.id)) {
          localStorage.setItem(
            'kzyro_community_direct_messages_v3',
            JSON.stringify([...all, msg])
          );
          setVersion((v) => v + 1);
        }
      },
      onPresenceUpdate: (_onlineSet, profiles) => {
        const members = StorageService.getMembers();
        let changed = false;

        // Auto-discover any new members joining via Supabase
        for (const [userId, profile] of Object.entries(profiles)) {
          const existing = members.find((m) => m.id === userId);
          if (!existing && profile.name) {
            members.push({
              id: userId,
              name: profile.name,
              role: profile.role || 'Equipe KZYRO',
              email: profile.email || `${userId}@kzyro.com`,
              avatar: profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
              bio: 'Membro da equipe KZYRO.',
              accentColor: '#38bdf8',
              joinedDate: 'Hoje',
              isOnline: true,
            });
            changed = true;
          }
        }

        if (changed) {
          localStorage.setItem('kzyro_community_members_v3', JSON.stringify(members));
          setVersion((v) => v + 1);
        }
      },
    });

    return () => {
      unsubscribe();
      realtimeService.destroy();
    };
  }, [currentUser?.id]);

  // Poll for counts when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    const fetchBadges = async () => {
      try {
        const [notifs, msgs] = await Promise.all([
          ApiService.getNotifications(currentUser.id),
          ApiService.getMessages(currentUser.id),
        ]);
        setUnreadNotificationsCount(notifs.filter((n) => !n.read).length);
        setUnreadMessagesCount(
          msgs.filter((m) => m.recipientId === currentUser.id && !m.read).length
        );
      } catch {
        // noop
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser?.id, version]);

  // Subscribe to storage changes for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = () => {
      setVersion((v) => v + 1);
      if (currentUser) {
        const freshUser = StorageService.getMemberById(currentUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
        }
      }
    };

    window.addEventListener('kzyro_storage_change', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('kzyro_storage_change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser]);

  const handlePostUpdated = () => {
    setVersion((v) => v + 1);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('feed');
    setSelectedProfileMemberId(null);
    setSelectedChatPartnerId(null);
  };

  const handleLogout = () => {
    StorageService.logout();
    realtimeService.destroy();
    setCurrentUser(null);
    setActiveTab('feed');
    setSelectedProfileMemberId(null);
    setSelectedChatPartnerId(null);
  };

  const handleViewMemberProfile = (userId: string) => {
    setSelectedProfileMemberId(userId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartChatWithMember = (memberId: string) => {
    setSelectedChatPartnerId(memberId);
    setActiveTab('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToPost = (postId: string) => {
    setActiveTab('feed');
    setSelectedProfileMemberId(null);
    setTimeout(() => {
      const el = document.getElementById(postId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleNavigateToChat = (partnerId: string) => {
    setSelectedChatPartnerId(partnerId);
    setActiveTab('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is not logged in, render the login / registration screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans pb-20 sm:pb-8 selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'profile') setSelectedProfileMemberId(null);
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onLogout={handleLogout}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Main Feed / Content Stream */}
          <div className={activeTab === 'messages' ? 'lg:col-span-12' : 'lg:col-span-8'}>
            {activeTab === 'feed' && (
              <FeedView
                key={version}
                currentUser={currentUser}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onPostUpdated={handlePostUpdated}
                onViewMemberProfile={handleViewMemberProfile}
                onOpenImage={(url) => setLightboxImage(url)}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesView
                key={`${currentUser.id}_${version}`}
                currentUser={currentUser}
                initialPartnerId={selectedChatPartnerId}
                onViewMemberProfile={handleViewMemberProfile}
                onOpenImage={(url) => setLightboxImage(url)}
              />
            )}

            {activeTab === 'members' && (
              <MembersView
                key={version}
                currentUser={currentUser}
                onSelectMember={handleViewMemberProfile}
                onStartChatWithMember={handleStartChatWithMember}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                key={version}
                currentUser={currentUser}
                onNavigateToPost={handleNavigateToPost}
                onNavigateToChat={handleNavigateToChat}
                onNotificationsUpdated={handlePostUpdated}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                key={version}
                memberId={selectedProfileMemberId || currentUser.id}
                currentUser={currentUser}
                onBack={() => {
                  setActiveTab('feed');
                  setSelectedProfileMemberId(null);
                }}
                onPostUpdated={handlePostUpdated}
                onViewMemberProfile={handleViewMemberProfile}
                onOpenImage={(url) => setLightboxImage(url)}
                onStartChatWithMember={handleStartChatWithMember}
              />
            )}
          </div>

          {/* Desktop Right Sidebar (Only shown when not in full-width chat) */}
          {activeTab !== 'messages' && (
            <div className="hidden lg:block lg:col-span-4 sticky top-24">
              <SidebarWidget
                currentUser={currentUser}
                onViewMemberProfile={handleViewMemberProfile}
                onStartChatWithMember={handleStartChatWithMember}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'profile') setSelectedProfileMemberId(null);
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
        currentUser={currentUser}
      />

      {/* Modal for Creating / Publishing Posts */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onPostCreated={handlePostUpdated}
      />

      {/* Lightbox for Zooming Photos */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
