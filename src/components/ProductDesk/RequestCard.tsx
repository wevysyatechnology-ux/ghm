import { ChevronUp, MessageCircle, Pin, Bug, Sparkles } from 'lucide-react';
import { ProductRequest } from './types';
import { STATUS_CONFIG, APP_COLORS } from './constants';

interface RequestCardProps {
  request: ProductRequest;
  onVote: (id: string, voted: boolean) => void;
  onClick: (req: ProductRequest) => void;
}

export default function RequestCard({ request, onVote, onClick }: RequestCardProps) {
  const status = STATUS_CONFIG[request.status];
  const appColor = APP_COLORS[request.app_name] || '#6EE7B7';

  return (
    <div
      onClick={() => onClick(request)}
      className="group relative bg-[rgba(20,26,24,0.8)] border border-gray-800/50 rounded-2xl p-5 cursor-pointer hover:border-gray-700/80 transition-all duration-200 hover:bg-[rgba(24,32,28,0.9)]"
    >
      {request.is_pinned && (
        <div className="absolute top-3 right-3">
          <Pin className="w-3.5 h-3.5 text-[#FBBF24]" fill="#FBBF24" />
        </div>
      )}

      <div className="flex items-start gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote(request.id, !!request.user_voted);
          }}
          className={`flex flex-col items-center gap-0.5 min-w-[44px] py-2 px-2 rounded-xl border transition-all duration-150 ${
            request.user_voted
              ? 'border-[#6EE7B7]/60 bg-[#6EE7B7]/10 text-[#6EE7B7]'
              : 'border-gray-700/60 text-gray-400 hover:border-[#6EE7B7]/40 hover:text-[#6EE7B7]'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-xs font-bold leading-none">{request.votes_count}</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: appColor, background: `${appColor}18` }}
            >
              {request.app_name}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                request.type === 'bug'
                  ? 'text-red-400 bg-red-400/10'
                  : 'text-[#60A5FA] bg-[#60A5FA]/10'
              }`}
            >
              {request.type === 'bug' ? (
                <Bug className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {request.type === 'bug' ? 'Bug' : 'Feature'}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2 group-hover:text-[#6EE7B7] transition-colors">
            {request.title}
          </h3>

          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{request.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">by {request.submitter_name || 'Anonymous'}</span>
            <div className="flex items-center gap-1 text-gray-500">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="text-xs">{request.comments_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
