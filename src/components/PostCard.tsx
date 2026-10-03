import React, { useState } from 'react';
import { Post, User } from '../types';
import { ApiService } from '../services/api';
import { formatRelativeTime } from '../utils/date';
import { Heart, MessageSquare, Send, Trash2, MoreHorizontal } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onPostUpdated: () => void;
  onViewMemberProfile: (userId: string) => void;
  onOpenImage: (imageUrl: string) => void;
}

export function PostCard({
  post,
  currentUser,
  onPostUpdated,
  onViewMemberProfile,
  onOpenImage,
}: PostCardProps) {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Deletion modals state
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);

  const isLikedByMe = post.likes.includes(currentUser.id);
  const isMyPost = post.authorId === currentUser.id;

  const handleToggleLike = async () => {
    await ApiService.toggleLike(post.id, currentUser.id);
    onPostUpdated();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    await ApiService.addComment(post.id, currentUser.id, commentText);
    setCommentText('');
    setIsSubmittingComment(false);
    setShowComments(true);
    onPostUpdated();
  };

  const confirmDeletePost = async () => {
    await ApiService.deletePost(post.id, currentUser.id);
    setIsDeletePostModalOpen(false);
    onPostUpdated();
  };

  const confirmDeleteComment = async () => {
    if (commentToDeleteId) {
      await ApiService.deleteComment(post.id, commentToDeleteId, currentUser.id);
      setCommentToDeleteId(null);
      onPostUpdated();
    }
  };

  return (
    <article
      id={post.id}
      className="bg-[#0b1222] border border-slate-800/80 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-slate-700/80"
    >
      {/* Post Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onViewMemberProfile(post.authorId)}
            className="group relative cursor-pointer"
            aria-label={`Ver perfil de ${post.authorName}`}
          >
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:ring-2 group-hover:ring-blue-500 transition-all"
            />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onViewMemberProfile(post.authorId)}
                className="text-sm font-bold text-slate-100 hover:text-blue-400 transition-colors cursor-pointer"
              >
                {post.authorName}
              </button>

              <span className="text-slate-600 text-xs" aria-hidden="true">
                &middot;
              </span>

              <span className="text-xs text-slate-400 font-medium">
                {post.authorRole}
              </span>

              <span className="text-slate-600 text-xs" aria-hidden="true">
                &middot;
              </span>

              <time className="text-xs text-slate-500">
                {formatRelativeTime(post.createdAt)}
              </time>
            </div>
            <div className="text-[11px] text-slate-500">Membro KZYRO</div>
          </div>
        </div>

        {/* Options / Delete for own post */}
        {isMyPost && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Opções da publicação"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-[#0d162b] border border-slate-700 rounded-xl shadow-xl py-1 z-20">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsDeletePostModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Text Content */}
      <div className="px-4 sm:px-5 py-2 text-slate-200 text-[14px] leading-relaxed whitespace-pre-line font-normal">
        {post.content}
      </div>

      {/* Post Optional Image */}
      {post.imageUrl && (
        <div className="mt-3 px-4 sm:px-5">
          <div
            onClick={() => onOpenImage(post.imageUrl!)}
            className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in group relative max-h-96"
          >
            <img
              src={post.imageUrl}
              alt="Anexo da publicação"
              className="w-full h-full max-h-96 object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        </div>
      )}

      {/* Who Liked Summary Line */}
      {post.likes.length > 0 && (
        <div className="px-4 sm:px-5 pt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>
            {post.likes.length === 1
              ? isLikedByMe
                ? 'Você curtiu esta publicação'
                : '1 pessoa curtiu'
              : `${post.likes.length} pessoas curtiram`}
          </span>
        </div>
      )}

      {/* Action Buttons Bar */}
      <div className="px-4 sm:px-5 py-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer select-none ${
              isLikedByMe
                ? 'text-rose-400 bg-rose-500/10 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            aria-label={isLikedByMe ? 'Descurtir publicação' : 'Curtir publicação'}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isLikedByMe ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
            <span>{post.likes.length > 0 ? post.likes.length : 'Curtir'}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
            aria-label="Ver comentários"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>
              {post.comments.length > 0 ? `${post.comments.length} comentários` : 'Comentar'}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          KZYRO Feed Único
        </span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-[#070d1a]/70 border-t border-slate-800/60 px-4 sm:px-5 py-4 space-y-3">
          {/* Comments List */}
          {post.comments.length > 0 && (
            <div className="space-y-2.5">
              {post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start justify-between gap-2.5 group/comment text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => onViewMemberProfile(comment.authorId)}
                      className="cursor-pointer shrink-0 mt-0.5"
                    >
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                    </button>
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-2 text-slate-200">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <button
                          type="button"
                          onClick={() => onViewMemberProfile(comment.authorId)}
                          className="font-bold text-white hover:text-blue-400 cursor-pointer"
                        >
                          {comment.authorName}
                        </button>
                        <span className="text-[10px] text-slate-400">
                          &middot; {comment.authorRole}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          &middot; {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-snug whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>

                  {comment.authorId === currentUser.id && (
                    <button
                      type="button"
                      onClick={() => setCommentToDeleteId(comment.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                      title="Excluir comentário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="relative flex-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Comentar como ${currentUser.name}...`}
                className="w-full bg-[#0b1222] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2 pl-3 pr-9 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:opacity-40 cursor-pointer"
                aria-label="Enviar comentário"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={isDeletePostModalOpen}
        title="Excluir publicação"
        message="Tem certeza que deseja apagar esta publicação? Ela será removida permanentemente do feed da KZYRO."
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDeletePost}
        onCancel={() => setIsDeletePostModalOpen(false)}
      />

      {/* Comment Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={!!commentToDeleteId}
        title="Excluir comentário"
        message="Deseja remover seu comentário desta publicação?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteComment}
        onCancel={() => setCommentToDeleteId(null)}
      />
    </article>
  );
}
