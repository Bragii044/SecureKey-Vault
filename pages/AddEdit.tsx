import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { AUTH_TYPES } from '../constants';
import { CredentialItem } from '../types';
import { Save, ArrowLeft, ChevronDown, Check, X, Key, Lock, Shield, Database, FileJson, Server, Eye, EyeOff } from 'lucide-react';

interface AddEditProps {
  onSave: (item: CredentialItem) => Promise<void>;
}

// Icon mapping based on auth type ID or generic fallback
const getAuthIcon = (id: string) => {
  switch (id) {
    case 'api_key': return <Key className="w-5 h-5 text-blue-500" />;
    case 'basic_auth': return <Lock className="w-5 h-5 text-green-500" />;
    case 'bearer_token': return <Shield className="w-5 h-5 text-purple-500" />;
    case 'database': return <Database className="w-5 h-5 text-orange-500" />;
    case 'custom': return <FileJson className="w-5 h-5 text-gray-500" />;
    default: return <Server className="w-5 h-5 text-indigo-500" />;
  }
};

const AddEdit: React.FC<AddEditProps> = ({ onSave }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const editItem = location.state?.editItem as CredentialItem | undefined;

  const [serviceName, setServiceName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [authTypeId, setAuthTypeId] = useState(AUTH_TYPES[0].id);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [expiry, setExpiry] = useState('');
  const [memo, setMemo] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Design states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize form if editing
  useEffect(() => {
    if (editItem) {
      setServiceName(editItem.serviceName);
      setAccountName(editItem.accountName);
      setAuthTypeId(editItem.authTypeId);
      setCredentials(editItem.credentials);
      setTags(editItem.tags);
      setDocUrl(editItem.docUrl || '');
      setExpiry(editItem.expiry || '');
      setMemo(editItem.memo || '');
    }
  }, [editItem]);

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTypeChange = (newType: string) => {
    setAuthTypeId(newType);
    setIsDropdownOpen(false);
    if (!editItem || editItem.authTypeId !== newType) {
      setCredentials({});
    } else {
      setCredentials(editItem.credentials);
    }
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  // Tag Handling
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName) return;

    const newItem: CredentialItem = {
      id: editItem ? editItem.id : uuidv4(),
      serviceName,
      accountName,
      authTypeId,
      credentials,
      tags: tags, // Already an array
      docUrl,
      expiry,
      memo,
      createdAt: editItem ? editItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSave(newItem);
    navigate('/vault');
  };

  const selectedAuthType = AUTH_TYPES.find(t => t.id === authTypeId);
  const subtitle = selectedAuthType?.description || "API 키와 토큰을 안전하게 저장하세요."; // Assuming description exists or fallback

  return (
    <div className="max-w-3xl mx-auto pb-24 relative min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        뒤로
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in-up">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">{editItem ? '자격증명 수정' : '새 자격증명 추가'}</h2>
            <p className="text-sm text-gray-500 mt-1 transition-all duration-300 w-full whitespace-pre-wrap">
              {selectedAuthType?.name} 설정: 필수 정보를 입력해주세요.
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">서비스 이름 *</label>
                  <input
                    required
                    type="text"
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    placeholder="예: OpenAI, AWS"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계정 이름</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="예: 운영환경, 개인용"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Custom Dropdown */}
              <div className="relative" ref={dropdownRef} style={{ zIndex: 50 }}>
                <label className="block text-sm font-medium text-gray-700 mb-1">인증 타입</label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-100 rounded-md">
                      {getAuthIcon(authTypeId)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{selectedAuthType?.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-md">
                        {selectedAuthType?.fields.map(f => f.label).join(', ')} 등의 필드 포함
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto animate-fade-in z-50">
                    {AUTH_TYPES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTypeChange(t.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0
                                        ${authTypeId === t.id ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`p-2 rounded-lg ${authTypeId === t.id ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                          {getAuthIcon(t.id)}
                        </div>
                        <div className="text-left flex-1">
                          <div className={`font-medium ${authTypeId === t.id ? 'text-blue-700' : 'text-gray-800'}`}>{t.name}</div>
                          <div className="text-xs text-gray-500">{t.example || '설정값 예시 없음'}</div>
                        </div>
                        {authTypeId === t.id && <Check className="w-5 h-5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Secrets (Animated Transition) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-t border-gray-100 pt-6">인증 정보</h3>
              <div key={authTypeId} className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  {getAuthIcon(authTypeId)}
                </div>
                {selectedAuthType?.fields.map(field => (
                  <div key={field.key} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        required
                        value={credentials[field.key] || ''}
                        onChange={e => handleCredentialChange(field.key, e.target.value)}
                        rows={4}
                        placeholder={selectedAuthType.example || ''}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-white shadow-sm"
                      />
                    ) : (
                      <div className="relative group/input">
                        <input
                          required
                          type={field.type === 'password' ? (showPasswords[field.key] ? 'text' : 'password') : field.type}
                          value={credentials[field.key] || ''}
                          onChange={e => handleCredentialChange(field.key, e.target.value)}
                          placeholder={selectedAuthType.example || ''}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-white shadow-sm pr-12"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(field.key)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                            title={showPasswords[field.key] ? "비밀번호 숨기기" : "비밀번호 보기"}
                          >
                            {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Metadata */}
            <div className="space-y-4 pb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-t border-gray-100 pt-6">추가 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">태그 (Enter로 입력)</label>
                  <div className="w-full px-2 py-2 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap gap-2 transition-all">
                    {tags.map(tag => (
                      <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={tags.length === 0 ? "dev, prod..." : ""}
                      className="flex-1 min-w-[80px] outline-none text-sm py-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">만료일</label>
                  <input
                    type="date"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

          </div>

          {/* Sticky Footer */}
          <div className="border-t border-gray-200 bg-white p-4 sticky bottom-0 z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-xl">
            <span className="text-sm text-gray-500 hidden sm:block">
              입력한 정보는 로컬에 암호화되어 저장됩니다.
            </span>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>저장하기</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEdit;
