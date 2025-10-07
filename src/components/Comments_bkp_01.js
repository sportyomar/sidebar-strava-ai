import React, { useState, useEffect } from 'react';
import styles from './Comments.module.css';
import { Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';


function Comments({ documentId, user, isAuthenticated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 'tall' by default for better writing UX; also supports 'short' and 'minimized'
  const [panelSize, setPanelSize] = useState('tall'); // 'tall' | 'short' | 'minimized'

  useEffect(() => {
    if (documentId) loadComments();
  }, [documentId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5002/api/docs/${documentId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:5002/api/docs/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data]);
        setNewComment('');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'Failed to add comment'}`);
      }
    } catch (e) {
      console.error('Error submitting comment:', e);
      alert('Error submitting comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:5002/api/docs/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId));
      else {
        const err = await res.json();
        alert(`Error: ${err.message || 'Failed to delete comment'}`);
      }
    } catch (e) {
      console.error('Error deleting comment:', e);
      alert('Error deleting comment');
    }
  };

  const formatDate = (s) => {
    const d = new Date(s), now = new Date();
    const diffMs = now - d, diffH = diffMs / 36e5, diffD = diffH / 24;
    if (diffMs < 60e3) return `${Math.floor(diffMs/1e3)}s ago`;
    if (diffMs < 36e5) return `${Math.floor(diffMs/6e4)}m ago`;
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    if (diffD < 7) return `${Math.floor(diffD)}d ago`;
    return d.toLocaleDateString();
  };

  if (!documentId) return null;

  const cycleSize = () => {
    setPanelSize(s => (s === 'tall' ? 'short' : 'tall'));
  };

  const toggleMinimize = () => {
    setPanelSize(s => (s === 'minimized' ? 'tall' : 'minimized'));
  };

  return (
    <div className={`${styles.commentsContainer} ${styles[panelSize]}`}>
      <div className={styles.commentsHeader}>
        <h3>Comments ({comments.length})</h3>
        <div className={styles.headerActions}>
          {/* shrink/grow button */}
          <button
            className={styles.toggleButton}
            onClick={cycleSize}
            title={panelSize === 'tall' ? 'Make smaller' : 'Make taller'}
            aria-label={panelSize === 'tall' ? 'Make smaller' : 'Make taller'}
          >
            {panelSize === 'tall' ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
          </button>

          {/* minimize to header-only */}
          <button
            className={styles.minimizeButton}
            onClick={toggleMinimize}
            title={panelSize === 'minimized' ? 'Expand' : 'Minimize'}
            aria-label={panelSize === 'minimized' ? 'Expand' : 'Minimize'}
          >
            {panelSize === 'minimized' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>
      </div>

      {panelSize !== 'minimized' && (
        <div className={styles.commentsContent}>
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className={styles.commentForm}>
              <div className={styles.userInfo}>
                {user?.avatar && <img src={user.avatar} alt="Your avatar" className={styles.userAvatar} />}
                <span className={styles.userName}>{user?.display_name || user?.username || 'You'}</span>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className={styles.commentInput}
                rows={3}
                disabled={isSubmitting}
              />
              <div className={styles.formActions}>
                <button type="submit" disabled={!newComment.trim() || isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.loginPrompt}><p>Please log in to add comments.</p></div>
          )}

          <div className={styles.commentsList}>
            {isLoading ? (
              <p className={styles.loading}>Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className={styles.noComments}>No comments yet. Be the first to comment!</p>
            ) : (
              [...comments]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // newest first
                .map((comment) => (
                  <div key={comment.id} className={styles.comment}>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentAuthor}>
                        {comment.author_avatar && (
                          <img
                            src={comment.author_avatar}
                            alt={`${comment.author_name}'s avatar`}
                            className={styles.commentAvatar}
                          />
                        )}
                        <span className={styles.commentAuthorName}>
                          {comment.author_name}
                        </span>
                        <span className={styles.commentDate}>
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      {user && user.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className={styles.deleteButton}
                          title="Delete comment"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className={styles.commentContent}>{comment.content}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Comments;
