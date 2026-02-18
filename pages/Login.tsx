import React, { useState, useEffect } from 'react';
import { Shield, Unlock, KeyRound, AlertCircle } from 'lucide-react';
import { dbService } from '../services/dbService';
import { verifyPassword, deriveKey } from '../services/cryptoService';

interface LoginProps {
  onLogin: (derivedKey: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setIsSetup(!dbService.hasDatabase());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (password.length < 4) {
        setError('비밀번호가 너무 짧습니다.');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      // Initialize DB
      dbService.initDatabase(password);
      // initDatabase already sets the key in dbService, but App needs to know too
      const info = dbService.getDatabaseInfo();
      if (info) {
        const derivedKey = deriveKey(password, info.salt);
        onLogin(derivedKey);
      }
    } else {
      const dbInfo = dbService.getDatabaseInfo();
      if (dbInfo && verifyPassword(password, dbInfo.salt, dbInfo.verificationHash)) {
        const derivedKey = deriveKey(password, dbInfo.salt);
        onLogin(derivedKey);
      } else {
        setError('비밀번호가 올바르지 않습니다.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className={`bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            {isSetup ? <KeyRound className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isSetup ? '마스터 비밀번호 설정' : '볼트 잠금 해제'}
          </h1>
          <p className="text-slate-400 text-center mt-2 text-sm">
            {isSetup
              ? '이 비밀번호는 데이터를 로컬에서 암호화합니다. 분실 시 데이터를 복구할 수 없습니다.'
              : '자격증명을 복호화하려면 마스터 비밀번호를 입력하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="마스터 비밀번호"
                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex justify-center items-center space-x-2"
          >
            {isSetup ? <span>볼트 생성</span> : <><Unlock className="w-4 h-4" /> <span>잠금 해제</span></>}
          </button>
        </form>

        {!isSetup && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                if (window.confirm("모든 데이터가 삭제됩니다. 정말로 초기화하시겠습니까?")) {
                  dbService.clearDatabase();
                  window.location.reload();
                }
              }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              볼트 초기화 (데이터 삭제됨)
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default Login;