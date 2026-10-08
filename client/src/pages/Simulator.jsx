import React, { useState } from 'react';
import { api } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { FastForward, RefreshCw, Play } from 'lucide-react';
import { LoadingState } from '../components/ui/Loader';

export default function Simulator() {
  const { workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [config, setConfig] = useState({
    userCount: 400,
    plantedStep: 'connect_data_source',
    plantedDropRate: 0.55,
    noiseLevel: 0.1,
    seed: 42
  });

  const handleRun = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/workspaces/${workspaceId}/simulator/seed`, config);
      setSuccess('Simulation completed successfully. Check the dashboard.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFastForward = async (hours) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/workspaces/${workspaceId}/simulator/advance`, { hours });
      setSuccess(`Time advanced by ${hours} hours. Outcomes updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: isNaN(Number(value)) ? value : Number(value) }));
  };

  if (loading) return <LoadingState message="Running simulation operations..." />;

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-semibold text-slate-900">Simulator Engine</h2>

      {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">{success}</div>}
      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
            <Play className="mr-2 h-5 w-5 text-indigo-600" />
            Initial Population
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User Count</label>
              <input type="number" name="userCount" value={config.userCount} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planted Problem Step</label>
              <select name="plantedStep" value={config.plantedStep} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                <option value="connect_data_source">Connect Data Source</option>
                <option value="invite_teammates">Invite Teammates</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planted Drop Rate (0-1)</label>
              <input type="number" step="0.01" name="plantedDropRate" value={config.plantedDropRate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
            <FastForward className="mr-2 h-5 w-5 text-indigo-600" />
            Time Travel
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Advance simulation time to evaluate interventions and trigger outcome generation.
          </p>
          <div className="space-y-3">
            <button onClick={() => handleFastForward(24)} disabled={loading} className="w-full py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Advance 24 Hours
            </button>
            <button onClick={() => handleFastForward(48)} disabled={loading} className="w-full py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Advance 48 Hours
            </button>
            <button onClick={() => handleFastForward(72)} disabled={loading} className="w-full py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Advance 72 Hours
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
