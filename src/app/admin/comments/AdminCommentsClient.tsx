"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  status: string;
  created_at: string;
  post_title?: string;
  user_name?: string;
  user_email?: string;
};

export default function AdminCommentsClient() {
  const { lang } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "spam">("all");

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/admin/comments");
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("[PetPaw] Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (commentId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status } : c))
        );
      }
    } catch (error) {
      console.error("[PetPaw] Error updating comment:", error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm(lang === "el" ? "Διαγραφή σχολίου;" : "Delete comment?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error("[PetPaw] Error deleting comment:", error);
    }
  };

  const filteredComments = comments.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; label: string; labelEl: string }> = {
      pending: { bg: "bg-yellow-100 text-yellow-800", label: "Pending", labelEl: "Εκκρεμεί" },
      approved: { bg: "bg-green-100 text-green-800", label: "Approved", labelEl: "Εγκρίθηκε" },
      spam: { bg: "bg-red-100 text-red-800", label: "Spam", labelEl: "Spam" },
      deleted: { bg: "bg-gray-100 text-gray-800", label: "Deleted", labelEl: "Διαγράφηκε" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.bg}`}>
        {lang === "el" ? config.labelEl : config.label}
      </span>
    );
  };

  const statusCounts = {
    all: comments.length,
    pending: comments.filter((c) => c.status === "pending").length,
    approved: comments.filter((c) => c.status === "approved").length,
    spam: comments.filter((c) => c.status === "spam").length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {lang === "el" ? "Διαχείριση Σχολίων" : "Comment Management"}
          </h1>
          <p className="text-foreground-muted">
            {lang === "el"
              ? "Έλεγχος και διαχείριση σχολίων άρθρων"
              : "Review and manage blog comments"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "spam"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? lang === "el"
                ? "Όλα"
                : "All"
              : f === "pending"
              ? lang === "el"
                ? "Εκκρεμή"
                : "Pending"
              : f === "approved"
              ? lang === "el"
                ? "Εγκεκριμένα"
                : "Approved"
              : "Spam"}
            <span className="ml-1.5 rounded-full bg-card/20 px-1.5 text-xs">
              {statusCounts[f]}
            </span>
          </Button>
        ))}
      </div>

      {/* Comments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {lang === "el" ? "Σχόλια" : "Comments"}
          </CardTitle>
          <CardDescription>
            {filteredComments.length}{" "}
            {lang === "el" ? "σχόλια" : "comments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-soft border-t-transparent" />
            </div>
          ) : filteredComments.length === 0 ? (
            <p className="text-center text-foreground-subtle py-8">
              {lang === "el" ? "Δεν υπάρχουν σχόλια" : "No comments found"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-border p-4 transition-colors duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-medium text-foreground">
                          {comment.user_name || comment.user_email || "User"}
                        </span>
                        {getStatusBadge(comment.status)}
                        <span className="text-xs text-foreground-subtle">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-muted whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      {comment.post_title && (
                        <p className="mt-2 text-xs text-foreground-subtle">
                          {lang === "el" ? "Άρθρο:" : "Post:"}{" "}
                          <span className="font-medium">{comment.post_title}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {comment.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatus(comment.id, "approved")}
                          title={lang === "el" ? "Έγκριση" : "Approve"}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {comment.status !== "spam" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatus(comment.id, "spam")}
                          title={lang === "el" ? "Spam" : "Mark as Spam"}
                        >
                          <X className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteComment(comment.id)}
                        title={lang === "el" ? "Διαγραφή" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
