import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ProductRequest, ProductComment, TabId, RequestStatus } from './types';

function getFingerprint(): string {
  const key = 'wv_desk_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = `fp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, fp);
  }
  return fp;
}

export function useProductDesk() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const fingerprint = getFingerprint();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('product_requests')
        .select('id, title, description, type, app_name, submitter_name, submitter_email, status, votes_count, is_pinned, official_response, screenshot_url, created_at, updated_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (activeTab === 'bugs') query = query.eq('type', 'bug');
      else if (activeTab === 'features') query = query.eq('type', 'feature');
      else if (activeTab === 'top_voted') query = query.order('votes_count', { ascending: false });
      else if (activeTab === 'in_progress') query = query.eq('status', 'in_progress');
      else if (activeTab === 'completed') query = query.eq('status', 'completed');

      if (searchQuery.trim()) {
        const s = `%${searchQuery.trim()}%`;
        query = query.or(`title.ilike.${s},description.ilike.${s}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const ids = (data || []).map((r) => r.id);

      let votedSet = new Set<string>();
      if (ids.length > 0) {
        const { data: voteData } = await supabase
          .from('product_votes')
          .select('request_id')
          .eq('voter_fingerprint', fingerprint)
          .in('request_id', ids);
        votedSet = new Set((voteData || []).map((v: { request_id: string }) => v.request_id));
      }

      let commentCounts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: commentData } = await supabase
          .from('product_comments')
          .select('request_id')
          .in('request_id', ids);
        (commentData || []).forEach((c: { request_id: string }) => {
          commentCounts[c.request_id] = (commentCounts[c.request_id] || 0) + 1;
        });
      }

      setRequests(
        (data || []).map((r) => ({
          ...r,
          user_voted: votedSet.has(r.id),
          comments_count: commentCounts[r.id] || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, fingerprint]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchComments = useCallback(async (requestId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const openRequest = useCallback(
    (req: ProductRequest) => {
      setSelectedRequest(req);
      fetchComments(req.id);
    },
    [fetchComments]
  );

  const closeRequest = useCallback(() => {
    setSelectedRequest(null);
    setComments([]);
  }, []);

  const toggleVote = useCallback(
    async (requestId: string, currentlyVoted: boolean) => {
      const optimistic = requests.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          user_voted: !currentlyVoted,
          votes_count: currentlyVoted ? r.votes_count - 1 : r.votes_count + 1,
        };
      });
      setRequests(optimistic);
      if (selectedRequest?.id === requestId) {
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                user_voted: !currentlyVoted,
                votes_count: currentlyVoted ? prev.votes_count - 1 : prev.votes_count + 1,
              }
            : prev
        );
      }

      try {
        if (currentlyVoted) {
          await supabase
            .from('product_votes')
            .delete()
            .eq('request_id', requestId)
            .eq('voter_fingerprint', fingerprint);
          await supabase
            .from('product_requests')
            .update({ votes_count: optimistic.find((r) => r.id === requestId)!.votes_count })
            .eq('id', requestId);
        } else {
          await supabase.from('product_votes').insert({
            request_id: requestId,
            voter_fingerprint: fingerprint,
          });
          await supabase
            .from('product_requests')
            .update({ votes_count: optimistic.find((r) => r.id === requestId)!.votes_count })
            .eq('id', requestId);
        }
      } catch (err) {
        console.error('Vote error:', err);
        fetchRequests();
      }
    },
    [requests, selectedRequest, fingerprint, fetchRequests]
  );

  const updateStatus = useCallback(
    async (requestId: string, status: RequestStatus) => {
      const { error } = await supabase
        .from('product_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r))
      );
      setSelectedRequest((prev) => (prev?.id === requestId ? { ...prev, status } : prev));
    },
    []
  );

  const addOfficialResponse = useCallback(
    async (requestId: string, message: string, adminName: string) => {
      const { error: reqError } = await supabase
        .from('product_requests')
        .update({ official_response: message })
        .eq('id', requestId);
      if (reqError) throw reqError;

      const { error: commentError } = await supabase.from('product_comments').insert({
        request_id: requestId,
        commenter_name: adminName,
        message,
        is_official: true,
      });
      if (commentError) throw commentError;

      setSelectedRequest((prev) =>
        prev?.id === requestId ? { ...prev, official_response: message } : prev
      );
      await fetchComments(requestId);
    },
    [fetchComments]
  );

  const addComment = useCallback(
    async (requestId: string, name: string, message: string) => {
      const { error } = await supabase.from('product_comments').insert({
        request_id: requestId,
        commenter_name: name,
        message,
        is_official: false,
      });
      if (error) throw error;
      await fetchComments(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r
        )
      );
    },
    [fetchComments]
  );

  const togglePin = useCallback(async (requestId: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('product_requests')
      .update({ is_pinned: !isPinned })
      .eq('id', requestId);
    if (error) throw error;
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, is_pinned: !isPinned } : r))
    );
    setSelectedRequest((prev) =>
      prev?.id === requestId ? { ...prev, is_pinned: !isPinned } : prev
    );
  }, []);

  const deleteRequest = useCallback(
    async (requestId: string) => {
      const { error } = await supabase.from('product_requests').delete().eq('id', requestId);
      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (selectedRequest?.id === requestId) closeRequest();
    },
    [selectedRequest, closeRequest]
  );

  return {
    requests,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedRequest,
    openRequest,
    closeRequest,
    comments,
    commentsLoading,
    toggleVote,
    updateStatus,
    addOfficialResponse,
    addComment,
    togglePin,
    deleteRequest,
    refetch: fetchRequests,
  };
}
