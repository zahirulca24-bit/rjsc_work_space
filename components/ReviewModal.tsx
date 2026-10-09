import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getWorkReviews, postReviewAction } from '@/lib/api/reviews';
import { useAuth } from '@/lib/auth/AuthProvider';

export function ReviewModal({ work, onClose, onRefresh }: { work: any, onClose: () => void, onRefresh: () => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getWorkReviews(work.id).then(setHistory).finally(() => setLoading(false));
  }, [work.id]);

  const status = work.review_status || 'DRAFT';
  const role = user?.role;

  const handleAction = async (action: string) => {
    if ((action === 'RETURN_BY_SENIOR' || action === 'RETURN_BY_MANAGER') && !comment.trim()) {
      alert('Comment is mandatory for returning.');
      return;
    }
    setActionLoading(true);
    try {
      await postReviewAction(work.id, { action, comment });
      onRefresh();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Failed to apply action');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Review Work: {work.work_code}</h2>
            <div className="text-sm text-gray-500">Current Status: <span className="font-medium">{status}</span></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-md font-semibold mb-4 text-gray-700">Review History</h3>
          {loading ? <div>Loading...</div> : history.length === 0 ? <div className="text-sm text-gray-500">No review history yet.</div> : (
            <div className="space-y-4">
              {history.map(h => (
                <div key={h.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-gray-800">{h.reviewer_name}</span>
                      <span className="text-xs ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">{h.reviewer_role}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm font-medium text-indigo-600 mb-1">{h.action}</div>
                  {h.comment && <div className="text-sm text-gray-600 bg-white p-2 border rounded">{h.comment}</div>}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 border-t pt-6">
            <h3 className="text-md font-semibold mb-2 text-gray-700">Take Action</h3>
            <textarea 
              className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-shadow mb-4" 
              rows={3} 
              placeholder="Add a comment (mandatory for returning)..." 
              value={comment} 
              onChange={e => setComment(e.target.value)}
            />
            <div className="flex gap-3 flex-wrap">
              {(role === 'JUNIOR' || role === 'ADMIN') && ['DRAFT', 'RETURNED_BY_SENIOR', 'RETURNED_BY_MANAGER'].includes(status) && (
                <button onClick={() => handleAction('SUBMIT_TO_SENIOR')} disabled={actionLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Submit to Senior</button>
              )}
              {(role === 'SENIOR' || role === 'ADMIN' || role === 'MANAGER') && status === 'SUBMITTED_TO_SENIOR' && (
                <>
                  <button onClick={() => handleAction('RETURN_BY_SENIOR')} disabled={actionLoading} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">Return to Junior</button>
                  <button onClick={() => handleAction('APPROVE_BY_SENIOR')} disabled={actionLoading} className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg">Approve to Manager</button>
                </>
              )}
              {(role === 'MANAGER' || role === 'ADMIN') && status === 'SUBMITTED_TO_MANAGER' && (
                <>
                  <button onClick={() => handleAction('RETURN_BY_MANAGER')} disabled={actionLoading} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">Return to Junior</button>
                  <button onClick={() => handleAction('FINAL_APPROVE')} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg">Final Approve</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



