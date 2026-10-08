import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Send, Check, X, Edit, Layers } from 'lucide-react';
import { LoadingState } from '../components/ui/Loader';

export default function Interventions() {
  const { workspaceId } = useWorkspace();
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '' });
  const [viewingEmail, setViewingEmail] = useState(null);

  const fetchInterventions = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/interventions`);
      setInterventions(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [workspaceId]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/workspaces/${workspaceId}/interventions/${id}/approve`, {});
      fetchInterventions();
    } catch (err) {
      alert('Error approving: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/workspaces/${workspaceId}/interventions/${id}/reject`, {});
      fetchInterventions();
    } catch (err) {
      alert('Error rejecting: ' + err.message);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post(`/workspaces/${workspaceId}/interventions/bulk-approve`, { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchInterventions();
    } catch (err) {
      alert('Error bulk approving: ' + err.message);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const startEdit = (inv) => {
    setEditingId(inv.id);
    setEditForm({ subject: inv.subject, body: inv.body });
  };

  const saveEdit = async () => {
    try {
      await api.patch(`/workspaces/${workspaceId}/interventions/${editingId}`, editForm);
      setEditingId(null);
      fetchInterventions();
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Autonomous Action Audit</h2>
          <p className="text-sm text-slate-500 mt-1">Review AI decisions and automatically sent interventions.</p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkApprove}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors border border-slate-300"
            title="Manual Fallback"
          >
            <Check className="mr-2 h-4 w-4" />
            Manual Approve ({selectedIds.size})
          </button>
        )}
      </div>

      {interventions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <Layers className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No autonomous actions recorded yet.</h3>
          <p className="text-slate-500 mt-1">Advance time in the simulator to trigger autonomous recovery.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(interventions.filter(i => i.status === 'drafted').map(i => i.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    checked={selectedIds.size > 0 && selectedIds.size === interventions.filter(i => i.status === 'drafted').length}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject & Body</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {interventions.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      disabled={inv.status !== 'drafted'}
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {inv.endUserId}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-md">
                    {editingId === inv.id ? (
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          value={editForm.subject} 
                          onChange={e => setEditForm({...editForm, subject: e.target.value})}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-slate-900" 
                        />
                        <textarea 
                          value={editForm.body} 
                          onChange={e => setEditForm({...editForm, body: e.target.value})}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-slate-900 text-sm h-20" 
                        />
                        <div className="flex space-x-2">
                          <button onClick={saveEdit} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-900">{inv.subject}</p>
                        <p className="truncate">{inv.body}</p>
                        {inv.editedByUser && <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Edited</span>}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      inv.status === 'drafted' || inv.status === 'validated' ? 'bg-slate-100 text-slate-800' :
                      inv.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      inv.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'simulated' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => setViewingEmail(inv)} className="text-indigo-600 hover:text-indigo-900 mr-2" title="View Email">
                      View Email
                    </button>
                    {inv.status === 'drafted' && !editingId && (
                      <>
                        <button onClick={() => startEdit(inv)} className="text-slate-400 hover:text-slate-600" title="Edit">
                          <Edit className="h-4 w-4 inline" />
                        </button>
                        <button onClick={() => handleApprove(inv.id)} className="text-emerald-500 hover:text-emerald-700" title="Approve">
                          <Check className="h-4 w-4 inline" />
                        </button>
                        <button onClick={() => handleReject(inv.id)} className="text-red-500 hover:text-red-700" title="Reject">
                          <X className="h-4 w-4 inline" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingEmail && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Email Preview</h3>
              <button onClick={() => setViewingEmail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {viewingEmail.status === 'simulated' && (
                <div className="bg-purple-50 text-purple-700 p-3 rounded-lg text-sm font-medium border border-purple-100 flex items-center">
                  <Layers className="h-4 w-4 mr-2" /> SIMULATED — NOT DELIVERED
                </div>
              )}
              {viewingEmail.status === 'sent' && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium border border-emerald-100 flex items-center">
                  <Send className="h-4 w-4 mr-2" /> TEST EMAIL — DELIVERED TO DEMO INBOX
                </div>
              )}
              
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">To</label>
                <div className="mt-1 text-sm text-slate-900">{viewingEmail.endUserId}</div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase">Subject</label>
                <div className="mt-1 text-sm font-medium text-slate-900">{viewingEmail.subject}</div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{viewingEmail.body}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Stalled Step</label>
                  <div className="mt-1 text-sm text-slate-900">{viewingEmail.stalledStep?.replace(/_/g, ' ') || 'Unknown'}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Status</label>
                  <div className="mt-1 text-sm capitalize text-slate-900">{viewingEmail.status}</div>
                </div>
              </div>
              
              {viewingEmail.reason && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Reason</label>
                  <div className="mt-1 text-sm text-slate-700">{viewingEmail.reason}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setViewingEmail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
