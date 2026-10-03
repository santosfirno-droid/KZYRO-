import { TabType, User } from '../types';
import { Home, MessageCircle, Plus, Bell } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenCreateModal: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  currentUser: User;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  unreadNotificationsCount,
  unreadMessagesCount,
  currentUser,
}: BottomNavProps) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 pb-safe">
      <div className="flex items-center justify-around relative">
        {/* Feed Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'feed' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Feed</span>
        </button>

        {/* Messages Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors relative cursor-pointer ${
            activeTab === 'messages' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 mb-0.5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px]">Chat</span>
        </button>

        {/* Prominent Center Create Button (+) */}
        <div className="relative -top-2.5">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 ring-4 ring-[#070b14] transition-all cursor-pointer"
            aria-label="Criar nova publicação"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Notifications Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors relative cursor-pointer ${
            activeTab === 'notifications'
              ? 'text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5 mb-0.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px]">Avisos</span>
        </button>

        {/* Profile Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'profile' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className={`w-5 h-5 rounded-full object-cover mb-0.5 border ${
              activeTab === 'profile' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-700'
            }`}
          />
          <span className="text-[10px]">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
