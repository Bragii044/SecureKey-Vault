import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { AUTH_TYPES } from '../constants';
import { CredentialItem } from '../types';
import { Save, ArrowLeft } from 'lucide-react';

interface AddEditProps {
  onSave: (item: CredentialItem) => void;
}

const AddEdit: React.FC<AddEditProps> = ({ onSave }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const editItem = location.state?.editItem as CredentialItem | undefined;

  const [serviceName, setServiceName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [authTypeId, setAuthTypeId] = useState(AUTH_TYPES[0].id);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [tags, setTags] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [expiry, setExpiry] = useState('');
  const [memo, setMemo] = useState('');

  // Initialize form if editing
  useEffect(() => {
    if (editItem) {
      setServiceName(editItem.serviceName);
      setAccountName(editItem.accountName);
      setAuthTypeId(editItem.authTypeId);
      setCredentials(editItem.credentials);
      setTags(editItem.tags.join(', '));
      setDocUrl(editItem.docUrl || '');
      setExpiry(editItem.expiry || '');
      setMemo(editItem.memo || '');
    }
  }, [editItem]);

  // Handle auth type change (reset creds if type changes)
  const handleTypeChange = (newType: string) => {
    setAuthTypeId(newType);
    if (!editItem || editItem.authTypeId !== newType) {
      setCredentials({});
    } else {
      setCredentials(editItem.credentials);
    }
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName) return;

    const newItem: CredentialItem = {
      id: editItem ? editItem.id : uuidv4(),
      serviceName,
      accountName,
      authTypeId,
      credentials,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      docUrl,
      expiry,
      memo,
      createdAt: editItem ? editItem.createdAt : new Date().toISOString()
    };

    onSave(newItem);
    navigate('/vault');
  };

  const selectedAuthType = AUTH_TYPES.find(t => t.id === authTypeId);

  return (
    <div className="max-w-3xl mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        뒤로
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">{editItem ? '자격증명 수정' : '새 자격증명 추가'}</h2>
          <p className="text-sm text-gray-500 mt-1">API 키와 토큰을 안전하게 저장하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">서비스 이름 *</label>
                <input
                  required
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="예: OpenAI, AWS"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계정 이름</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="예: 운영환경, 개인용"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인증 타입</label>
              <select
                value={authTypeId}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              >
                {AUTH_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Secrets */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">인증 정보</h3>
             <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                {selectedAuthType?.fields.map(field => (
                  <div key={field.key} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={credentials[field.key] || ''}
                        onChange={e => handleCredentialChange(field.key, e.target.value)}
                        rows={4}
                        placeholder={selectedAuthType.example || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={credentials[field.key] || ''}
                        onChange={e => handleCredentialChange(field.key, e.target.value)}
                        placeholder={selectedAuthType.example || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                      />
                    )}
                  </div>
                ))}
             </div>
          </div>

          {/* Section 3: Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">추가 정보</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="dev, prod, finance"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">만료일</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">문서 URL</label>
               <input
                  type="url"
                  value={docUrl}
                  onChange={e => setDocUrl(e.target.value)}
                  placeholder="https://api.docs.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>자격증명 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEdit;