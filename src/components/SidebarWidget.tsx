import { useState, useEffect } from 'react';
import { User } from '../types';
import { ApiService } from '../services/api';
import { Shield, MessageCircle, Database } from 'lucide-react';

interface SidebarWidgetProps {
  currentUser: User;
  onViewMemberProfile: (userId: string) => void;
  onStartChatWithMember: (userId: string) => void;
}

export function SidebarWidget({
  currentUser,
  onViewMemberProfile,
  onStartChatWithMember,
}: SidebarWidgetProps) {
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await ApiService.searchUsers();
        setMembers(list);
      } catch {
        // noop
      }
    };
    loadUsers();
    const interval = setInterval(loadUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const otherMembers = members.filter((m) => m.id !== currentUser.id);

  return (
    <aside className="space-y-4">
      {/* Team presence widget */}
      <div className="bg-[#0b1222] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Colegas de Equipe
            </h2>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {members.length} cadastrado{members.length === 1 ? '' : 's'}
          </span>
        </div>

        {otherMembers.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">
            Aguardando outros membros criarem suas contas na KZYRO Community.
          </div>
        ) : (
          <div className="space-y-2">
            {otherMembers.map((member) => (
              <div
                key={member.id}
                className="p-2.5 rounded-xl border transition-all flex items-center justify-between bg-slate-900/50 border-slate-800/70 hover:border-slate-700"
              >
                <div
                  onClick={() => onViewMemberProfile(member.id)}
                  className="flex items-center gap-2.5 cursor-pointer flex-1 group"
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700 group-hover:border-blue-400 transition-colors"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white flex items-center gap-1">
                      {member.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{member.role}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartChatWithMember(member.id)}
                  className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/25 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  title={`Mensagem privada com ${member.name}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supabase backend status widget */}
      <div className="bg-[#0b1222]/80 border border-slate-800/60 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-emerald-400 font-semibold text-xs">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Nuvem KZYRO Ativa</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Feed único compartilhado e mensagens privadas criptografadas com isolamento estrito de contas.
        </p>
      </div>
    </aside>
  );
}
