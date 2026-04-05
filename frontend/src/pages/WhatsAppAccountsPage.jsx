import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, Plus, Trash2, Edit3, Save, X, Loader2,
  Phone, ToggleLeft, ToggleRight, Zap, AlertCircle, CheckCircle2,
  RefreshCw, Shield, Settings, BarChart3, QrCode, Wifi,
} from 'lucide-react'
import api from '../services/api'

export default function WhatsAppAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', daily_limit: 100 })
  const [saving, setSaving] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [connecting, setConnecting] = useState(null) // account id being connected
  const [qrPolling, setQrPolling] = useState(null)
  const [connectError, setConnectError] = useState(null)

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
      const { data } = await api.post('/api/whatsapp-accounts', form)
      setShowAdd(false)
      setForm({ name: '', daily_limit: 100 })
      await load()
      // Auto-start QR pairing for the new account
      const newAcc = data.account
      if (newAcc?.id) connectAccount(newAcc.id)
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

  async function connectAccount(accId) {
    if (connecting) return
    setConnecting(accId)
    setQrCode(null)
    setConnectError(null)
    // Use 'main' for the main account, otherwise pass the DB account id
    const accountId = accId === 'main' ? 'main' : accId
    try {
      const { data } = await api.post('/api/outreach/whatsapp/connect', { accountId })
      console.log('[WA Connect] Response:', data)
      if (data.error) {
        setConnectError(data.error)
        setConnecting(null)
        return
      }
      const qr = data.qrCode || data.qr
      if (qr) setQrCode(qr)
      // Poll for status updates for THIS specific account
      const interval = setInterval(async () => {
        try {
          const res = await api.get(`/api/outreach/whatsapp/status?accountId=${accountId}`)
          const s = res.data
          if (s.qrCode) setQrCode(s.qrCode)
          if (s.status === 'connected') {
            clearInterval(interval)
            setConnecting(null)
            setQrCode(null)
            setConnectError(null)
            load()
          }
        } catch {}
      }, 3000)
      setQrPolling(interval)
      setTimeout(() => { clearInterval(interval); setConnecting(null); setQrCode(null) }, 120000)
    } catch (err) {
      console.error('[WA Connect] Error:', err)
      setConnectError(err.response?.data?.error || err.message || 'Error de conexion')
      setConnecting(null)
    }
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
                    {acc.status !== 'connected' && (
                      <button onClick={() => connectAccount(acc.id)} disabled={connecting === acc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                        title="Conectar WhatsApp">
                        {connecting === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        {connecting === acc.id ? 'Escaneando...' : 'Conectar'}
                      </button>
                    )}
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
              {/* QR Code display when connecting this account */}
              {connecting === acc.id && qrCode && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">Escanea el codigo QR</p>
                    <ol className="text-xs text-gray-500 space-y-1">
                      <li>1. Abri WhatsApp en tu telefono</li>
                      <li>2. Toca Menu (...) o Configuracion</li>
                      <li>3. Toca Dispositivos vinculados</li>
                      <li>4. Escanea este codigo QR</li>
                    </ol>
                    <button onClick={() => { if (qrPolling) clearInterval(qrPolling); setConnecting(null); setQrCode(null) }}
                      className="text-xs text-red-500 hover:text-red-700 mt-2">Cancelar</button>
                  </div>
                </div>
              )}
              {connecting === acc.id && !qrCode && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                  <p className="text-sm text-gray-500">Generando codigo QR...</p>
                </div>
              )}
              {!connecting && connectError && (
                <div className="mt-4 pt-4 border-t border-red-100 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-red-600 font-medium">Error al conectar</p>
                    <p className="text-xs text-red-400">{connectError}</p>
                  </div>
                  <button onClick={() => setConnectError(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
                </div>
              )}
            </div>
          )
        })}

        {/* Always show add button */}
        <button onClick={() => { setForm({ name: '', daily_limit: 100 }); setShowAdd(true) }}
          className="w-full flex items-center justify-center gap-3 p-5 bg-green-50 border-2 border-dashed border-green-300 rounded-2xl text-green-700 hover:bg-green-100 hover:border-green-400 transition-all">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-semibold">Agregar Nuevo Numero de WhatsApp</span>
        </button>

        {/* No duplicate rule */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Sin duplicados</p>
            <p className="text-xs text-blue-700 mt-0.5">Cada lead recibe mensaje de UNA sola cuenta. El sistema registra que cuenta contacto a cada lead para no enviar desde otra cuenta al mismo numero.</p>
          </div>
        </div>
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
