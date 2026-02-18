import React, { useState } from 'react';
import { CredentialItem } from '../types';
import { AUTH_TYPES } from '../constants';
import { Copy, Eye, EyeOff, Edit2, Trash2, Calendar, ExternalLink, Hash } from 'lucide-react';

import { useToast } from '../context/ToastContext';

interface CredentialCardProps {
  item: CredentialItem;
  onEdit: (item: CredentialItem) => void;
  onDelete: (id: string) => void;
}

const CredentialCard: React.FC<CredentialCardProps> = ({ item, onEdit, onDelete }) => {
  const { showToast } = useToast();
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const authType = AUTH_TYPES.find(t => t.id === item.authTypeId);

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('클립보드에 복사되었습니다.', 'success');
  };

  const isExpiringSoon = () => {
    if (!item.expiry) return false;
    const diff = new Date(item.expiry).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 30 && days >= 0;
  };

  const isExpired = () => {
    if (!item.expiry) return false;
    return new Date(item.expiry).getTime() < new Date().getTime();
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${isExpired() ? 'border-red-200' : isExpiringSoon() ? 'border-yellow-200' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            {item.serviceName}
            {isExpired() && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">만료됨</span>}
            {isExpiringSoon() && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">만료 임박</span>}
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-1">{item.accountName || '기본 계정'}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
              {authType?.name || item.authTypeId}
            </span>
            {item.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                <Hash className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex space-x-1">
          <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm("이 자격증명을 삭제하시겠습니까?")) onDelete(item.id);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Credentials */}
      <div className="p-5 space-y-4">
        {Object.entries(item.credentials).map(([key, val]) => {
          const value = val as string;
          return (
            <div key={key} className="group">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                {key.replace(/_/g, ' ')}
              </label>
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 group-hover:border-blue-200 transition-colors">
                <code className="flex-1 font-mono text-sm text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
                  {key === 'custom_json'
                    ? (revealedKeys[key] ? <pre className="whitespace-pre-wrap text-xs">{value}</pre> : '••••••••••••')
                    : (revealedKeys[key] ? value : '••••••••••••••••')
                  }
                </code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleReveal(key)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                    title={revealedKeys[key] ? "숨기기" : "보기"}
                  >
                    {revealedKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(value)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Meta */}
      {(item.docUrl || item.expiry || item.memo) && (
        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 rounded-b-xl flex flex-col gap-2 text-sm">
          {item.expiry && (
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>만료일: {item.expiry}</span>
            </div>
          )}
          {item.docUrl && (
            <a href={item.docUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>문서 보기</span>
            </a>
          )}
          {item.memo && (
            <p className="text-gray-500 italic text-xs mt-1 border-l-2 border-gray-300 pl-2">
              {item.memo}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CredentialCard;