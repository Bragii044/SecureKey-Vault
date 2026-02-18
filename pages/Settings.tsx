import React, { useRef } from 'react';
import { dbService } from '../services/dbService';
import { Download, Trash2, AlertOctagon, Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DB_KEY } from '../constants';

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const data = dbService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securekey-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('데이터베이스 백업 파일이 생성되었습니다.', 'success');
    } catch (e) {
      showToast('백업 생성에 실패했습니다.', 'error');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Basic validation
        const parsed = JSON.parse(content);
        if (!parsed.verificationHash || !parsed.salt) {
          throw new Error('Invalid database format');
        }
        localStorage.setItem(DB_KEY, content);
        showToast('데이터를 성공적으로 가져왔습니다. 다시 로그인해주세요.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        showToast('잘못된 파일 형식이거나 손상된 파일입니다.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleNuke = () => {
    if (window.confirm("중요 경고: 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다. 정말 진행하시겠습니까?")) {
      dbService.clearDatabase();
      showToast('모든 데이터가 삭제되었습니다.', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">설정</h2>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 백업 (내보내기)</h3>
              <p className="text-gray-500 text-sm mt-1">
                암호화된 데이터베이스를 JSON 파일로 다운로드합니다.
              </p>
              <button
                onClick={handleExport}
                className="mt-4 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> JSON 내보내기
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 복구 (가져오기)</h3>
              <p className="text-gray-500 text-sm mt-1">
                이전에 백업한 JSON 파일을 선택하여 데이터를 복구합니다. 현재 데이터가 덮어씌워집니다.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> JSON 가져오기
              </button>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-700">위험 구역</h3>
              <p className="text-red-600/80 text-sm mt-1">
                브라우저에 저장된 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <button
                onClick={handleNuke}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> 모든 데이터 삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;