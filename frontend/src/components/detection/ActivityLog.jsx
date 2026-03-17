import { useState } from 'react';
import {
  Activity, ChevronDown, ChevronUp, Radio, Cpu, Hand,
  GitBranch, Zap, AlertCircle, CheckCircle, Info, AlertTriangle,
  Newspaper, Trash2,
} from 'lucide-react';

const TYPE_ICONS = {
  detection: Radio,
  rule: Cpu,
  scan: Zap,
  manual: Hand,
  pipeline: GitBranch,
  auto: Activity,
  news: Newspaper,
};

const SEVERITY_STYLES = {
  info:    { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200', text: 'text-blue-600',   dot: 'bg-blue-400' },
  success: { icon: CheckCircle,  bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-600',  dot: 'bg-green-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-600',  dot: 'bg-amber-400' },
  error:   { icon: AlertCircle,  bg: 'bg-red-50',    border: 'border-red-200', text: 'text-red-600',    dot: 'bg-red-400' },
};

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const INITIAL_VISIBLE = 20;

export default function ActivityLog({ logs = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleLogs = showAll ? logs : logs.slice(0, INITIAL_VISIBLE);

  const handleClear = (e) => {
    e.stopPropagation();
    // Signal parent to clear if needed; for now this is a no-op
    // since logs are controlled by the parent
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Activity Log</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded && logs.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="border-t border-gray-100">
          {logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No activity yet.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
                {visibleLogs.map((log) => {
                  const TypeIcon = TYPE_ICONS[log.type] || Activity;
                  const sev = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.info;
                  const SevIcon = sev.icon;

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-2.5 text-xs hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-1 flex-shrink-0">
                        <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                        <span className="w-px flex-1 bg-gray-100 mt-1" />
                      </div>

                      {/* Severity icon */}
                      <SevIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${sev.text}`} />

                      {/* Type icon */}
                      <TypeIcon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />

                      {/* Message */}
                      <span className="text-gray-600 flex-1 leading-relaxed">{log.message}</span>

                      {/* Timestamp */}
                      <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Show more / show less */}
              {logs.length > INITIAL_VISIBLE && (
                <div className="border-t border-gray-100 px-4 py-2 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAll(!showAll);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    {showAll
                      ? 'Show less'
                      : `Show more (${logs.length - INITIAL_VISIBLE} remaining)`
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
