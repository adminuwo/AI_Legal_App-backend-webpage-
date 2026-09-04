import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import PrimaryButton from './PrimaryButton';
import NewAppModal from './NewAppModal';
import { ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AppListTable = ({ apps, onAppCreated }) => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAppCreated = (newApp) => {
        if (onAppCreated) {
            onAppCreated(newApp);
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Your Apps</h3>
                    <PrimaryButton onClick={() => setIsModalOpen(true)} className="text-xs px-3 py-1">
                        + New App
                    </PrimaryButton>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    App Name
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Pricing
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    Rating
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {apps.map((app) => (
                                <tr
                                    key={app._id || app.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                                    onClick={() => navigate(`/vendor/apps/${app._id || app.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{app.agentName || app.name}</div>
                                            <ChevronRight size={14} className="ml-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-600">Free + Paid</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Star size={14} className="text-yellow-400 fill-yellow-400 mr-1.5" />
                                            <span className="text-sm font-bold text-gray-900">{app.rating ? app.rating.toFixed(1) : '0.0'}</span>
                                            {app.reviewCount > 0 && <span className="text-xs text-gray-400 ml-1">({app.reviewCount})</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New App Modal */}
            <NewAppModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAppCreated={handleAppCreated}
            />
        </>
    );
};

export default AppListTable;
