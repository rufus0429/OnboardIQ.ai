import React, { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [config, setConfig] = useState({
    workspaceName: 'Acme Corp',
    stallThresholdHours: 48,
    avgRevenuePerUser: 49,
    sendMode: 'mock',
    defaultTone: 'helpful_expert'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-semibold text-slate-900">Workspace Settings</h2>

      {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">Settings saved successfully.</div>}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div>
            <h3 className="text-lg font-medium text-slate-900 flex items-center mb-4">
              <SettingsIcon className="mr-2 h-5 w-5 text-slate-400" />
              General
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
                <input type="text" name="workspaceName" value={config.workspaceName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stall Threshold (Hours)</label>
                  <input type="number" name="stallThresholdHours" value={config.stallThresholdHours} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Avg Revenue per User ($)</label>
                  <input type="number" name="avgRevenuePerUser" value={config.avgRevenuePerUser} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4">AI Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default AI Tone</label>
                <select name="defaultTone" value={config.defaultTone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="helpful_expert">Helpful Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Send Mode</label>
                <select name="sendMode" value={config.sendMode} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="mock">Mock (Simulator)</option>
                  <option value="live" disabled>Live Email (requires SendGrid)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
