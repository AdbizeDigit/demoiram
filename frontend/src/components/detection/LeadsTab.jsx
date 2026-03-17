import { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, ChevronLeft, ChevronRight, Loader2,
  AlertCircle, Building2, MapPin, RefreshCw, X,
  Phone, Mail, Globe, ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { OPPORTUNITY_TYPES, PriorityTag, FitScoreBadge, TypeTag, CustomSelect, formatTimeAgo } from './shared';

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  ...OPPORTUNITY_TYPES.filter((t) => t.value),
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

export default function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const perPage = 15;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: perPage };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get('/api/scraping-engine/leads', { params });
      const data = res.data.data || res.data;
      let items = data.leads || data.data || [];

      // Map lead fields
      items = items.map((lead) => ({
        id: lead.id,
        company: lead.name || 'Sin empresa',
        location: [lead.city, lead.state].filter(Boolean).join(', ') || lead.address || '',
        type: lead.sector || 'OTRO',
        score: lead.score ?? 0,
        priority: lead.score >= 70 ? 'ALTA' : lead.score >= 40 ? 'MEDIA' : 'BAJA',
        description: lead.address || '',
        source: lead.source_url || '',
        createdAt: lead.created_at || '',
        value: 0,
        phone: lead.phone || '',
        email: lead.email || '',
        website: lead.website || '',
        socialFacebook: lead.social_facebook || '',
        socialInstagram: lead.social_instagram || '',
        socialLinkedin: lead.social_linkedin || '',
        socialTwitter: lead.social_twitter || '',
        socialWhatsapp: lead.social_whatsapp || '',
        enrichmentStatus: lead.enrichment_status || '',
        raw: lead,
      }));

      setTotal(data.total || items.length);

      // Client-side priority filter
      if (priorityFilter) {
        items = items.filter((l) => l.priority === priorityFilter);
      }

      // Client-side search (if API doesn't support it)
      if (search && items.length > 0) {
        const q = search.toLowerCase();
        items = items.filter(
          (l) =>
            l.company.toLowerCase().includes(q) ||
            l.location.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q)
        );
      }

      setLeads(items);
      setTotal(data.total || data.pagination?.total || items.length);
    } catch {
      setLeads([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, search, typeFilter, priorityFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const totalPages = Math.ceil(total / perPage) || 1;

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const hasFilters = search || typeFilter || priorityFilter;

  // Stats from current data
  const highPriority = leads.filter((l) => l.priority === 'ALTA').length;
  const avgScore = leads.length
    ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={total} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <StatCard label="Prioridad Alta" value={highPriority} color="bg-red-50 text-red-700 border-red-200" />
        <StatCard label="Score Promedio" value={avgScore} color="bg-blue-50 text-blue-700 border-blue-200" />
        <StatCard label="En Pagina" value={leads.length} color="bg-amber-50 text-amber-700 border-amber-200" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa, ubicacion..."
            className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder:text-gray-400"
          />
        </div>
        <div className="w-44">
          <CustomSelect
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={TYPE_FILTER_OPTIONS}
          />
        </div>
        <div className="w-44">
          <CustomSelect
            value={priorityFilter}
            onChange={(v) => {
              setPriorityFilter(v);
              setPage(1);
            }}
            options={PRIORITY_OPTIONS}
          />
        </div>
        <button
          onClick={() => {
            fetchLeads();
          }}
          className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{total} leads encontrados</span>
        <span className="text-xs text-gray-500">
          Pagina {page}/{totalPages}
        </span>
      </div>

      {/* Lead cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {lead.company}
                    </h3>
                    {lead.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {lead.location}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <TypeTag type={lead.type} />
                <PriorityTag priority={lead.priority} />
              </div>

              {/* Contact info */}
              <div className="space-y-1 mb-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-xs text-gray-600 flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                    <Phone className="w-3 h-3 text-gray-400" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="text-xs text-gray-600 flex items-center gap-1.5 hover:text-emerald-600 transition-colors truncate">
                    <Mail className="w-3 h-3 text-gray-400" /> {lead.email}
                  </a>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 flex items-center gap-1.5 hover:text-emerald-600 transition-colors truncate">
                    <Globe className="w-3 h-3 text-gray-400" /> {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>

              {/* Social icons */}
              {(lead.socialFacebook || lead.socialInstagram || lead.socialWhatsapp || lead.socialLinkedin || lead.socialTwitter) && (
                <div className="flex items-center gap-2 mb-3">
                  {lead.socialWhatsapp && (
                    <a href={`https://wa.me/${lead.socialWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors" title="WhatsApp">
                      <span className="text-xs font-bold">W</span>
                    </a>
                  )}
                  {lead.socialFacebook && (
                    <a href={lead.socialFacebook} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors" title="Facebook">
                      <span className="text-xs font-bold">F</span>
                    </a>
                  )}
                  {lead.socialInstagram && (
                    <a href={lead.socialInstagram} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-pink-50 flex items-center justify-center text-pink-600 hover:bg-pink-100 transition-colors" title="Instagram">
                      <span className="text-xs font-bold">I</span>
                    </a>
                  )}
                  {lead.socialLinkedin && (
                    <a href={lead.socialLinkedin} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors" title="LinkedIn">
                      <span className="text-xs font-bold">L</span>
                    </a>
                  )}
                  {lead.socialTwitter && (
                    <a href={lead.socialTwitter} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" title="Twitter/X">
                      <span className="text-xs font-bold">X</span>
                    </a>
                  )}
                </div>
              )}

              {/* Footer: score + date */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <FitScoreBadge score={lead.score} />
                <span className="text-[11px] text-gray-400">
                  {lead.createdAt ? formatTimeAgo(lead.createdAt) : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty state */}
      {!loading && leads.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron leads</p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronLeft className="w-3 h-3" /> Anterior
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium ${
                  p === page
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            Siguiente <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function LeadDetailModal({ lead, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{lead.company}</h3>
              {lead.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {lead.location}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap">
            <TypeTag type={lead.type} />
            <PriorityTag priority={lead.priority} />
            <FitScoreBadge score={lead.score} />
          </div>

          {/* Description */}
          {lead.description && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1">Descripcion</p>
              <p className="text-sm text-gray-700">{lead.description}</p>
            </div>
          )}

          {/* Contact info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Datos de Contacto</p>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-emerald-600 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-600" /></div>
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-emerald-600 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-600" /></div>
                {lead.email}
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-emerald-600 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Globe className="w-4 h-4 text-purple-600" /></div>
                {lead.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
              </a>
            )}
            {!lead.phone && !lead.email && !lead.website && (
              <p className="text-xs text-gray-400">Sin datos de contacto disponibles</p>
            )}
          </div>

          {/* Social media */}
          {(lead.socialWhatsapp || lead.socialFacebook || lead.socialInstagram || lead.socialLinkedin || lead.socialTwitter) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Redes Sociales</p>
              <div className="flex flex-wrap gap-2">
                {lead.socialWhatsapp && (
                  <a href={`https://wa.me/${lead.socialWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
                    WhatsApp: {lead.socialWhatsapp}
                  </a>
                )}
                {lead.socialFacebook && (
                  <a href={lead.socialFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors">
                    Facebook
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.socialInstagram && (
                  <a href={lead.socialInstagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium hover:bg-pink-200 transition-colors">
                    Instagram
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.socialLinkedin && (
                  <a href={lead.socialLinkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-sky-100 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-200 transition-colors">
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.socialTwitter && (
                  <a href={lead.socialTwitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                    Twitter/X
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Empresa" value={lead.company} />
            <InfoRow label="Ubicacion" value={lead.location} />
            <InfoRow label="Sector" value={lead.type} />
            <InfoRow label="Direccion" value={lead.description} />
            {lead.source && (
              <div className="col-span-2">
                <p className="text-[11px] text-gray-400">Fuente</p>
                <a href={lead.source} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline truncate block">{lead.source}</a>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
            <span>
              Score:{' '}
              <strong className={lead.score >= 70 ? 'text-emerald-600' : lead.score >= 40 ? 'text-amber-600' : 'text-gray-500'}>
                {lead.score}%
              </strong>
            </span>
            <span>|</span>
            <span>Detectado: {lead.createdAt ? formatTimeAgo(lead.createdAt) : 'N/A'}</span>
            {lead.enrichmentStatus && (
              <>
                <span>|</span>
                <span>Enriquecimiento: {lead.enrichmentStatus}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm text-gray-700">{value || '-'}</p>
    </div>
  );
}
