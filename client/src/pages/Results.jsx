import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useToast } from '../contexts/ToastContext';
import { BarChart3, TrendingUp, DollarSign, Brain } from 'lucide-react';
import { LoadingState } from '../components/ui/Loader';

export default function Results() {
  const { workspaceId } = useWorkspace();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, latestSummaryRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/metrics`),
          api.get(`/workspaces/${workspaceId}/outcomes/latest-summary`).catch(() => null)
        ]);
        setData(metricsRes || null);
        if (latestSummaryRes) setSummary(latestSummaryRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId]);

  const handleGenerateSummary = async () => {
    setSummarizing(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/outcomes/summarize`, {});
      setSummary(res);
      addToast('Summary generated successfully', 'success');
    } catch (err) {
      addToast('Error generating summary: ' + err.message);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  if (!data) return null;

  const totalNudges = data.nudgesSent || 0;
  const recoveredUsers = data.recoveredUsers || 0;
  const estRevenue = data.estimatedRevenueRecovered || 0;
  const control = data.controlGroup || {
    nudged: { recovered: 0, total: 0, rate: 0 },
    unnudged: { recovered: 0, total: 0, rate: 0 }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Recovery Outcomes</h2>
          <p className="text-sm text-slate-500 mt-1">Users recovered after autonomous intervention.</p>
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={summarizing || totalNudges === 0}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-lg shadow-sm hover:brightness-105 disabled:opacity-70 transition-all"
        >
          <Brain className="mr-2 h-4 w-4" />
          {summarizing ? 'Summarizing...' : 'Generate AI Summary'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {[
          { name: 'Nudges Sent', value: totalNudges, icon: BarChart3 },
          { name: 'Recovered Users', value: control.nudged.recovered, icon: TrendingUp },
          { name: 'Recovery Rate', value: `${control.nudged.rate}%`, icon: TrendingUp },
          { name: 'Est. Revenue', value: `$${estRevenue.toLocaleString()}`, icon: DollarSign },
        ].map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <stat.icon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
          <Brain className="mr-2 h-4 w-4 text-indigo-600" /> SIMULATED EXPERIMENTAL OUTCOME
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
            <p className="text-sm text-indigo-800 font-semibold mb-2">Nudged</p>
            <p className="text-3xl font-bold text-indigo-900 tabular-nums">
              {control.nudged.recovered} / {control.nudged.total} <span className="text-lg font-medium text-indigo-700 ml-2">recovered</span>
            </p>
            <p className="text-sm text-indigo-700 mt-2 font-medium">{control.nudged.rate}% recovery rate</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 font-semibold mb-2">Un-nudged (Control)</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {control.unnudged.recovered} / {control.unnudged.total} <span className="text-lg font-medium text-slate-500 ml-2">recovered</span>
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium">{control.unnudged.rate}% baseline recovery rate</p>
          </div>
        </div>
      </div>

      {summarizing && <LoadingState message="Analyzing recovery outcomes..." />}

      {summary && !summarizing && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
              <Brain className="h-5 w-5 text-indigo-600 mr-2" />
              AI Outcome Summary
            </h3>
            <p className="text-lg font-medium text-indigo-900 mb-6">{summary.headline}</p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">What Worked</h4>
                <ul className="space-y-2">
                  {summary.whatWorked?.map((item, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start">
                      <span className="text-emerald-500 mr-2">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-3">What Did Not Work</h4>
                <ul className="space-y-2">
                  {summary.whatDidNot?.map((item, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start">
                      <span className="text-red-500 mr-2">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-indigo-800 uppercase tracking-wider mb-3">Recommended Next Actions</h4>
              <ul className="space-y-2">
                {summary.nextActions?.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start">
                    <span className="text-indigo-500 mr-2">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {totalNudges === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No recovery outcomes yet.</h3>
          <p className="text-slate-500 mt-1">Approve nudges and fast-forward time to see results.</p>
        </div>
      )}
    </div>
  );
}
