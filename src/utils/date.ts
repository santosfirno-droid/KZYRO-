export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'agora mesmo';
    }
    if (diffMinutes < 60) {
      return `há ${diffMinutes} min`;
    }
    if (diffHours < 24) {
      return `há ${diffHours}h`;
    }
    if (diffDays === 1) {
      const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `ontem às ${time}`;
    }
    if (diffDays < 7) {
      return `há ${diffDays} dias`;
    }

    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  } catch {
    return 'recentemente';
  }
}
