import React, { useState, useEffect, useRef } from 'react';
import { User, DirectMessage } from '../types';
import { StorageService } from '../services/storage';
import { formatRelativeTime } from '../utils/date';
import {
  Send,
  Lock,
  Image as ImageIcon,
  Trash2,
  X,
  Upload,
  ArrowLeft,
  CheckCheck,
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
  const allMembers = StorageService.getMembers();
  // Filter out currentUser from contacts list
  const availablePartners = allMembers.filter((m) => m.id !== currentUser.id);

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(() => {
    if (initialPartnerId && availablePartners.some((p) => p.id === initialPartnerId)) {
      return initialPartnerId;
    }
    return availablePartners[0]?.id || '';
  });

  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedPartner = allMembers.find((m) => m.id === selectedPartnerId);

  // STRICT ACCOUNT ISOLATION: get conversation strictly between currentUser and selectedPartner
  const conversation: DirectMessage[] = selectedPartnerId
    ? StorageService.getConversation(currentUser.id, selectedPartnerId)
    : [];

  // Mark conversation as read on open or change
  useEffect(() => {
    if (selectedPartnerId) {
      StorageService.markConversationAsRead(currentUser.id, selectedPartnerId);
    }
  }, [selectedPartnerId, refreshKey, currentUser.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length, selectedPartnerId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !imageUrl) return;

    StorageService.sendDirectMessage({
      senderId: currentUser.id,
      recipientId: selectedPartnerId,
      content: messageText,
      imageUrl: imageUrl || undefined,
    });

    setMessageText('');
    setImageUrl('');
    setShowImagePicker(false);
    setRefreshKey((k) => k + 1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setImageUrl(uploadEvent.target.result as string);
        setShowImagePicker(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDeleteMessage = () => {
    if (messageToDeleteId) {
      StorageService.deleteDirectMessage(messageToDeleteId, currentUser.id);
      setMessageToDeleteId(null);
      setRefreshKey((k) => k + 1);
    }
  };

  // Helper to count unread messages from a partner
  const getUnreadFrom = (partnerId: string): number => {
    const all = StorageService.getDirectMessagesForUser(currentUser.id);
    return all.filter((m) => m.senderId === partnerId && m.recipientId === currentUser.id && !m.read)
      .length;
  };

  // Helper to get last message with a partner
  const getLastMessageWith = (partnerId: string): DirectMessage | undefined => {
    const conv = StorageService.getConversation(currentUser.id, partnerId);
    return conv[conv.length - 1];
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
        {/* Contacts Sidebar (Available Team Members) */}
        <aside
          className={`w-full sm:w-72 bg-[#080e1c] border-r border-slate-800/80 flex flex-col ${
            selectedPartnerId ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-slate-800/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Conversas Diretas
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Privadas apenas entre você e cada membro
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {availablePartners.map((partner) => {
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
                        Iniciar conversa...
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
            })}
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
                        Disponível na KZYRO
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

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.length === 0 ? (
                  <div className="text-center py-16 px-4 text-slate-400">
                    <Lock className="w-8 h-8 text-blue-400/60 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Nenhuma mensagem trocada ainda com {selectedPartner.name}.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Envie uma mensagem privada para alinhar ideias, fechar negócios ou tirar dúvidas técnicas.
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
                          {/* Image Attachment in message */}
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

                        {/* Delete sent message button */}
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

              {/* Image Preview before sending */}
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
                  disabled={!messageText.trim() && !imageUrl}
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
                Selecione um membro para iniciar o chat privado
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Toda conversa é criptografada no cliente e visível estritamente para os dois participantes.
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
