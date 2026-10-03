import { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { ApiService } from '../services/api';
import { ArrowRight, MessageSquare, Shield, CheckCircle2, MessageCircle, Search, UserPlus } from 'lucide-react';

interface MembersViewProps {
  onSelectMember: (userId: string) => void;
  onStartChatWithMember: (userId: string) => void;
  currentUser: User;
}

export function MembersView({
  onSelectMember,
  onStartChatWithMember,
  currentUser,
}: MembersViewProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [usersList, postsList] = await Promise.all([
        ApiService.searchUsers(),
        ApiService.getPosts(),
      ]);
      setMembers(usersList);
      setPosts(postsList);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const getPostCount = (userId: string): number => {
    return posts.filter((p) => p.authorId === userId).length;
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Equipe KZYRO</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Diretório de membros cadastrados ({members.length})
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 w-fit">
          <Shield className="w-3.5 h-3.5" />
          <span>Comunidade Privada</span>
        </div>
      </div>

      {/* User Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar contas por nome, cargo ou e-mail..."
          className="w-full bg-[#0b1222] border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-14 px-4 bg-[#0b1222] border border-slate-800 rounded-2xl text-slate-400">
          <UserPlus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">
            {searchQuery
              ? `Nenhum membro encontrado para "${searchQuery}".`
              : 'Nenhum membro cadastrado ainda.'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Tente buscar por outro termo ou nome.'
              : 'Novos membros que criarem conta aparecerão automaticamente neste diretório.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const postCount = getPostCount(member.id);
            const isCurrent = member.id === currentUser.id;

            return (
              <div
                key={member.id}
                className={`bg-[#0b1222] border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isCurrent
                    ? 'border-blue-500/40 shadow-lg shadow-blue-900/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Active Indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </div>

                <div>
                  {/* Photo & Role */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 shadow-md"
                      />
                      {isCurrent && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5"
                          title="Sua conta"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                        {member.name}
                        {isCurrent && (
                          <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            Você
                          </span>
                        )}
                      </h2>
                      <div className="text-xs font-semibold text-blue-400 mt-0.5">
                        {member.role}
                      </div>
                      <div className="text-[11px] text-slate-500">{member.email}</div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-3">
                    {member.bio || 'Membro da equipe KZYRO.'}
                  </p>
                </div>

                {/* Stats & Actions */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        <strong className="text-white font-semibold">{postCount}</strong>{' '}
                        {postCount === 1 ? 'publicação' : 'publicações'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectMember(member.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                    >
                      <span>Perfil</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => onStartChatWithMember(member.id)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Mensagem Privada</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
