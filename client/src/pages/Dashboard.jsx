import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ArrowDownRight, ArrowUpRight, Users, UserMinus, Activity } from 'lucide-react';
import { LoadingState } from '../components/ui/Loader';

export default function Dashboard() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [funnelRes, stuckRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/funnel`),
          api.get(`/workspaces/${workspaceId}/stuck-users`)
        ]);
        
        const totalStuck = stuckRes.reduce((acc, step) => acc + step.stuckUserCount, 0);

        setData({
          totalUsers: funnelRes.totalUsers,
          stuckUsers: totalStuck,
          worstDropOff: funnelRes.worstDropOff,
          steps: funnelRes.steps
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId]);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  if (!data || data.totalUsers === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200">
        <Activity className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No data available</h3>
        <p className="text-slate-500 mt-1">Run the simulator to generate onboarding activity.</p>
      </div>
    );
  }

  const cards = [
    { name: 'Total Users', value: data.totalUsers, icon: Users, change: '+12%', changeType: 'positive' },
    { name: 'Stuck Users', value: data.stuckUsers, icon: UserMinus, change: '-2%', changeType: 'positive' },
    { name: 'Worst Drop-off', value: data.worstDropOff ? data.worstDropOff.replace(/_/g, ' ') : 'None', icon: Activity, change: '', changeType: 'neutral' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Overview</h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 truncate">{card.name}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{card.value}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <card.icon className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">Funnel Conversion</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data.steps?.map((step, index) => {
              const prevCount = index === 0 ? data.totalUsers : data.steps[index-1].usersReached;
              const dropRate = prevCount > 0 ? ((prevCount - step.usersReached) / prevCount * 100).toFixed(1) : 0;
              const width = Math.max(5, (step.usersReached / data.totalUsers) * 100);
              
              return (
                <div key={step.step}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{step.step.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 tabular-nums">{step.usersReached} users</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 flex items-center">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${width}%` }}></div>
                  </div>
                  {index > 0 && (
                    <div className="text-xs text-red-500 mt-1 tabular-nums">
                      {dropRate}% drop-off from previous step
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
