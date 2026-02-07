"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AuthUser = {
  id: string;
};

type CommentProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile: CommentProfile | null;
};

type Props = {
  postId: string;
};

function formatRelativeTime(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return lang === "el" ? "μόλις τώρα" : "just now";
  }
  if (diffMins < 60) {
    return lang === "el" 
      ? `πριν ${diffMins} λεπτ${diffMins === 1 ? "ό" : "ά"}`
      : `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 24) {
    return lang === "el"
      ? `πριν ${diffHours} ώρ${diffHours === 1 ? "α" : "ες"}`
      : `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 7) {
    return lang === "el"
      ? `πριν ${diffDays} ημέρ${diffDays === 1 ? "α" : "ες"}`
      : `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  
  return date.toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UserAvatar({ profile, size = "md" }: { profile: CommentProfile | null; size?: "sm" | "md" }) {
  const name = profile?.name || "User";
  const avatarUrl = profile?.avatar_url;
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`flex ${sizeClass} items-center justify-center rounded-full bg-navy-soft text-white font-semibold`}>
      {initial}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  lang,
  onEdit,
  onDelete,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  currentUserId: string | null;
  lang: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onReply: (comment: Comment) => void;
  isReply?: boolean;
}) {
  const isOwner = currentUserId === comment.user_id;
  const userName = comment.profile?.name || (lang === "el" ? "Χρήστης" : "User");

  return (
    <div className={`flex gap-3 py-4 ${isReply ? "ml-12 border-l-2 border-border pl-4" : ""}`}>
      <div className="flex-shrink-0">
        <UserAvatar profile={comment.profile} size={isReply ? "sm" : "md"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-foreground ${isReply ? "text-sm" : ""}`}>{userName}</span>
          <span className={`text-foreground-muted ${isReply ? "text-xs" : "text-sm"}`}>
            {formatRelativeTime(comment.created_at, lang)}
          </span>
          {comment.created_at !== comment.updated_at && (
            <span className="text-xs text-foreground-subtle italic">
              ({lang === "el" ? "επεξεργασμένο" : "edited"})
            </span>
          )}
        </div>
        <p className={`mt-1 text-foreground whitespace-pre-wrap break-words ${isReply ? "text-sm" : ""}`}>
          {comment.content}
        </p>
        <div className="mt-2 flex gap-3">
          {currentUserId && !isReply && (
            <button
              onClick={() => onReply(comment)}
              className="text-sm text-navy-soft hover:opacity-80 transition-colors duration-300"
            >
              {lang === "el" ? "Απάντηση" : "Reply"}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => onEdit(comment)}
                className="text-sm text-navy-soft hover:opacity-80 transition-colors duration-300"
              >
                {lang === "el" ? "Επεξεργασία" : "Edit"}
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                {lang === "el" ? "Διαγραφή" : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentForm({
  lang,
  editingComment,
  replyingTo,
  onSubmit,
  onCancel,
  placeholder,
}: {
  lang: string;
  editingComment: Comment | null;
  replyingTo: Comment | null;
  onSubmit: (content: string, commentId?: string, parentId?: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [content, setContent] = useState(editingComment?.content || "");
  const [submitting, setSubmitting] = useState(false);
  const maxLength = 2000;

  useEffect(() => {
    setContent(editingComment?.content || "");
  }, [editingComment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(content, editingComment?.id, replyingTo?.id);
      if (!editingComment) {
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const defaultPlaceholder = replyingTo
    ? (lang === "el" ? `Απάντηση στον/στην ${replyingTo.profile?.name || "χρήστη"}...` : `Reply to ${replyingTo.profile?.name || "user"}...`)
    : (lang === "el" ? "Γράψτε ένα σχόλιο..." : "Write a comment...");

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {replyingTo && (
        <div className="flex items-center gap-2 text-sm text-foreground-muted bg-background-secondary rounded-lg px-3 py-2 transition-colors duration-300">
          <span>{lang === "el" ? "Απάντηση σε:" : "Replying to:"}</span>
          <span className="font-medium text-foreground">{replyingTo.profile?.name || "User"}</span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto text-navy-soft hover:opacity-80 transition-colors duration-300"
          >
            ✕
          </button>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className="w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-2 focus:ring-border resize-none transition-colors duration-300"
        rows={replyingTo ? 2 : 3}
        maxLength={maxLength}
        disabled={submitting}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-subtle">
          {content.length}/{maxLength}
        </span>
        <div className="flex gap-2">
          {(editingComment || replyingTo) && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-background-secondary transition-colors duration-300 disabled:opacity-50"
            >
              {lang === "el" ? "Ακύρωση" : "Cancel"}
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? (lang === "el" ? "Αποστολή..." : "Posting...")
              : editingComment
                ? (lang === "el" ? "Ενημέρωση" : "Update")
                : replyingTo
                  ? (lang === "el" ? "Απάντηση" : "Reply")
                  : (lang === "el" ? "Δημοσίευση" : "Post")}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentThread({
  comment,
  replies,
  currentUserId,
  lang,
  onEdit,
  onDelete,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  lang: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onReply: (comment: Comment) => void;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        lang={lang}
        onEdit={onEdit}
        onDelete={onDelete}
        onReply={onReply}
      />
      {replies.length > 0 && (
        <div className="pb-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              lang={lang}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogComments({ postId }: Props) {
  const { lang } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<CommentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  // Fetch current user and their profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ? { id: u.id } : null);
      
      if (u) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .eq("id", u.id)
          .single();
        setUserProfile(profile || null);
      }
      
      setAuthLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .eq("id", session.user.id)
          .single();
        setUserProfile(profile || null);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/comments?postId=${postId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch comments");
      }
      
      setComments(data.comments || []);
      setError(null);
    } catch (e) {
      console.error("[PetPaw] Error fetching comments:", e);
      setError(lang === "el" ? "Αποτυχία φόρτωσης σχολίων" : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [postId, lang]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (content: string, commentId?: string, parentId?: string) => {
    try {
      if (commentId) {
        // Update existing comment
        const res = await fetch(`/api/blog/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Failed to update comment");
        }
        
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? data.comment : c))
        );
        setEditingComment(null);
      } else {
        // Create new comment (potentially a reply)
        const res = await fetch("/api/blog/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, content, parentId }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Failed to post comment");
        }
        
        setComments((prev) => [...prev, data.comment]);
        setReplyingTo(null);
      }
    } catch (e) {
      console.error("[PetPaw] Error submitting comment:", e);
      alert(lang === "el" ? "Αποτυχία αποστολής σχολίου" : "Failed to submit comment");
      throw e;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm(
      lang === "el"
        ? "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το σχόλιο;"
        : "Are you sure you want to delete this comment?"
    );
    
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete comment");
      }
      
      // Also remove any replies to this comment
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    } catch (e) {
      console.error("[PetPaw] Error deleting comment:", e);
      alert(lang === "el" ? "Αποτυχία διαγραφής σχολίου" : "Failed to delete comment");
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    const formElement = document.getElementById("comment-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleReplyComment = (comment: Comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
    const formElement = document.getElementById("comment-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCancel = () => {
    setEditingComment(null);
    setReplyingTo(null);
  };

  // Group comments: top-level (parent_id = null) and their replies
  const topLevelComments = comments.filter((c) => c.parent_id === null);
  const repliesMap = new Map<string, Comment[]>();
  comments.forEach((c) => {
    if (c.parent_id) {
      const existing = repliesMap.get(c.parent_id) || [];
      existing.push(c);
      repliesMap.set(c.parent_id, existing);
    }
  });

  // Sort top-level by date, replies by date
  topLevelComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  repliesMap.forEach((replies) => {
    replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  const totalCount = comments.length;

  return (
    <div className="mt-12 border-t border-border pt-8">
      <h3 className="mb-6 text-xl font-semibold text-foreground">
        {lang === "el" ? "Σχόλια" : "Comments"}
        {totalCount > 0 && (
          <span className="ml-2 text-base font-normal text-foreground-muted">
            ({totalCount})
          </span>
        )}
      </h3>

      {/* Comment Form */}
      <div id="comment-form" className="mb-8">
        {authLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
          </div>
        ) : user ? (
          !userProfile?.name ? (
            <div className="rounded-lg bg-background-secondary border border-border p-4 text-center transition-colors duration-300">
              <p className="text-foreground-muted mb-3">
                {lang === "el" 
                  ? "Παρακαλώ ορίστε ένα όνομα εμφάνισης για να σχολιάσετε."
                  : "Please set a display name to comment."}
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 rounded-lg bg-navy-soft px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors duration-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {lang === "el" ? "Ρυθμίσεις Προφίλ" : "Profile Settings"}
              </Link>
            </div>
          ) : (
            <CommentForm
              lang={lang}
              editingComment={editingComment}
              replyingTo={replyingTo}
              onSubmit={handleSubmitComment}
              onCancel={handleCancel}
            />
          )
        ) : (
          <div className="rounded-lg bg-background-secondary p-4 text-center transition-colors duration-300">
            <p className="text-foreground-muted">
              {lang === "el" ? (
                <>
                  <Link href="/login" className="text-navy-soft hover:underline font-medium transition-colors duration-300">
                    Συνδεθείτε
                  </Link>
                  {" "}για να αφήσετε ένα σχόλιο
                </>
              ) : (
                <>
                  <Link href="/login" className="text-navy-soft hover:underline font-medium transition-colors duration-300">
                    Log in
                  </Link>
                  {" "}to leave a comment
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
          {error}
        </div>
      ) : topLevelComments.length === 0 ? (
        <p className="py-4 text-center text-foreground-subtle">
          {lang === "el"
            ? "Δεν υπάρχουν σχόλια ακόμη. Γίνετε ο πρώτος!"
            : "No comments yet. Be the first!"}
        </p>
      ) : (
        <div>
          {topLevelComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={repliesMap.get(comment.id) || []}
              currentUserId={user?.id || null}
              lang={lang}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onReply={handleReplyComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
