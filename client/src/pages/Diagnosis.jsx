import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Brain, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoadingState } from '../components/ui/Loader';

export default function Diagnosis() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchDiagnosis = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/analyze/diagnosis/latest`);
      setData(res);
    } catch (err) {
      if (err.message.includes('404')) {
        setData(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosis();
  }, [workspaceId]);

  const handleGenerate = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/analyze`, {});
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingState message="Analyzing onboarding behavior..." />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">AI Diagnosis</h2>
        <button
          onClick={handleGenerate}
          disabled={analyzing}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-lg shadow-sm hover:brightness-105 disabled:opacity-70 transition-all"
        >
          <Brain className="mr-2 h-4 w-4" />
          {analyzing ? 'Analyzing onboarding behavior...' : 'Run Analysis'}
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}

      {!data && !analyzing && !error && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Brain className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No diagnosis available</h3>
          <p className="text-slate-500 mt-1">Run analysis to identify the highest-impact onboarding drop-off.</p>
        </div>
      )}

      {analyzing && (
        <div className="p-12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-slate-600 font-medium">Comparing successful vs stuck users...</p>
        </div>
      )}

      {data && !analyzing && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Drop-off detected: {data.rootCause}</h3>
                <p className="text-sm text-slate-500">Confidence: <span className="font-medium text-slate-900">{data.confidence}%</span></p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Explanation</h4>
              <p className="text-slate-700 leading-relaxed">{data.explanation}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Evidence</h4>
              <ul className="space-y-2">
                {data.evidence?.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500 mr-2 shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-500 font-medium">Affected Users</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900 mt-1">{data.affectedUsers}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-500 font-medium">Proposed Fix</p>
                <p className="text-sm text-slate-900 mt-1 font-medium">{data.proposedFix}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
