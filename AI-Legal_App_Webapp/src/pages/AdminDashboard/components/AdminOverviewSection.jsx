import React from 'react';
import { 
  Users, CreditCard, Package, Activity, TrendingUp, HardDrive, AlertTriangle, Lightbulb 
} from 'lucide-react';

export default function AdminOverviewSection({ stats }) {
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Users', value: stats.activeUsers || 0, icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Premium Users', value: stats.premiumUsers || 0, icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Monthly Revenue', value: `₹${stats.revenueMonth || 0}`, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Storage Used', value: `${stats.storageUsed || 0} MB`, icon: HardDrive, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Open Bugs', value: stats.openBugs || 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Feature Requests', value: stats.pendingFeatures || 0, icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
