import { User } from '../types';
import { StorageService } from '../services/storage';
import { ArrowRight, MessageSquare, Shield, CheckCircle2, MessageCircle, UserPlus } from 'lucide-react';

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
  const members = StorageService.getMembers();
  const posts = StorageService.getPosts();

  const getPostCount = (userId: string): number => {
    return posts.filter((p) => p.authorId === userId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Membros da KZYRO</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Membros com contas registradas no Supabase ({members.length})
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 w-fit">
          <Shield className="w-3.5 h-3.5" />
          <span>Comunidade Privada</span>
        </div>
      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#0b1222] border border-slate-800 rounded-2xl text-slate-400">
          <UserPlus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">Nenhum membro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
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

      {/* Info card */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 shrink-0 mt-0.5">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <strong className="text-slate-200 block mb-0.5">Contas Individuais</strong>
          Cada pessoa da equipe deve criar sua própria conta na tela inicial. Assim que criarem suas contas, elas aparecerão listadas aqui para que possam interagir no feed e trocar mensagens privadas.
        </div>
      </div>
    </div>
  );
}
