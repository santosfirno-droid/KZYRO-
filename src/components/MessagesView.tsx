import React, { useState, useEffect, useRef } from 'react';
import { User, DirectMessage } from '../types';
import { ApiService } from '../services/api';
import { formatRelativeTime } from '../utils/date';
import {
  Send,
  Lock,
  Image as ImageIcon,
  Trash2,
  X,
  ArrowLeft,
  CheckCheck,
  Search,
  MessageCircle,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface MessagesViewProps {
  currentUser: User;
  initialPartnerId?: string | null;
  onViewMemberProfile: (userId: string) => void;
  onOpenImage: (imageUrl: string) => void;
}

export function MessagesView({
  currentUser,
  initialPartnerId,
  onViewMemberProfile,
  onOpenImage,
}: MessagesViewProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(initialPartnerId || '');
  const [searchQuery, setSearchQuery] = useState('');

  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Send periodic presence heartbeat
  useEffect(() => {
    ApiService.sendHeartbeat(currentUser.id);
    const hbInterval = setInterval(() => {
      ApiService.sendHeartbeat(currentUser.id);
    }, 15000);
    return () => clearInterval(hbInterval);
  }, [currentUser.id]);

  // Load all registered users and messages from server
  const loadData = async () => {
    try {
      const [usersList, msgsList] = await Promise.all([
        ApiService.searchUsers(),
        ApiService.getMessages(currentUser.id),
      ]);
      // Exclude currentUser from chat contact list
      const otherUsers = usersList.filter((u) => u.id !== currentUser.id);
      setAllUsers(otherUsers);
      setMessages(msgsList);

      // On desktop, auto-select first partner if none is selected yet and members exist
      if (!selectedPartnerId && otherUsers.length > 0 && window.innerWidth >= 640) {
        setSelectedPartnerId(otherUsers[0].id);
      }
    } catch (err) {
      console.warn('Error loading chat data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Live sync every 3 seconds
    return () => clearInterval(interval);
  }, [currentUser.id]);

  useEffect(() => {
    if (initialPartnerId) {
      setSelectedPartnerId(initialPartnerId);
    }
  }, [initialPartnerId]);

  // Mark read when partner is selected
  useEffect(() => {
    if (selectedPartnerId) {
      ApiService.markMessagesRead(currentUser.id, selectedPartnerId);
    }
  }, [selectedPartnerId, messages.length]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedPartnerId]);

  const selectedPartner = allUsers.find((u) => u.id === selectedPartnerId);

  // STRICT ACCOUNT ISOLATION: filter strictly between currentUser and selectedPartner
  const conversation = selectedPartnerId
    ? messages
        .filter(
          (m) =>
            (m.senderId === currentUser.id && m.recipientId === selectedPartnerId) ||
            (m.senderId === selectedPartnerId && m.recipientId === currentUser.id)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageText.trim() && !imageUrl) || isSending || !selectedPartnerId) return;

    setIsSending(true);
    const sent = await ApiService.sendMessage({
      senderId: currentUser.id,
      recipientId: selectedPartnerId,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientName: selectedPartner?.name,
      recipientAvatar: selectedPartner?.avatar,
      content: messageText,
      imageUrl: imageUrl || undefined,
    });

    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setMessageText('');
      setImageUrl('');
    }
    setIsSending(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setImageUrl(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDeleteId) return;
    const ok = await ApiService.deleteMessage(messageToDeleteId, currentUser.id);
    if (ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageToDeleteId));
    }
    setMessageToDeleteId(null);
  };

  // Filter contacts by search query
  const filteredPartners = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnreadFrom = (partnerId: string): number => {
    return messages.filter(
      (m) => m.senderId === partnerId && m.recipientId === currentUser.id && !m.read
    ).length;
  };

  const getLastMessageWith = (partnerId: string): DirectMessage | undefined => {
    const userMsgs = messages.filter(
      (m) =>
        (m.senderId === currentUser.id && m.recipientId === partnerId) ||
        (m.senderId === partnerId && m.recipientId === currentUser.id)
    );
    return userMsgs[userMsgs.length - 1];
  };

  const onlineMembersCount = allUsers.filter((u) => u.isOnline).length;

  return (
    <div className="bg-[#0b1222] border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[78vh] min-h-[520px]">
      {/* Top Banner: Privacy & Account Separation Assurance */}
      <div className="bg-[#070b14] px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Bate-papo Privado da KZYRO</span>
          <span className="text-slate-600 hidden sm:inline">&middot;</span>
          <span className="text-[11px] text-emerald-400 hidden sm:flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {onlineMembersCount} colega{onlineMembersCount === 1 ? '' : 's'} online
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Você: <strong className="text-white font-semibold">{currentUser.name}</strong>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ALL REGISTERED ACCOUNTS LIST (Sidebar) */}
        <aside
          className={`w-full sm:w-80 bg-[#080e1c] border-r border-slate-800/80 flex flex-col ${
            selectedPartnerId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Todas as Contas ({allUsers.length})
                </h2>
              </div>
              <span className="text-[10px] text-slate-500">Clique para conversar</span>
            </div>

            {/* Instant Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar contas..."
                className="w-full bg-[#070b14] border border-slate-800 focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* List of All Accounts with Online Status */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {allUsers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 text-xs space-y-1">
                <p className="font-semibold text-slate-300">Apenas você está cadastrado no momento.</p>
                <p className="text-[11px] text-slate-500">
                  Assim que outros colegas criarem contas, todos aparecerão aqui automaticamente com status online/offline.
                </p>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-500 text-xs">
                Nenhuma conta encontrada para &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const unread = getUnreadFrom(partner.id);
                const lastMsg = getLastMessageWith(partner.id);
                const isSelected = selectedPartnerId === partner.id;

                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/40 text-white shadow-sm'
                        : 'hover:bg-slate-900 border border-transparent text-slate-300'
                    }`}
                  >
                    {/* Avatar with Status Ring */}
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                      {partner.isOnline ? (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#080e1c] shadow-sm animate-pulse"
                          title="Online agora"
                        />
                      ) : (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-600 ring-2 ring-[#080e1c]"
                          title="Offline"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate text-slate-100 flex items-center gap-1.5">
                          {partner.name}
                        </span>
                        {lastMsg ? (
                          <span className="text-[10px] text-slate-500">
                            {formatRelativeTime(lastMsg.createdAt)}
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                              partner.isOnline
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-slate-500 bg-slate-800/60'
                            }`}
                          >
                            {partner.isOnline ? 'Online' : 'Offline'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 truncate">
                        {partner.role}
                      </div>

                      {lastMsg ? (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lastMsg.senderId === currentUser.id ? 'Você: ' : ''}
                          {lastMsg.content || '📷 Imagem anexada'}
                        </p>
                      ) : (
                        <p className="text-[10px] text-blue-400/80 truncate mt-0.5">
                          Enviar mensagem privada &rarr;
                        </p>
                      )}
                    </div>

                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ACTIVE CHAT AREA */}
        <section
          className={`flex-1 flex flex-col bg-[#070b14] ${
            !selectedPartnerId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {selectedPartner ? (
            <>
              {/* Chat Header with Real Online / Offline status */}
              <div className="p-3 sm:px-5 border-b border-slate-800/80 bg-[#0b1222] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPartnerId('')}
                    className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    aria-label="Voltar para a lista de contas"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    onClick={() => onViewMemberProfile(selectedPartner.id)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div className="relative">
                      <img
                        src={selectedPartner.avatar}
                        alt={selectedPartner.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-blue-400 transition-colors"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#0b1222] ${
                          selectedPartner.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        {selectedPartner.name}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({selectedPartner.role})
                        </span>
                      </div>

                      {/* Online vs Offline label */}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium">
                        {selectedPartner.isOnline ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Online agora
                          </span>
                        ) : (
                          <span className="text-slate-500">Offline no momento</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Lock className="w-3 h-3 text-blue-400" />
                  <span className="hidden md:inline">Canal Privado</span>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.length === 0 ? (
                  <div className="text-center py-16 px-4 text-slate-400">
                    <Lock className="w-8 h-8 text-blue-400/60 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Inicie sua conversa privada com {selectedPartner.name}.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Esta conversa é isolada e visível apenas para vocês dois.
                    </p>
                  </div>
                ) : (
                  conversation.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 group ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 mb-1"
                          />
                        )}

                        <div
                          className={`max-w-[75%] sm:max-w-md rounded-2xl p-3 relative shadow-md text-xs leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-[#0f172a] border border-slate-800 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          {msg.imageUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-56 bg-black/30">
                              <img
                                src={msg.imageUrl}
                                alt="Anexo de mensagem"
                                onClick={() => onOpenImage(msg.imageUrl!)}
                                className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.01] transition-transform"
                              />
                            </div>
                          )}

                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${
                              isMe ? 'text-blue-100/80' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatRelativeTime(msg.createdAt)}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                          </div>
                        </div>

                        {/* Delete sent message */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => setMessageToDeleteId(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity cursor-pointer"
                            title="Apagar mensagem enviada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview */}
              {imageUrl && (
                <div className="px-4 py-2 bg-[#0b1222] border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={imageUrl}
                      alt="Pré-visualização"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                    <span className="text-xs text-slate-300">Imagem pronta para envio</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-800/80 bg-[#0b1222] flex items-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    imageUrl
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Anexar imagem"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Mensagem privada para ${selectedPartner.name}...`}
                  className="flex-1 bg-[#070b14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 px-3.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                />

                <button
                  type="submit"
                  disabled={(!messageText.trim() && !imageUrl) || isSending}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-all cursor-pointer"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center">
              <MessageCircle className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                Selecione uma conta na lista ao lado para conversar
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Todas as contas cadastradas na KZYRO aparecem listadas com o indicador se estão online ou offline.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Delete message modal */}
      <ConfirmModal
        isOpen={!!messageToDeleteId}
        title="Apagar mensagem"
        message="Deseja remover esta mensagem enviada? Ela será apagada da conversa."
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteMessage}
        onCancel={() => setMessageToDeleteId(null)}
      />
    </div>
  );
}
