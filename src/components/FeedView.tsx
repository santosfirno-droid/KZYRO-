import { useState, useEffect } from 'react';
import { Post, User } from '../types';
import { ApiService } from '../services/api';
import { PostCard } from './PostCard';
import { Plus, Image, Sparkles, MessageSquare, RefreshCw } from 'lucide-react';

interface FeedViewProps {
  currentUser: User;
  onOpenCreateModal: () => void;
  onPostUpdated: () => void;
  onViewMemberProfile: (userId: string) => void;
  onOpenImage: (imageUrl: string) => void;
}

export function FeedView({
  currentUser,
  onOpenCreateModal,
  onPostUpdated,
  onViewMemberProfile,
  onOpenImage,
}: FeedViewProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSharedFeed = async () => {
    try {
      const data = await ApiService.getPosts();
      setPosts(data);
    } catch (err) {
      console.warn('Error fetching shared feed:', err);
    }
  };

  useEffect(() => {
    fetchSharedFeed();
    // Auto-refresh feed every 4 seconds to sync posts across all members' devices in real-time!
    const interval = setInterval(fetchSharedFeed, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchSharedFeed();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Extract unique roles from actual posts if any
  const availableRoles = Array.from(new Set(posts.map((p) => p.authorRole))).filter(Boolean);

  const filteredPosts = posts.filter((post) => {
    if (selectedRoleFilter === 'all') return true;
    return post.authorRole === selectedRoleFilter;
  });

  return (
    <div className="space-y-5">
      {/* Quick Composer Box / Call to Action */}
      <div className="bg-[#0b1222] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/30">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover border border-slate-700"
          />
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex-1 text-left bg-[#070b14] hover:bg-slate-900/80 border border-slate-800 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
          >
            O que você está construindo hoje na KZYRO, {currentUser.name}?
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline text-slate-500">Feed Único da Equipe:</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-medium">
              <Sparkles className="w-3 h-3" /> Todas as contas compartilham este espaço
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              className={`p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ${
                isRefreshing ? 'animate-spin text-blue-400' : ''
              }`}
              title="Atualizar feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer sm:hidden"
              title="Anexar foto"
            >
              <Image className="w-4 h-4 text-blue-400" />
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Publicação</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Filter Tabs if multiple roles exist */}
      {availableRoles.length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedRoleFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({posts.length})
          </button>
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === role
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      )}

      {/* Zeroed State: Empty Feed */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 px-6 bg-[#0b1222] border border-slate-800/80 rounded-2xl text-slate-400 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-3.5">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            Feed único limpo e pronto
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Nenhuma publicação ainda. Quando você ou qualquer colega publicar, ela aparecerá aqui instantaneamente para todos os membros da comunidade.
          </p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Fazer Primeira Publicação</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post: Post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onPostUpdated={() => {
                fetchSharedFeed();
                onPostUpdated();
              }}
              onViewMemberProfile={onViewMemberProfile}
              onOpenImage={onOpenImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
