import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Image as ImageIcon, Mic, Smile, Send, Trash2 } from 'lucide-react';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import type { Task, TaskComment } from '@/types';
import { format } from 'date-fns';

interface TaskCommentsPanelProps {
  task: Task;
  onTaskUpdate?: (updated: Task) => void;
  onCountChange?: (count: number) => void;
}

type Attachment = { id: string; name: string; type: 'file' | 'image' | 'audio'; url?: string };

const revokeAttachmentPreview = (attachment: Attachment) => {
  if (attachment.url) {
    URL.revokeObjectURL(attachment.url);
  }
};

export function TaskCommentsPanel({ task, onTaskUpdate, onCountChange }: TaskCommentsPanelProps) {
  const users = useUsers();
  const { user: authUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<TaskComment[]>(task.comments ?? []);
  const [submitting, setSubmitting] = useState(false);
  const attachmentsRef = useRef<Attachment[]>([]);

  // Sync when task.comments changes externally
  useEffect(() => {
    setComments(task.comments ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.comments?.length]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  useEffect(() => {
    onCountChange?.(comments.length);
  }, [comments.length, onCountChange]);

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text || submitting) return;

    const fallback = users[0];
    const authorId = authUser?.id ?? fallback?.id ?? 'unknown';
    const authorName = authUser?.name ?? fallback?.name ?? 'Kullanıcı';
    const authorInitials = authUser?.initials ?? fallback?.initials ?? '?';
    const authorColor = authUser?.color ?? fallback?.color ?? '#6161FF';

    setSubmitting(true);
    try {
      const updated = await api.addTaskComment(task.id, {
        authorId,
        authorName,
        authorInitials,
        authorColor,
        text,
      });
      setComments(updated.comments ?? []);
      onTaskUpdate?.(updated);
    } catch {
      // optimistic fallback
      const optimistic: TaskComment = {
        id: `local-${Date.now()}`,
        authorId,
        authorName,
        authorInitials,
        authorColor,
        text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
    } finally {
      setSubmitting(false);
    }

    setNewComment('');
    setAttachments((prev) => {
      prev.forEach(revokeAttachmentPreview);
      return [];
    });
    setShowEmojiPicker(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      const updated = await api.deleteTaskComment(task.id, commentId);
      setComments(updated.comments ?? []);
      onTaskUpdate?.(updated);
    } catch {
      setComments(task.comments ?? []);
    }
  };

  const handleFilesSelected = (files: FileList | null, kind: 'file' | 'image' | 'audio') => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      id: `${task.id}-${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      type: kind,
      url: kind === 'image' ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const emojis = ['😀', '😂', '😍', '👍', '🔥', '✅', '🎯', '✨', '🤝', '📝', '⏱️', '📌'];

  const getMentionQuery = (text: string) => {
    const atIndex = text.lastIndexOf('@');
    if (atIndex === -1) return '';
    const afterAt = text.slice(atIndex + 1);
    if (afterAt.includes(' ')) return '';
    return afterAt;
  };

  const mentionQuery = getMentionQuery(newComment);
  const mentionOptions = mentionQuery
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const handleSelectMention = (name: string) => {
    const atIndex = newComment.lastIndexOf('@');
    if (atIndex === -1) return;
    const before = newComment.slice(0, atIndex);
    setNewComment(`${before}@${name} `);
  };

  const handleRemoveAttachment = (attachment: Attachment) => {
    revokeAttachmentPreview(attachment);
    setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
  };

  const currentUserId = authUser?.id ?? users[0]?.id;

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Henüz yorum yok.</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 group">
              <Avatar
                className="w-7 h-7 border-2 border-white shrink-0"
                style={{ backgroundColor: comment.authorColor }}
              >
                <AvatarFallback className="text-[10px] font-medium text-white">
                  {comment.authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900">{comment.authorName}</div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(comment.createdAt), 'HH:mm')}
                  </div>
                  {comment.authorId === currentUserId && (
                    <button
                      type="button"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      onClick={() => void handleDeleteComment(comment.id)}
                      title="Yorumu sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1">
                  {comment.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {attachments.length > 0 && (
        <div className="shrink-0">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="h-3 w-3 text-[#6161FF]" />
                ) : att.type === 'audio' ? (
                  <Mic className="h-3 w-3 text-[#6161FF]" />
                ) : (
                  <FileText className="h-3 w-3 text-[#6161FF]" />
                )}
                <span className="max-w-[140px] truncate">{att.name}</span>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => handleRemoveAttachment(att)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto shrink-0 pt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="outline" className="shrink-0 sm:self-end">
              <FileText className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-gray-100">
                <FileText className="h-4 w-4 text-[#6161FF]" />
                Dosya
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'file')}
                />
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-gray-100">
                <ImageIcon className="h-4 w-4 text-[#6161FF]" />
                Fotoğraf
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'image')}
                />
              </label>
            </div>
          </PopoverContent>
        </Popover>

        <div className="relative min-w-0 flex-1">
          <Textarea
            placeholder="Yorum yaz..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleAddComment();
              }
            }}
            rows={2}
            className="min-h-[72px] resize-y"
          />
          {mentionOptions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full border border-gray-200 rounded-lg bg-white shadow-sm">
              {mentionOptions.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  onClick={() => handleSelectMention(user.name)}
                >
                  <Avatar
                    className="w-6 h-6 border-2 border-white"
                    style={{ backgroundColor: user.color }}
                  >
                    <AvatarFallback className="text-[10px] font-medium text-white">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">{user.name}</div>
                    {user.title && (
                      <div className="text-xs text-gray-500 truncate">{user.title}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:self-end">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="shrink-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="shrink-0">
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="bg-[#6161FF] hover:bg-[#5050E0] shrink-0"
            onClick={() => void handleAddComment()}
            disabled={!newComment.trim() || submitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showEmojiPicker && (
        <div className="shrink-0 grid grid-cols-6 gap-2 rounded-lg border border-gray-200 bg-white p-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-lg hover:scale-110 transition-transform"
              onClick={() => setNewComment((prev) => `${prev}${emoji}`)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
