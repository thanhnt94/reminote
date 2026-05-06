import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, TestTube, Bot, Clock, Eye, EyeOff, Zap } from 'lucide-react'
import api from '@/api/client'

export default function AdminSettings() {
  const qc = useQueryClient()
  const [testResult, setTestResult] = useState<any>(null)
  const [webhookResult, setWebhookResult] = useState<any>(null)
  const [showToken, setShowToken] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get('/api/admin/settings')).data as any[],
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/api/admin/settings/${key}`, { value })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  const testBot = useMutation({
    mutationFn: async () => (await api.post('/api/admin/bot/test')).data,
    onSuccess: (data) => setTestResult(data),
  })

  const setupWebhook = useMutation({
    mutationFn: async () => (await api.post('/api/admin/bot/setup-webhook')).data,
    onSuccess: (data) => setWebhookResult(data),
  })

  const getValue = (key: string) => settings?.find((s: any) => s.key === key)?.value || ''

  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const getEditValue = (key: string) => editValues[key] ?? getValue(key)
  const setEditValue = (key: string, value: string) => setEditValues((prev) => ({ ...prev, [key]: value }))

  const botSettings = settings?.filter((s: any) => s.category === 'bot') || []
  const schedulerSettings = settings?.filter((s: any) => s.category === 'scheduler') || []

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Telegram Bot */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Bot className="w-5 h-5 text-blue-400" /> Telegram Bot
        </h2>
        <div className="space-y-4">
          {botSettings.map((s: any) => (
            <div key={s.key}>
              <label className="block text-sm text-slate-400 mb-1">{s.description}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={s.key === 'TELEGRAM_BOT_TOKEN' && !showToken ? 'password' : 'text'}
                    value={getEditValue(s.key)}
                    onChange={(e) => setEditValue(s.key, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition pr-10"
                    placeholder={s.key}
                  />
                  {s.key === 'TELEGRAM_BOT_TOKEN' && (
                    <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition text-sm"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => testBot.mutate()}
              disabled={testBot.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-sm font-medium"
            >
              <TestTube className="w-4 h-4" />
              {testBot.isPending ? 'Testing...' : 'Test Bot Connection'}
            </button>

            <button
              onClick={() => setupWebhook.mutate()}
              disabled={setupWebhook.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              {setupWebhook.isPending ? 'Setting up...' : 'Setup Webhook'}
            </button>
          </div>

          {(testResult || webhookResult) && (
            <div className={`p-3 rounded-lg text-sm ${
              (testResult?.success || webhookResult?.success) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {testResult && (testResult.success ? `✓ Connected: @${testResult.bot_username}` : `✗ Bot Error: ${testResult.error}`)}
              {testResult && webhookResult && <div className="my-1 border-t border-white/5" />}
              {webhookResult && (webhookResult.success ? `✓ Webhook Set Successfully!` : `✗ Webhook Error: ${webhookResult.error || 'Check URL'}`)}
            </div>
          )}
        </div>
      </div>

      {/* Scheduler */}
      <div className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Clock className="w-5 h-5 text-amber-400" /> Scheduler
        </h2>
        <div className="space-y-4">
          {schedulerSettings.map((s: any) => (
            <div key={s.key}>
              <label className="block text-sm text-slate-400 mb-1">{s.description}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getEditValue(s.key)}
                  onChange={(e) => setEditValue(s.key, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition"
                />
                <button
                  onClick={() => updateMutation.mutate({ key: s.key, value: getEditValue(s.key) })}
                  className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition text-sm"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
