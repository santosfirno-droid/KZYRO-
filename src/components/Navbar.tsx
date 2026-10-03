import { useState, useRef, useEffect } from 'react';
import { User, TabType } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  Plus,
  Bell,
  LogOut,
  ChevronDown,
  Users,
  User as UserIcon,
  MessageCircle,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenCreateModal: () => void;
  onLogout: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

export function Navbar({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onLogout,
  unreadNotificationsCount,
  unreadMessagesCount,
}: NavbarProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => setActiveTab('feed')}
          className="cursor-pointer flex items-center gap-3 shrink-0"
        >
          <BrandLogo size="md" />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Feed
          </button>

          {/* Messages Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'messages'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Mensagens</span>
            {unreadMessagesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </button>

          {/* Members Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros</span>
          </button>

          {/* Notifications Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificações</span>
            {unreadNotificationsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </button>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {/* Create Post Button */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar</span>
          </button>

          {/* Mobile Messages Shortcut */}
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className="md:hidden relative p-2 text-slate-300 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
            aria-label="Mensagens privadas"
          >
            <MessageCircle className="w-4 h-4" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer group"
              aria-label="Menu do usuário"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-[#0b1222] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                {/* Current User Info */}
                <div className="px-4 py-2.5 border-b border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Conta Conectada</div>
                  <div className="text-sm font-bold text-white mt-0.5">{currentUser.name}</div>
                  <div className="text-xs font-semibold text-blue-400">{currentUser.role}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{currentUser.email}</div>
                </div>

                {/* Profile Link */}
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setShowUserDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/60 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <span>Ver e editar meu perfil</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="p-1 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
