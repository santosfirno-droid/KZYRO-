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
  UserPlus,
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
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all users and messages from server
  const loadData = async () => {
    try {
      const [usersList, msgsList] = await Promise.all([
        ApiService.searchUsers(),
        ApiService.getMessages(currentUser.id),
      ]);
      setAllUsers(usersList.filter((u) => u.id !== currentUser.id));
      setMessages(msgsList);

      // Default select first partner if none selected
      if (!selectedPartnerId && usersList.length > 1) {
        const first = usersList.find((u) => u.id !== currentUser.id);
        if (first) setSelectedPartnerId(first.id);
      }
    } catch (err) {
      console.warn('Error loading chat data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // Polling for real-time incoming messages
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

  // Modal search
  const modalUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(modalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(modalSearch.toLowerCase())
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

  return (
    <div className="bg-[#0b1222] border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[78vh] min-h-[520px]">
      {/* Top Banner: Privacy & Account Separation Assurance */}
      <div className="bg-[#070b14] px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Mensagens Privadas &middot; Canal Seguro KZYRO</span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Sessão ativa de: <strong className="text-white">{currentUser.name}</strong>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Contacts Sidebar */}
        <aside
          className={`w-full sm:w-80 bg-[#080e1c] border-r border-slate-800/80 flex flex-col ${
            selectedPartnerId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Conversas
              </h2>
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>Nova conversa</span>
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar membro ou cargo..."
                className="w-full bg-[#070b14] border border-slate-800 focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* List of Contacts */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredPartners.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-500 text-xs">
                {searchQuery ? (
                  <p>Nenhum membro encontrado com &ldquo;{searchQuery}&rdquo;</p>
                ) : (
                  <div className="space-y-2">
                    <p>Nenhuma outra conta cadastrada ainda.</p>
                    <p className="text-[11px] text-slate-600">
                      Peça para seus colegas criarem uma conta na tela de login.
                    </p>
                  </div>
                )}
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
                        ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                        : 'hover:bg-slate-900 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#080e1c]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate text-slate-200">
                          {partner.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-500">
                            {formatRelativeTime(lastMsg.createdAt)}
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
                        <p className="text-[10px] text-slate-500 italic mt-0.5">
                          Iniciar conversa privada...
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

        {/* Chat Area */}
        <section
          className={`flex-1 flex flex-col bg-[#070b14] ${
            !selectedPartnerId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:px-5 border-b border-slate-800/80 bg-[#0b1222] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPartnerId('')}
                    className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    aria-label="Voltar para contatos"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    onClick={() => onViewMemberProfile(selectedPartner.id)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <img
                      src={selectedPartner.avatar}
                      alt={selectedPartner.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 group-hover:border-blue-400 transition-colors"
                    />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        {selectedPartner.name}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({selectedPartner.role})
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online na KZYRO
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Lock className="w-3 h-3 text-blue-400" />
                  <span className="hidden md:inline">Privado:</span>
                  <span>{currentUser.name} &harr; {selectedPartner.name}</span>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.length === 0 ? (
                  <div className="text-center py-16 px-4 text-slate-400">
                    <Lock className="w-8 h-8 text-blue-400/60 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Inicie uma conversa privada com {selectedPartner.name}.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Esta conversa é segura e visível apenas para vocês dois.
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
              <Lock className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                Selecione ou pesquise um membro para conversar
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
                Toda conversa é visível estritamente para você e o outro participante.
              </p>
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Pesquisar membro</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* New Chat / User Search Modal */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0b1222] border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span>Pesquisar Membro para Conversar</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Digite o nome, cargo ou e-mail..."
                className="w-full bg-[#070b14] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {modalUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Nenhum membro encontrado.
                </div>
              ) : (
                modalUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(user.id);
                      setShowNewChatModal(false);
                      setModalSearch('');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 border border-slate-800 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-blue-400">{user.role}</div>
                      </div>
                    </div>
                    <span className="text-xs text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Abrir chat &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
