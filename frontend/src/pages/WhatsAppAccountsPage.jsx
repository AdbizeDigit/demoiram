import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, Plus, Trash2, Edit3, Save, X, Loader2,
  Phone, ToggleLeft, ToggleRight, Zap, AlertCircle, CheckCircle2,
  RefreshCw, Shield, Settings, BarChart3,
} from 'lucide-react'
import api from '../services/api'

export default function WhatsAppAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', daily_limit: 100 })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/whatsapp-accounts')
      setAccounts(data.accounts || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const iv = setInterval(load, 10000); return () => clearInterval(iv) }, [load])

  async function addAccount() {
    setSaving(true)
    try {
      await api.post('/api/whatsapp-accounts', form)
      setShowAdd(false)
      setForm({ name: '', daily_limit: 100 })
      load()
    } catch {}
    setSaving(false)
  }

  async function updateAccount(id) {
    setSaving(true)
    try {
      await api.put(`/api/whatsapp-accounts/${id}`, form)
      setEditing(null)
      load()
    } catch {}
    setSaving(false)
  }

  async function deleteAccount(id) {
    if (!confirm('Eliminar esta cuenta?')) return
    await api.delete(`/api/whatsapp-accounts/${id}`)
    load()
  }

  async function toggleActive(acc) {
    await api.put(`/api/whatsapp-accounts/${acc.id}`, { ...acc, is_active: !acc.is_active })
    load()
  }

  const totalLimit = accounts.reduce((s, a) => s + (a.is_active ? (a.daily_limit || 0) : 0), 0)
  const totalUsed = accounts.reduce((s, a) => s + (a.messages_today || 0), 0)
  const totalMessages = accounts.reduce((s, a) => s + (a.messages_total || 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" /> Cuentas de WhatsApp
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">Gestiona multiples numeros con cupo diario independiente</p>
        </div>
        <button onClick={() => { setForm({ name: '', daily_limit: 100 }); setShowAdd(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
          <Plus className="w-4 h-4" /> Agregar Numero
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 font-medium">Cuentas Activas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{accounts.filter(a => a.is_active).length}</p>
          <p className="text-[10px] text-gray-400 mt-1">de {accounts.length} totales</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 font-medium">Cupo Diario Total</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalLimit}</p>
          <p className="text-[10px] text-gray-400 mt-1">mensajes/dia combinados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 font-medium">Usados Hoy</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalUsed}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 font-medium">Total Historico</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{totalMessages}</p>
          <p className="text-[10px] text-gray-400 mt-1">mensajes enviados</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Proteccion Anti-Ban</p>
          <p className="text-xs text-amber-700 mt-0.5">Cada cuenta tiene su propio cupo diario. El sistema distribuye mensajes entre las cuentas activas automaticamente, usando la que tenga menos uso. Los contadores se resetean a medianoche.</p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {accounts.map(acc => {
          const pct = acc.daily_limit > 0 ? Math.min(100, (acc.messages_today / acc.daily_limit) * 100) : 0
          const isEditing = editing === acc.id

          return (
            <div key={acc.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${
              acc.is_active ? 'border-green-200' : 'border-gray-100 opacity-60'
            }`}>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                      <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Cupo Diario</label>
                      <input type="number" value={form.daily_limit} onChange={e => setForm(p => ({ ...p, daily_limit: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateAccount(acc.id)} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                    </button>
                    <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${acc.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Phone className={`w-5 h-5 ${acc.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                      {acc.phone && <span className="text-xs text-gray-400">{acc.phone}</span>}
                      {acc.isMain && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Conexion Actual</span>}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        acc.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{acc.status === 'connected' ? 'Conectado' : acc.status || 'Desconectado'}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-20 text-right">
                        {acc.messages_today || 0} / {acc.daily_limit || 100}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{acc.messages_total || 0} mensajes historicos</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(acc)}
                      className={`p-2 rounded-lg transition-colors ${acc.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={acc.is_active ? 'Desactivar' : 'Activar'}>
                      {acc.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { setEditing(acc.id); setForm({ name: acc.name, daily_limit: acc.daily_limit || 100 }) }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                    {!acc.isMain && (
                      <button onClick={() => deleteAccount(acc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {accounts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Phone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No hay cuentas de WhatsApp configuradas</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">Agregar primera cuenta</button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-600" /> Agregar Numero</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-700">Cada numero tiene su propio cupo diario. El sistema distribuye automaticamente los mensajes entre las cuentas activas para evitar bans.</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre identificador</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: WhatsApp Ventas, WhatsApp Soporte..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cupo diario de mensajes</label>
                <div className="flex gap-2">
                  {[30, 50, 75, 100].map(n => (
                    <button key={n} onClick={() => setForm(p => ({ ...p, daily_limit: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${form.daily_limit === n ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <input type="number" value={form.daily_limit} onChange={e => setForm(p => ({ ...p, daily_limit: parseInt(e.target.value) || 0 }))}
                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={addAccount} disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
