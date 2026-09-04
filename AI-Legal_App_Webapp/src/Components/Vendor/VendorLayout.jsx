import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet } from 'react-router-dom';

const VendorLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Dynamic Vendor Data
    const [vendorName, setVendorName] = useState('Vendor');

    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setVendorName(user.companyName || user.name || 'Vendor');
    }, []);

    const appHealth = "All Good";

    return (
        <div className="min-h-screen bg-background flex font-sans">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar
                    toggleSidebar={toggleSidebar}
                    vendorName={vendorName}
                    appHealth={appHealth}
                />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default VendorLayout;
