import React, { useRef, useState } from 'react';
import { dbService } from '../services/dbService';
import { Download, Trash2, AlertOctagon, Upload, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState('');

  const handleExport = async () => {
    try {
      const data = await dbService.exportData();
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

    if (!window.confirm("경고: 가져오기를 진행하면 현재 저장된 모든 데이터가 삭제되고 파일 내용으로 덮어씌워집니다. 계속하시겠습니까?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      try {
        await dbService.importData(content);
        showToast('데이터를 성공적으로 가져왔습니다. 다시 로그인해주세요.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        if (error instanceof Error && error.message === 'LegacyPasswordRequired') {
          const legacyPassword = window.prompt(
            '1.0.1 백업 파일입니다.\n해당 백업의 마스터 비밀번호를 입력하면 1.0.2 형식으로 변환해 복원합니다.'
          );

          if (!legacyPassword) {
            showToast('복원을 취소했습니다.', 'info');
            return;
          }

          try {
            await dbService.importData(content, legacyPassword);
            showToast('레거시 백업을 변환해 복원했습니다. 다시 로그인해주세요.', 'success');
            setTimeout(() => window.location.reload(), 1500);
            return;
          } catch (legacyError) {
            if (legacyError instanceof Error && legacyError.message === 'LegacyPasswordInvalid') {
              showToast('백업 마스터 비밀번호가 올바르지 않습니다.', 'error');
              return;
            }
          }
        }

        showToast('잘못된 파일 형식이거나 손상된 파일입니다.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleNukeClick = () => {
    setNukeConfirmText('');
    setIsNukeModalOpen(true);
  };

  const confirmNuke = async () => {
    if (nukeConfirmText !== '삭제') return;

    await dbService.clearDatabase();
    setIsNukeModalOpen(false);
    showToast('모든 데이터가 삭제되었습니다.', 'info');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">설정</h2>
        <p className="text-gray-500 mt-1">데이터 관리 및 초기화</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 백업 (내보내기)</h3>
              <p className="text-gray-500 text-sm mt-1">
                암호화된 데이터베이스를 JSON 파일로 다운로드하여 안전하게 보관하세요.
              </p>
              <button
                onClick={handleExport}
                className="mt-4 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> 백업 파일 다운로드
              </button>
            </div>
          </div>
        </div>

        {/* Import Section - Color changed to Orange to indicate caution */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 복구 (가져오기)</h3>
              <div className="mt-1 p-3 bg-orange-50 rounded-lg border border-orange-100 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-orange-800 text-sm">
                  주의: 복구를 진행하면 <strong>현재 저장된 모든 데이터가 삭제</strong>되고 백업 파일의 내용으로 덮어씌워집니다.
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-white border border-orange-200 hover:bg-orange-50 text-orange-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> 백업 파일 불러오기
              </button>
            </div>
          </div>
        </div>

        {/* Nuke Section */}
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-700">위험 구역</h3>
              <p className="text-red-600/80 text-sm mt-1">
                브라우저에 저장된 모든 데이터(자격증명, 설정 등)를 영구적으로 삭제하고 초기화합니다.
              </p>
              <button
                onClick={handleNukeClick}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> 모든 데이터 삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isNukeModalOpen}
        onClose={() => setIsNukeModalOpen(false)}
        title="데이터 영구 삭제 확인"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold mb-1">정말 삭제하시겠습니까?</p>
              <p>이 작업은 되돌릴 수 없습니다. 모든 자격증명 데이터가 영구적으로 사라집니다.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              확인을 위해 아래 입력창에 <strong>삭제</strong> 라고 입력하세요.
            </label>
            <input
              type="text"
              value={nukeConfirmText}
              onChange={(e) => setNukeConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsNukeModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={confirmNuke}
              disabled={nukeConfirmText !== '삭제'}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2
                        ${nukeConfirmText === '삭제'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              <Trash2 className="w-4 h-4" />
              삭제 실행
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
