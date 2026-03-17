import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal, ChevronDown, ChevronUp, Trash2, Pause, Play,
  Circle, Download, Cpu, Wifi, Clock,
  Zap, Database, Search, X,
} from 'lucide-react';

const LEVEL_STYLES = {
  TRACE:   { color: 'text-gray-500',    label: 'TRC' },
  DEBUG:   { color: 'text-gray-400',    label: 'DBG' },
  INFO:    { color: 'text-blue-400',    label: 'INF' },
  WARN:    { color: 'text-amber-400',   label: 'WRN' },
  ERROR:   { color: 'text-red-400',     label: 'ERR' },
  SUCCESS: { color: 'text-emerald-400', label: 'OK ' },
};

const CATEGORY_COLORS = {
  system:     'text-purple-400',
  api:        'text-cyan-400',
  scraping:   'text-green-400',
  rules:      'text-amber-400',
  pipeline:   'text-blue-400',
  enrichment: 'text-pink-400',
  sources:    'text-orange-400',
  ws:         'text-teal-400',
};

function formatTs(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) +
    '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  );
}

function formatUptime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DebugConsole({
  logs = [],
  sources = [],
  rules = [],
  automation = {},
  opportunities = [],
  activeEngines = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entries, setEntries] = useState([]);
  const [uptime, setUptime] = useState(0);
  const scrollRef = useRef(null);
  const uptimeRef = useRef(Date.now());

  // Add a debug entry
  const addEntry = useCallback(
    (level, category, message, detail, duration) => {
      if (paused) return;
      setEntries((prev) =>
        [
          ...prev,
          {
            id: `dbg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            detail,
            duration,
          },
        ].slice(-500)
      );
    },
    [paused]
  );

  // Convert parent activity logs into debug entries
  useEffect(() => {
    if (logs.length === 0) return;
    const latest = logs[0];
    const levelMap = {
      info: 'INFO',
      success: 'SUCCESS',
      warning: 'WARN',
      error: 'ERROR',
    };
    const catMap = {
      detection: 'system',
      rule: 'rules',
      scan: 'sources',
      manual: 'system',
      pipeline: 'pipeline',
      auto: 'system',
      news: 'system',
    };
    addEntry(
      levelMap[latest.severity] || 'INFO',
      catMap[latest.type] || 'system',
      latest.message
    );
  }, [logs, addEntry]);

  // Uptime counter
  useEffect(() => {
    const start = uptimeRef.current;
    const tick = () => setUptime(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Boot messages
  useEffect(() => {
    const activeSources = sources.filter((s) => s.enabled);
    const enabledRules = rules.filter((r) => r.enabled);

    const boot = [
      { level: 'INFO', cat: 'system', msg: 'Detection engine initialized' },
      {
        level: 'DEBUG',
        cat: 'system',
        msg: `Config: autoScan=${automation.autoScan ?? false}, autoScore=${automation.autoScore ?? false}, autoPipeline=${automation.autoPipeline ?? false}`,
      },
      {
        level: 'INFO',
        cat: 'sources',
        msg: `${activeSources.length} active sources out of ${sources.length} configured`,
      },
      {
        level: 'INFO',
        cat: 'rules',
        msg: `${enabledRules.length} rules enabled out of ${rules.length} configured`,
      },
      { level: 'SUCCESS', cat: 'system', msg: 'System ready' },
    ];

    boot.forEach((b, i) => {
      setTimeout(() => addEntry(b.level, b.cat, b.msg), i * 120);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll when new entries appear
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  // Filtered entries
  const filteredEntries = entries.filter((e) => {
    if (filterLevel && e.level !== filterLevel) return false;
    if (filterCategory && e.category !== filterCategory) return false;
    if (
      searchTerm &&
      !e.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(e.detail || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  // Export log file
  const handleExport = () => {
    const text = filteredEntries
      .map(
        (e) =>
          `[${formatTs(e.timestamp)}] [${(LEVEL_STYLES[e.level] || LEVEL_STYLES.INFO).label}] [${e.category}] ${e.message}${e.detail ? ` | ${e.detail}` : ''}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSrcCount = sources.filter((s) => s.enabled).length;
  const enabledRuleCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-mono font-semibold text-gray-200">
              Debug Console
            </span>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] text-green-400 font-mono">LIVE</span>
          </div>

          <span className="text-[10px] text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
            {entries.length} entries
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini stats (collapsed) */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatUptime(uptime)}
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {opportunities.length} opps
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {activeEngines} engines
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div>
          {/* Live stats bar */}
          <div className="px-4 py-2 bg-gray-800/60 border-t border-b border-gray-700/50 flex items-center gap-4 flex-wrap text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3 h-3 text-purple-400" />
              <span className="text-gray-500">Uptime:</span>
              <span className="text-gray-300">{formatUptime(uptime)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-gray-500">Sources:</span>
              <span className="text-gray-300">
                {activeSrcCount}/{sources.length} active
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="text-gray-500">Rules:</span>
              <span className="text-gray-300">{enabledRuleCount} enabled</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-gray-500">Opportunities:</span>
              <span className="text-gray-300">{opportunities.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Zap className="w-3 h-3 text-orange-400" />
              <span className="text-gray-500">Engines:</span>
              <span className="text-gray-300">{activeEngines}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="text-gray-500">Automation:</span>
              <span
                className={
                  automation.autoScan ? 'text-green-400' : 'text-gray-600'
                }
              >
                {automation.autoScan ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-2 bg-gray-800/30 border-b border-gray-700/50 flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[150px] max-w-[300px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter logs..."
                className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-7 py-1 text-[11px] font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 text-gray-600 hover:text-gray-400" />
                </button>
              )}
            </div>

            {/* Level filter */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] font-mono text-gray-400 focus:outline-none"
            >
              <option value="">All Levels</option>
              {Object.entries(LEVEL_STYLES).map(([k, v]) => (
                <option key={k} value={k}>
                  [{v.label}] {k}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] font-mono text-gray-400 focus:outline-none"
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_COLORS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setPaused(!paused)}
                className={`p-1.5 rounded transition-colors ${
                  paused
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'hover:bg-gray-700 text-gray-500'
                }`}
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? (
                  <Play className="w-3 h-3" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => setEntries([])}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-500 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-500 transition-colors"
                title="Export"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Log output */}
          <div
            ref={scrollRef}
            className="h-[350px] overflow-y-auto overflow-x-hidden font-mono text-[11px] leading-[18px] bg-gray-900 p-2"
          >
            {paused && (
              <div className="sticky top-0 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-1 mb-2 text-amber-400 text-[10px] flex items-center gap-1.5 z-10">
                <Pause className="w-3 h-3" /> Output paused -- click Play to
                resume
              </div>
            )}

            {filteredEntries.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-600">
                <span>
                  No entries
                  {filterLevel || filterCategory || searchTerm
                    ? ' (check your filters)'
                    : '...'}
                </span>
              </div>
            )}

            {filteredEntries.map((entry) => {
              const lvl = LEVEL_STYLES[entry.level] || LEVEL_STYLES.INFO;
              const catColor = CATEGORY_COLORS[entry.category] || 'text-gray-400';
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-0 hover:bg-gray-800/50 px-1 rounded group"
                >
                  <span className="text-gray-600 flex-shrink-0 select-none">
                    {formatTs(entry.timestamp)}
                  </span>
                  <span
                    className={`mx-1.5 flex-shrink-0 font-bold ${lvl.color}`}
                  >
                    [{lvl.label}]
                  </span>
                  <span className={`mr-1.5 flex-shrink-0 ${catColor}`}>
                    [{(entry.category || '').padEnd(10)}]
                  </span>
                  <span className="text-gray-300 break-all">
                    {entry.message}
                    {entry.detail && (
                      <span className="text-gray-600 ml-1">
                        | {entry.detail}
                      </span>
                    )}
                    {entry.duration !== undefined && (
                      <span className="text-gray-600 ml-1">
                        ({entry.duration}ms)
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

            {/* Blinking cursor */}
            <div className="flex items-center gap-1 text-gray-700 mt-1">
              <Circle className="w-2 h-2 animate-pulse" />
              <span className="animate-pulse">_</span>
            </div>
          </div>

          {/* Recent logs summary (last 5 from parent) */}
          {logs.length > 0 && (
            <div className="px-4 py-2 bg-gray-800/40 border-t border-gray-700/50">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Recent Activity ({Math.min(logs.length, 5)} of {logs.length})
              </span>
              <div className="mt-1 space-y-0.5">
                {logs.slice(0, 5).map((log) => {
                  const sevColor =
                    log.severity === 'error'
                      ? 'text-red-400'
                      : log.severity === 'warning'
                        ? 'text-amber-400'
                        : log.severity === 'success'
                          ? 'text-emerald-400'
                          : 'text-blue-400';
                  return (
                    <div
                      key={log.id}
                      className="text-[10px] font-mono text-gray-500 flex items-center gap-2"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        log.severity === 'error'
                          ? 'bg-red-400'
                          : log.severity === 'warning'
                            ? 'bg-amber-400'
                            : log.severity === 'success'
                              ? 'bg-emerald-400'
                              : 'bg-blue-400'
                      }`} />
                      <span className={sevColor}>{log.type}</span>
                      <span className="text-gray-600 truncate flex-1">
                        {log.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
