import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ArrowDownRight, ArrowUpRight, Users, UserMinus, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
        <div className="p-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.steps.map(s => ({
                name: s.step.replace(/_/g, ' '),
                Users: s.usersReached
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="Users" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
