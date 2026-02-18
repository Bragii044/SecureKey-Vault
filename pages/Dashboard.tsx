import React, { useMemo } from 'react';
import { CredentialItem } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle, Database, Shield, Plus, ArrowRight, Lock, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  items: CredentialItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const stats = useMemo(() => {
    const today = new Date();
    let expiringCount = 0;
    let expiredCount = 0;
    const serviceCounts: Record<string, number> = {};

    items.forEach(item => {
      // Service Count
      serviceCounts[item.serviceName] = (serviceCounts[item.serviceName] || 0) + 1;

      // Expiry Check
      if (item.expiry) {
        const expDate = new Date(item.expiry);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) expiredCount++;
        else if (diffDays <= 30) expiringCount++;
      }
    });

    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total: items.length, expiringCount, expiredCount, topServices };
  }, [items]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Empty State / Onboarding View
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
        <div className="bg-blue-50 p-6 rounded-full ring-8 ring-blue-50/50">
          <Shield className="w-16 h-16 text-blue-600" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-800">Onyx에 오신 것을 환영합니다</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            브라우저 기반의 API 키 비밀 금고입니다.
            데이터는 마스터 비밀번호로 로컬에서 암호화되며 외부로 전송되지 않습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">1. 자격증명 추가</h3>
            <p className="text-sm text-gray-500">'추가하기'를 클릭하여 API 키, 토큰, 비밀번호 등을 저장하세요.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">2. 안전한 저장</h3>
            <p className="text-sm text-gray-500">모든 데이터는 마스터 비밀번호를 사용하여 AES-256으로 암호화됩니다.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Save className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">3. 안전한 백업</h3>
            <p className="text-sm text-gray-500">설정 메뉴에서 암호화된 볼트를 JSON 파일로 내보낼 수 있습니다.</p>
          </div>
        </div>

        <Link
          to="/add"
          className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 group"
        >
          첫 번째 키 추가하기
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">현황</h2>
        <span className="text-sm text-gray-500">마지막 업데이트: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="총 자격증명"
          value={stats.total}
          icon={Database}
          color="bg-blue-500"
        />
        <StatCard
          title="보안 상태"
          value="안전"
          icon={Shield}
          color="bg-green-500"
        />
        <StatCard
          title="만료 임박"
          value={stats.expiringCount}
          icon={AlertTriangle}
          color="bg-yellow-500"
          alert={stats.expiringCount > 0}
        />
        <StatCard
          title="만료됨"
          value={stats.expiredCount}
          icon={AlertTriangle}
          color="bg-red-500"
          alert={stats.expiredCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        {/* Chart 1: Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">주요 서비스</h3>
          {stats.topServices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topServices} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {stats.topServices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">데이터가 없습니다</div>
          )}
        </div>

        {/* Quick Actions / Recent Activity Placeholder */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">보안 상태</h3>
          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            <div className="w-32 h-32 rounded-full border-8 border-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-center text-gray-600">
              {stats.expiredCount === 0 && stats.expiringCount === 0
                ? "모든 시스템이 정상입니다. 조치할 사항이 없습니다."
                : "주의가 필요합니다. 만료되는 키를 확인하세요."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; icon: any; color: string; alert?: boolean }> = ({ title, value, icon: Icon, color, alert }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border ${alert ? 'border-red-200 bg-red-50' : 'border-gray-100'} transition-all`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-gray-100'}`}>
        <Icon className={`w-6 h-6 ${alert ? 'text-red-500' : 'text-gray-600'}`} />
      </div>
      {alert && <span className="flex h-3 w-3 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h4 className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</h4>
    </div>
  </div>
);

export default Dashboard;