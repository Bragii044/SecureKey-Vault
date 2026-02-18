import React, { useState, useMemo } from 'react';
import { CredentialItem } from '../types';
import { AUTH_TYPES } from '../constants';
import CredentialCard from '../components/CredentialCard';
import { Search, Filter, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VaultProps {
  items: CredentialItem[];
  onDelete: (id: string) => void;
}

const Vault: React.FC<VaultProps> = ({ items, onDelete }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Derive unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(i => i.tags.forEach(t => tags.add(t)));
    return ['All', ...Array.from(tags)];
  }, [items]);

  // Derive auth types present in items
  const activeTypes = useMemo(() => {
     const types = new Set<string>();
     items.forEach(i => types.add(i.authTypeId));
     return ['All', ...Array.from(types)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.serviceName.toLowerCase().includes(search.toLowerCase()) || 
        item.accountName.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      
      const matchesTag = selectedTag === 'All' || item.tags.includes(selectedTag);
      const matchesType = selectedType === 'All' || item.authTypeId === selectedType;

      return matchesSearch && matchesTag && matchesType;
    });
  }, [items, search, selectedTag, selectedType]);

  const handleEdit = (item: CredentialItem) => {
    navigate('/add', { state: { editItem: item } });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedTag('All');
    setSelectedType('All');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">자격증명</h2>
        <div className="text-sm text-gray-500">
          전체 {items.length}개 중 {filteredItems.length}개 표시
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="서비스, 계정, 태그 검색..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full md:w-40 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              {allTags.map(t => <option key={t} value={t}>{t === 'All' ? '모든 태그' : t}</option>)}
            </select>
          </div>

          <div className="relative flex-1 md:flex-none">
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-40 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="All">모든 타입</option>
              {activeTypes.filter(t => t !== 'All').map(t => {
                const def = AUTH_TYPES.find(at => at.id === t);
                return <option key={t} value={t}>{def ? def.name : t}</option>;
              })}
            </select>
          </div>
          
          {(search || selectedTag !== 'All' || selectedType !== 'All') && (
            <button 
              onClick={handleClearFilters}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="필터 초기화"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <CredentialCard 
              key={item.id} 
              item={item} 
              onEdit={handleEdit} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="text-gray-400 mb-2">자격증명을 찾을 수 없습니다</div>
          <p className="text-sm text-gray-400">검색어조 필터를 변경해보세요</p>
        </div>
      )}
    </div>
  );
};

export default Vault;