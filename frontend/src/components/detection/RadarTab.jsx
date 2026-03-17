import { useState, useEffect } from 'react';
import {
  Users, Mail, Phone, Globe, MapPin, Sparkles,
  BarChart3, Target, Eye, CheckCircle2,
  Clock, AlertCircle, Building2, Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { formatTimeAgo } from './shared';

const SECTOR_COLORS = [
  '#0083B0', '#7C3AED', '#D97706', '#059669', '#DC2626',
  '#2563EB', '#DB2777', '#0891B2', '#CA8A04', '#4F46E5',
];

const ZONE_STATUS_COLORS = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  NEEDS_RESCAN: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ZONE_STATUS_LABELS = {
  COMPLETED: 'Completado',
  IN_PROGRESS: 'En progreso',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
  NEEDS_RESCAN: 'Re-escanear',
};

const ENRICHMENT_COLORS = {
  COMPLETED: '#059669',
  PARTIAL: '#D97706',
  PENDING: '#9CA3AF',
  IN_PROGRESS: '#3B82F6',
  NOT_NEEDED: '#6B7280',
};

export default function RadarTab({
  opportunities = [],
  sources = [],
  enrichmentStats,
  logs = [],
  mode,
  onViewDetails,
  leadsStats: externalLeadsStats,
  scrapingActive,
  scrapingProgress = { totalZones: 0, completedZones: 0, totalLeadsFound: 0 },
  onTabChange,
}) {
  const [stats, setStats] = useState(externalLeadsStats || null);
  const [loading, setLoading] = useState(!externalLeadsStats);

  useEffect(() => {
    if (externalLeadsStats) {
      setStats(externalLeadsStats);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        const [statsRes, scanRes] = await Promise.all([
          api.get('/api/detection/opportunities/stats').catch(() => null),
          api.get('/api/detection/scan/status').catch(() => null),
        ]);

        if (cancelled) return;

        if (statsRes && statsRes.data) {
          setStats(statsRes.data);
        } else {
          // Use fallback stats from props
          setStats(buildFallbackStats(opportunities, sources));
        }
      } catch {
        if (!cancelled) {
          setStats(buildFallbackStats(opportunities, sources));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [externalLeadsStats, opportunities, sources]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-400">Cargando datos del radar...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-400">No hay datos disponibles</p>
      </div>
    );
  }

  const emailPct = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;
  const phonePct = stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0;

  // Enrichment data
  const byEnrichment = stats.byEnrichmentStatus || [];
  const enrichCompleted = byEnrichment.find(e => e.enrichmentStatus === 'COMPLETED')?._count || 0;
  const enrichPending = byEnrichment.find(e => e.enrichmentStatus === 'PENDING')?._count || 0;
  const enrichPartial = byEnrichment.find(e => e.enrichmentStatus === 'PARTIAL')?._count || 0;

  // Sector data
  const bySector = stats.bySector || [];
  const sectorData = bySector.map((s, i) => ({
    name: s.sector || 'Sin sector',
    value: s._count,
    color: SECTOR_COLORS[i % SECTOR_COLORS.length],
  })).filter(s => s.value > 0);

  const sectorTotal = sectorData.reduce((sum, s) => sum + s.value, 0);

  // Enrichment data for chart
  const enrichmentData = byEnrichment
    .map(e => ({
      name: e.enrichmentStatus === 'COMPLETED' ? 'Completo' :
            e.enrichmentStatus === 'PARTIAL' ? 'Parcial' :
            e.enrichmentStatus === 'PENDING' ? 'Pendiente' :
            e.enrichmentStatus === 'IN_PROGRESS' ? 'En proceso' :
            e.enrichmentStatus === 'NOT_NEEDED' ? 'N/A' : e.enrichmentStatus,
      value: e._count,
      color: ENRICHMENT_COLORS[e.enrichmentStatus] || '#9CA3AF',
    }))
    .filter(e => e.value > 0);

  const enrichmentTotal = enrichmentData.reduce((sum, e) => sum + e.value, 0);

  // Score distribution
  const scoreDistribution = stats.scoreDistribution || [];

  // Recent leads
  const recentLeads = stats.recentLeads || [];
  const topZones = stats.topZones || [];

  return (
    <div className="space-y-4">
      {/* Scraping Active Banner */}
      {scrapingActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-sm font-semibold text-blue-700">Scraping en curso</span>
            <span className="text-xs text-blue-500 ml-auto">
              {scrapingProgress.completedZones}/{scrapingProgress.totalZones} zonas - {scrapingProgress.totalLeadsFound} leads
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${scrapingProgress.totalZones > 0 ? (scrapingProgress.completedZones / scrapingProgress.totalZones) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={Users} label="Total Leads" value={stats.total}
          sub={`${stats.withEmail} con email (${emailPct}%)`} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <KPICard icon={Mail} label="Con Email" value={stats.withEmail}
          sub={`${stats.withPhone} con telefono (${phonePct}%)`} gradient="bg-gradient-to-br from-purple-500 to-purple-700" />
        <KPICard icon={MapPin} label="Zonas Scrapeadas" value={`${scrapingProgress.completedZones}/${scrapingProgress.totalZones}`}
          sub={`${topZones.length} zonas con leads`} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <KPICard icon={Target} label="Score Promedio" value={stats.averageScore || 0}
          sub={`${scoreDistribution[0]?.count || 0} premium (80+)`} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      {/* Data Completeness Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completitud de Datos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataBar label="Email" value={stats.withEmail} total={stats.total} color="bg-emerald-500" icon={Mail} />
          <DataBar label="Telefono" value={stats.withPhone} total={stats.total} color="bg-blue-500" icon={Phone} />
          <DataBar label="Website" value={stats.withWebsite || 0} total={stats.total} color="bg-purple-500" icon={Globe} />
          <DataBar label="Enrichment" value={enrichCompleted + enrichPartial} total={stats.total} color="bg-amber-500" icon={Sparkles} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sector Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Leads por Sector
          </h3>
          {sectorData.length > 0 ? (
            <div>
              <div className="space-y-2 mb-3">
                {sectorData.map(d => {
                  const pct = sectorTotal > 0 ? Math.round((d.value / sectorTotal) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-[11px] text-gray-600 truncate">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">{d.value} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" /> Score de Leads
          </h3>
          {scoreDistribution.length > 0 ? (
            <div className="space-y-2">
              {scoreDistribution.map((d, i) => {
                const maxCount = Math.max(...scoreDistribution.map(s => s.count));
                const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-gray-600">{d.range}</span>
                      <span className="text-[11px] font-semibold text-gray-700">{d.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, background: d.fill || '#3B82F6' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        {/* Enrichment Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" /> Enrichment
          </h3>
          {enrichmentData.length > 0 ? (
            <div>
              <div className="space-y-2 mb-3">
                {enrichmentData.map(d => {
                  const pct = enrichmentTotal > 0 ? Math.round((d.value / enrichmentTotal) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-[11px] text-gray-600">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700">{d.value} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Summary numbers */}
              <div className="flex justify-around pt-2 border-t border-gray-100">
                {enrichmentData.map(d => (
                  <div key={d.name} className="text-center">
                    <p className="text-sm font-bold text-gray-800">{d.value}</p>
                    <p className="text-[9px] text-gray-400">{d.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Zones + Recent Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Zones */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Top Zonas por Leads
          </h3>
          <div className="space-y-2">
            {topZones.length > 0 ? topZones.slice(0, 6).map((zone, i) => (
              <div key={zone.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{zone.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {zone.city ? `${zone.city.name}, ${zone.city.state}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-bold text-gray-900">{zone.totalLeadsFound}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${ZONE_STATUS_COLORS[zone.scrapingStatus] || ZONE_STATUS_COLORS.PENDING}`}>
                    {ZONE_STATUS_LABELS[zone.scrapingStatus] || zone.scrapingStatus}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-400 text-sm">No hay zonas con leads</div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Leads Recientes
            </h3>
            <button
              onClick={() => onTabChange && onTabChange('leads')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Ver todos <Eye className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentLeads.length > 0 ? recentLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate font-medium">{lead.company}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead.zone && (
                      <span className="text-[10px] text-gray-400">
                        {lead.zone.city ? lead.zone.city.name : ''} - {lead.zone.name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300">{formatTimeAgo(lead.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {lead.email && <Mail className="w-3 h-3 text-emerald-500" />}
                  {lead.phone && <Phone className="w-3 h-3 text-blue-500" />}
                  {lead.website && <Globe className="w-3 h-3 text-purple-500" />}
                  {(lead.facebook || lead.instagram || lead.linkedin || lead.twitter || lead.whatsapp) && (
                    <span className="w-3 h-3 rounded-full bg-pink-100 flex items-center justify-center text-[7px] font-bold text-pink-600">S</span>
                  )}
                  <ScoreBadge score={lead.score} />
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-400 text-sm">No hay leads aun</div>
            )}
          </div>
        </div>
      </div>

      {/* Enrichment + Scraping summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">{enrichCompleted}</p>
            <p className="text-[10px] text-emerald-600">Enrichment completo</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">{enrichPending + enrichPartial}</p>
            <p className="text-[10px] text-amber-600">Pendientes de enriquecer</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-blue-800">{scrapingProgress.totalLeadsFound}</p>
            <p className="text-[10px] text-blue-600">Leads encontrados por scraping</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: Build fallback stats from props ─────────────────────
function buildFallbackStats(opportunities, sources) {
  return {
    total: opportunities.length,
    withEmail: opportunities.filter(o => o.contactEmail).length,
    withPhone: opportunities.filter(o => o.contactPhone).length,
    withWebsite: 0,
    averageScore: opportunities.length > 0
      ? Math.round(opportunities.reduce((s, o) => s + (o.fitScore || 0), 0) / opportunities.length)
      : 0,
    byStatus: [],
    bySource: [],
    bySector: [],
    byEnrichmentStatus: [],
    scoreDistribution: [],
    recentLeads: [],
    topZones: [],
  };
}

// ── Sub-components ──────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <div className={`${gradient} rounded-xl p-4 shadow-sm text-white`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-white/80" />
        <span className="text-xs text-white/70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-white/60 mt-1">{sub}</p>
    </div>
  );
}

function DataBar({ label, value, total, color, icon: Icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">{label}</span>
        </div>
        <span className="text-xs font-bold text-gray-800">{value}/{total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5 text-right">{pct}%</p>
    </div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                score >= 60 ? 'bg-blue-100 text-blue-700' :
                score >= 40 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600';
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}>{score}</span>;
}
