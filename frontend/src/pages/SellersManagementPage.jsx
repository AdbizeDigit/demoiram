import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Loader2, X, Trophy, Mail, Phone, MessageCircle,
  TrendingUp, Power, Key, RefreshCw, Crown, DollarSign
} from 'lucide-react'
import api from '../services/api'

function formatCurrency(val) {
  if (!val || val === 0) return '$0'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${Number(val).toLocaleString('es-AR')}`
}

export default function SellersManagementPage() {
  const [sellers, setSellers] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([
        api.get('/api/seller/admin/sellers'),
        api.get('/api/seller/admin/sellers/ranking'),
      ])
      setSellers(s.data?.sellers || [])
      setRanking(r.data?.ranking || [])
    } catch (err) {
      console.error('Error cargando vendedores:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function createSeller() {
    setCreating(true)
    setError(null)
    try {
      await api.post('/api/seller/admin/sellers', form)
      setForm({ name: '', email: '', password: '' })
      setShowCreate(false)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al crear')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(seller) {
    try {
      await api.patch(`/api/seller/admin/sellers/${seller.id}`, { active: !seller.active })
      await load()
    } catch (err) {
      alert('Error al actualizar')
    }
  }

  async function resetPassword(seller) {
    const pw = prompt(`Nueva contraseña para ${seller.name} (mín 6 caracteres):`)
    if (!pw || pw.length < 6) return
    try {
      await api.post(`/api/seller/admin/sellers/${seller.id}/reset-password`, { password: pw })
      alert('Contraseña actualizada')
    } catch (err) {
      alert(err?.response?.data?.message || 'Error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Vendedores
          </h1>
          <p className="text-sm text-gray-500 mt-1">Crear, gestionar y comparar el rendimiento del equipo de ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 ring-1 ring-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nuevo vendedor
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-blue-50/60 ring-1 ring-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-900">Crear nuevo vendedor</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-blue-100 rounded">
              <X className="w-4 h-4 text-blue-700" />
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Contraseña inicial</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="mín 6 caracteres"
                className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end mt-3 gap-2">
            <button onClick={() => setShowCreate(false)} className="text-xs ring-1 ring-gray-300 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={createSeller} disabled={creating || !form.name || !form.email || form.password.length < 6}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
              {creating && <Loader2 className="w-3 h-3 animate-spin" />}
              Crear vendedor
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <>
          {/* Ranking */}
          {ranking.length > 0 && (
            <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-800">Ranking de vendedores</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left font-semibold py-2">Vendedor</th>
                      <th className="text-right font-semibold py-2">Ganados</th>
                      <th className="text-right font-semibold py-2">Pipeline</th>
                      <th className="text-right font-semibold py-2">Contactos 30d</th>
                      <th className="text-right font-semibold py-2">Respuestas 30d</th>
                      <th className="text-right font-semibold py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 flex items-center gap-2">
                          {i === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                            <p className="text-[10px] text-gray-500">{r.email}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 font-bold text-emerald-700">{r.won}</td>
                        <td className="text-right py-3 text-gray-700">{r.active_pipeline}</td>
                        <td className="text-right py-3 text-blue-700 font-semibold">{r.contacts_30d}</td>
                        <td className="text-right py-3 text-amber-700 font-semibold">{r.replies_30d}</td>
                        <td className="text-right py-3 font-bold text-emerald-700">{formatCurrency(r.won_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lista detallada */}
          {sellers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Todavía no creaste ningún vendedor.</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" /> Crear el primero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellers.map(s => (
                <div key={s.id} className={`bg-white rounded-2xl p-5 ring-1 ring-gray-200 ${!s.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(s.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{s.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.active ? 'ACTIVO' : 'PAUSADO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-[9px] text-blue-700 font-semibold">LEADS</p>
                      <p className="text-base font-bold text-blue-900">{s.leads_assigned}</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <p className="text-[9px] text-emerald-700 font-semibold">GANADOS</p>
                      <p className="text-base font-bold text-emerald-900">{s.won}</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <p className="text-[9px] text-amber-700 font-semibold">CONTACTOS 30d</p>
                      <p className="text-base font-bold text-amber-900">{s.contacts_30d}</p>
                    </div>
                    <div className="p-2 bg-violet-50 rounded-lg">
                      <p className="text-[9px] text-violet-700 font-semibold">LLAMADAS 30d</p>
                      <p className="text-base font-bold text-violet-900">{s.calls_30d}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(s)}
                      className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 ${
                        s.active ? 'ring-1 ring-red-300 text-red-700 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}>
                      <Power className="w-3 h-3" />
                      {s.active ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => resetPassword(s)}
                      className="flex-1 text-[11px] ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50 px-2 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1">
                      <Key className="w-3 h-3" />
                      Reset clave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
