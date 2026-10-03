import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://vdjhdmosxbccffzvqlcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AH1XDqS9eobKneJuXuzqGw_u7MLNiwA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'community_db.json');

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio: string;
  accentColor: string;
  joinedDate: string;
  supabaseUserId?: string;
  passwordHash?: string;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderAvatar: string;
  recipientName: string;
  recipientAvatar: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  type: 'like' | 'comment' | 'post' | 'direct_message';
  postId?: string;
  snippet?: string;
  createdAt: string;
  read: boolean;
}

interface DBData {
  users: User[];
  posts: Post[];
  messages: DirectMessage[];
  notifications: Notification[];
}

function loadDB(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading DB file:', err);
  }
  return {
    users: [],
    posts: [],
    messages: [],
    notifications: [],
  };
}

function saveDB(data: DBData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

let db = loadDB();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // --- API: Health & Status ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', membersCount: db.users.length, postsCount: db.posts.length });
  });

  // --- API: Users Directory & Search ---
  app.get('/api/users', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    let result = db.users.map(({ passwordHash, ...rest }) => rest);

    if (q) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }

    res.json(result);
  });

  app.get('/api/users/:id', (req: Request, res: Response) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- API: Register ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { name, role, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists locally
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado. Faça login.' });
    }

    // Attempt registration in Supabase Auth
    let supabaseId = '';
    try {
      const { data: supaAuth, error: supaErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: name.trim(), role: role?.trim() || 'Equipe KZYRO', avatar_url: avatar },
        },
      });

      if (supaAuth?.user) {
        supabaseId = supaAuth.user.id;
        // update profiles row
        await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            avatar_url: avatar || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', supaAuth.user.id);
      } else if (supaErr && supaErr.message.toLowerCase().includes('already registered')) {
        // try signing in
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInData?.user) {
          supabaseId = signInData.user.id;
        }
      }
    } catch (err) {
      console.warn('Supabase register note:', err);
    }

    const newUser: User = {
      id: supabaseId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      role: role?.trim() || 'Equipe KZYRO',
      email: cleanEmail,
      avatar:
        avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
      bio: 'Membro da equipe KZYRO.',
      accentColor: '#38bdf8',
      joinedDate: new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      supabaseUserId: supabaseId || undefined,
      passwordHash: password, // For internal validation
    };

    db.users.push(newUser);
    saveDB(db);

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  });

  // --- API: Login ---
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Try Supabase auth
    try {
      const { data: sAuth } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (sAuth?.user) {
        let found = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (!found) {
          found = {
            id: sAuth.user.id,
            name: sAuth.user.user_metadata?.name || cleanEmail.split('@')[0],
            role: sAuth.user.user_metadata?.role || 'Equipe KZYRO',
            email: cleanEmail,
            avatar:
              sAuth.user.user_metadata?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
            bio: 'Membro da equipe KZYRO.',
            accentColor: '#38bdf8',
            joinedDate: 'Hoje',
            supabaseUserId: sAuth.user.id,
          };
          db.users.push(found);
          saveDB(db);
        }
        const { passwordHash: _, ...safeUser } = found;
        return res.json(safeUser);
      }
    } catch {
      // fallback to local check
    }

    const localUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!localUser || (localUser.passwordHash && localUser.passwordHash !== password)) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const { passwordHash: _, ...safeUser } = localUser;
    res.json(safeUser);
  });

  // --- API: Update Profile ---
  app.put('/api/users/:id', async (req: Request, res: Response) => {
    const { name, role, avatar, bio } = req.body;
    const userIndex = db.users.findIndex((u) => u.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = db.users[userIndex];
    if (name) user.name = name.trim();
    if (role) user.role = role.trim();
    if (avatar) user.avatar = avatar.trim();
    if (bio !== undefined) user.bio = bio.trim();

    // Propagate changes to all author references
    db.posts.forEach((p) => {
      if (p.authorId === user.id) {
        if (name) p.authorName = user.name;
        if (role) p.authorRole = user.role;
        if (avatar) p.authorAvatar = user.avatar;
      }
      p.comments.forEach((c) => {
        if (c.authorId === user.id) {
          if (name) c.authorName = user.name;
          if (role) c.authorRole = user.role;
          if (avatar) c.authorAvatar = user.avatar;
        }
      });
    });

    db.messages.forEach((m) => {
      if (m.senderId === user.id) {
        if (name) m.senderName = user.name;
        if (avatar) m.senderAvatar = user.avatar;
      }
      if (m.recipientId === user.id) {
        if (name) m.recipientName = user.name;
        if (avatar) m.recipientAvatar = user.avatar;
      }
    });

    saveDB(db);

    // Sync to Supabase
    if (user.supabaseUserId) {
      try {
        await supabase
          .from('profiles')
          .update({
            name: user.name,
            avatar_url: user.avatar,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.supabaseUserId);
      } catch {
        // noop
      }
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- API: Single Shared Feed ("Feed Único") ---
  app.get('/api/posts', (_req: Request, res: Response) => {
    // Return all posts sorted by creation date descending
    const sorted = [...db.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  });

  app.post('/api/posts', (req: Request, res: Response) => {
    const { authorId, content, imageUrl } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Conteúdo da publicação é obrigatório.' });
    }

    const author = db.users.find((u) => u.id === authorId);
    if (!author) {
      return res.status(401).json({ error: 'Usuário autor não encontrado.' });
    }

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      authorAvatar: author.avatar,
      content: content.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    db.posts.unshift(newPost);

    // Create notifications for all other users
    const otherUsers = db.users.filter((u) => u.id !== author.id);
    otherUsers.forEach((u) => {
      db.notifications.unshift({
        id: `notif_${Date.now()}_${u.id}`,
        recipientId: u.id,
        senderId: author.id,
        senderName: author.name,
        senderAvatar: author.avatar,
        senderRole: author.role,
        type: 'post',
        postId: newPost.id,
        snippet: newPost.content.slice(0, 50) + (newPost.content.length > 50 ? '...' : ''),
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    saveDB(db);
    res.status(201).json(newPost);
  });

  app.delete('/api/posts/:id', (req: Request, res: Response) => {
    const { userId } = req.query;
    const postIndex = db.posts.findIndex((p) => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const post = db.posts[postIndex];
    if (userId && post.authorId !== userId) {
      return res.status(403).json({ error: 'Você só pode excluir suas próprias publicações.' });
    }

    db.posts.splice(postIndex, 1);
    saveDB(db);
    res.json({ success: true, deletedId: req.params.id });
  });

  // --- API: Likes ---
  app.post('/api/posts/:id/like', (req: Request, res: Response) => {
    const { userId } = req.body;
    const post = db.posts.find((p) => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const hasLiked = post.likes.includes(userId);
    if (hasLiked) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
      // Notify post author if not self
      if (post.authorId !== userId) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientId: post.authorId,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatar,
          senderRole: user.role,
          type: 'like',
          postId: post.id,
          snippet: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    saveDB(db);
    res.json({ likes: post.likes });
  });

  // --- API: Comments ---
  app.post('/api/posts/:id/comments', (req: Request, res: Response) => {
    const { authorId, content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }

    const post = db.posts.find((p) => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const author = db.users.find((u) => u.id === authorId);
    if (!author) {
      return res.status(401).json({ error: 'Usuário autor não encontrado.' });
    }

    const newComment: Comment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId: post.id,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      authorAvatar: author.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    post.comments.push(newComment);

    if (post.authorId !== author.id) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: post.authorId,
        senderId: author.id,
        senderName: author.name,
        senderAvatar: author.avatar,
        senderRole: author.role,
        type: 'comment',
        postId: post.id,
        snippet: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    saveDB(db);
    res.status(201).json(newComment);
  });

  app.delete('/api/posts/:id/comments/:commentId', (req: Request, res: Response) => {
    const { userId } = req.query;
    const post = db.posts.find((p) => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Publicação não encontrada.' });
    }

    const commentIndex = post.comments.findIndex((c) => c.id === req.params.commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }

    const comment = post.comments[commentIndex];
    if (userId && comment.authorId !== userId) {
      return res.status(403).json({ error: 'Você só pode excluir seus próprios comentários.' });
    }

    post.comments.splice(commentIndex, 1);
    saveDB(db);
    res.json({ success: true, deletedCommentId: req.params.commentId });
  });

  // --- API: Private Direct Messages (Strict Separation) ---
  app.get('/api/messages', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório para acessar mensagens privadas.' });
    }

    // STRICT ACCOUNT SEPARATION: Only messages where userId is sender or recipient!
    const userMessages = db.messages.filter(
      (m) => m.senderId === userId || m.recipientId === userId
    );

    res.json(userMessages);
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const { senderId, recipientId, content, imageUrl } = req.body;

    if (!content?.trim() && !imageUrl) {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const sender = db.users.find((u) => u.id === senderId);
    const recipient = db.users.find((u) => u.id === recipientId);

    if (!sender || !recipient) {
      return res.status(400).json({ error: 'Remetente ou destinatário não encontrado.' });
    }

    const newMsg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      recipientId: recipient.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      recipientName: recipient.name,
      recipientAvatar: recipient.avatar,
      content: content?.trim() || '',
      imageUrl: imageUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
      read: false,
    };

    db.messages.push(newMsg);

    // Notify recipient
    db.notifications.unshift({
      id: `notif_${Date.now()}_${recipient.id}`,
      recipientId: recipient.id,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      senderRole: sender.role,
      type: 'direct_message',
      snippet: newMsg.content.slice(0, 50) + (newMsg.content.length > 50 ? '...' : ''),
      createdAt: new Date().toISOString(),
      read: false,
    });

    saveDB(db);
    res.status(201).json(newMsg);
  });

  app.delete('/api/messages/:id', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const msgIndex = db.messages.findIndex((m) => m.id === req.params.id);

    if (msgIndex === -1) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    const msg = db.messages[msgIndex];
    if (userId && msg.senderId !== userId) {
      return res.status(403).json({ error: 'Você só pode excluir mensagens enviadas por você.' });
    }

    db.messages.splice(msgIndex, 1);
    saveDB(db);
    res.json({ success: true, deletedId: req.params.id });
  });

  app.put('/api/messages/read', (req: Request, res: Response) => {
    const { userId, partnerId } = req.body;
    if (!userId || !partnerId) {
      return res.status(400).json({ error: 'userId e partnerId são obrigatórios.' });
    }

    let count = 0;
    db.messages.forEach((m) => {
      if (m.recipientId === userId && m.senderId === partnerId && !m.read) {
        m.read = true;
        count++;
      }
    });

    if (count > 0) {
      saveDB(db);
    }

    res.json({ markedRead: count });
  });

  // --- API: Notifications ---
  app.get('/api/notifications', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    const userNotifs = db.notifications.filter((n) => n.recipientId === userId);
    res.json(userNotifs);
  });

  app.put('/api/notifications/read', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    db.notifications.forEach((n) => {
      if (n.recipientId === userId) {
        n.read = true;
      }
    });

    saveDB(db);
    res.json({ success: true });
  });

  // --- Vite Dev Server Middleware or Static Build ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KZYRO Community server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
