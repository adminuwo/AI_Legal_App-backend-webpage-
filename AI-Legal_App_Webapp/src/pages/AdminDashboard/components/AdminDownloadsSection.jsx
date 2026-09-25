import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Download, RefreshCw, RotateCw, Calendar, Globe, Smartphone, Apple, 
  TrendingUp, Users, ArrowLeft, Search, Filter, FileSpreadsheet, FileText, 
  FileDown, ChevronRight, CheckCircle, Info, Layers, ChevronDown, Award, BarChart3,
  Radio, Zap, X, MapPin, UserX, UserCheck, Clock, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend 
} from 'recharts';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import apiService from '../../../services/apiService';
import { COUNTRIES } from '../../../constants/countries';
import { STATES_BY_COUNTRY, INDIAN_STATES_LIST } from '../../../constants/states';

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '60d', label: '60 Days' },
  { id: '90d', label: '90 Days' },
  { id: '1y', label: '1 Year' },
  { id: '2y', label: '2 Years' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' }
];

export default function AdminDownloadsSection() {
  // Global Filters
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // UI / State Drill-down
  const [selectedCountryDetail, setSelectedCountryDetail] = useState(null);
  const [countryDetailData, setCountryDetailData] = useState(null);
  const [loadingCountryDetail, setLoadingCountryDetail] = useState(false);

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingHistorical, setSyncingHistorical] = useState(false);
  const [syncingGa4, setSyncingGa4] = useState(false);
  const [syncingSilent, setSyncingSilent] = useState(false);

  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    yesterday: 0,
    last7Days: 0,
    last30Days: 0,
    last90Days: 0,
    last2Years: 0,
    android: 0,
    ios: 0,
    web: 0,
    firstTimeInstallers: 0,
    uninstalls: 0,
    activeInstalls: 0
  });

  const [countriesList, setCountriesList] = useState([]);
  const [countriesTotalCount, setCountriesTotalCount] = useState(0);
  const [countrySummaryTotals, setCountrySummaryTotals] = useState(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [countrySortBy, setCountrySortBy] = useState('totalInstalls');
  const [countrySortOrder, setCountrySortOrder] = useState('desc');
  const [countryPage, setCountryPage] = useState(1);
  const [countryPageSize, setCountryPageSize] = useState(25);

  const [trendsData, setTrendsData] = useState([]);
  const [chartMode, setChartMode] = useState('split'); // 'split' | 'total'
  const [exportOpen, setExportOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  // Uninstalls Modal States
  const [showUninstallsModal, setShowUninstallsModal] = useState(false);
  const [uninstallsLoading, setUninstallsLoading] = useState(false);
  const [uninstallsList, setUninstallsList] = useState([]);
  const [uninstallsPagination, setUninstallsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [uninstallsStats, setUninstallsStats] = useState({ total: 0, android: 0, ios: 0, registered: 0, guest: 0 });
  const [uninstallsSearch, setUninstallsSearch] = useState('');
  const [uninstallsPlatform, setUninstallsPlatform] = useState('all');
  const [uninstallsUserType, setUninstallsUserType] = useState('all'); // 'all' | 'registered' | 'guest'
  const [uninstallsPage, setUninstallsPage] = useState(1);

  const fetchUninstalledUsers = useCallback(async (
    page = 1,
    search = uninstallsSearch,
    platform = uninstallsPlatform,
    userType = uninstallsUserType
  ) => {
    setUninstallsLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: (search || '').trim(),
        platform,
        userType,
        range: dateRange,
        country: countryFilter
      };
      if (dateRange === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const res = await apiService.getUninstalledUsers(params);
      if (res?.success) {
        setUninstallsList(res.uninstalls || []);
        setUninstallsPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        setUninstallsStats(res.stats || { total: 0, android: 0, ios: 0, registered: 0, guest: 0 });
        setUninstallsPage(page);
      }
    } catch (err) {
      console.error('Failed to load uninstalled users:', err);
      toast.error('Failed to load uninstalled users data.');
    } finally {
      setUninstallsLoading(false);
    }
  }, [dateRange, countryFilter, startDate, endDate, uninstallsSearch, uninstallsPlatform, uninstallsUserType]);

  const handleOpenUninstallsModal = (initialUserType = 'all') => {
    setShowUninstallsModal(true);
    setUninstallsSearch('');
    setUninstallsPlatform('all');
    setUninstallsUserType(initialUserType);
    fetchUninstalledUsers(1, '', 'all', initialUserType);
  };

  const handleExportUninstallsCSV = () => {
    if (!uninstallsList || uninstallsList.length === 0) {
      toast.error('No uninstalls data to export');
      return;
    }
    const rows = uninstallsList.map((item, idx) => ({
      '#': idx + 1,
      'User / Device': item.user ? `${item.user.name} (${item.user.email || 'No email'})` : `Guest (${item.installId})`,
      'Platform': (item.platform || 'android').toUpperCase(),
      'Country': item.country || 'India',
      'State': item.state || 'Unspecified Region',
      'City': item.city || 'N/A',
      'Device Type': item.deviceType || 'phone',
      'OS Version': item.deviceOSVersion || 'N/A',
      'Registered User': item.isRegistered ? 'Yes' : 'No',
      'Uninstalled On': item.uninstalledAt ? new Date(item.uninstalledAt).toLocaleString('en-IN') : 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Uninstalled Devices');
    XLSX.writeFile(workbook, `Uninstalls_Telemetry_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Uninstalls report exported to Excel!');
  };

  // Available states for selected country filter
  const availableStates = useMemo(() => {
    if (!countryFilter) return [];
    if (countryFilter.toLowerCase() === 'india') {
      return INDIAN_STATES_LIST.map(s => s.name);
    }
    const match = Object.keys(STATES_BY_COUNTRY).find(
      c => c.toLowerCase() === countryFilter.toLowerCase()
    );
    return match ? STATES_BY_COUNTRY[match] : [];
  }, [countryFilter]);

  // Load summary, countries, trends
  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = {
        range: dateRange,
        platform: platformFilter,
        country: countryFilter,
        state: stateFilter
      };

      if (dateRange === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const [sumRes, countRes, trendRes] = await Promise.all([
        apiService.getDownloadAnalyticsSummary(params),
        apiService.getDownloadAnalyticsCountries({
          ...params,
          search: countrySearch,
          sortBy: countrySortBy,
          sortOrder: countrySortOrder,
          page: countryPage,
          limit: countryPageSize
        }),
        apiService.getDownloadAnalyticsTrends({
          ...params,
          granularity: (dateRange === 'today' || dateRange === 'yesterday') ? 'hour' : 'day'
        })
      ]);

      if (sumRes?.success && sumRes.summary) {
        setSummary(sumRes.summary);
      }

      if (countRes?.success) {
        setCountriesList(countRes.countries || []);
        const total = countRes.pagination?.totalItems ?? countRes.pagination?.total ?? (countRes.countries || []).length;
        setCountriesTotalCount(total);
        if (countRes.summaryTotals) {
          setCountrySummaryTotals(countRes.summaryTotals);
        } else if (countRes.totalDownloadsSum !== undefined) {
          setCountrySummaryTotals({ totalInstalls: countRes.totalDownloadsSum });
        }
      }

      if (trendRes?.success) {
        setTrendsData(trendRes.trends || []);
      }
    } catch (err) {
      console.error("Failed to load downloads analytics:", err);
      toast.error("Failed to fetch download analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, startDate, endDate, platformFilter, countryFilter, stateFilter, countrySearch, countrySortBy, countrySortOrder, countryPage, countryPageSize]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch Country Drill-Down when a country is selected
  const fetchCountryDetail = useCallback(async (countryName) => {
    if (!countryName) return;
    setLoadingCountryDetail(true);
    try {
      const params = {
        range: dateRange,
        platform: platformFilter
      };
      if (dateRange === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const res = await apiService.getDownloadAnalyticsCountryDetails(countryName, params);
      if (res?.success) {
        setCountryDetailData(res);
      }
    } catch (err) {
      console.error("Failed to load country detail:", err);
      toast.error(`Failed to load details for ${countryName}`);
    } finally {
      setLoadingCountryDetail(false);
    }
  }, [dateRange, platformFilter, startDate, endDate]);

  const handleSelectCountry = (countryName) => {
    setSelectedCountryDetail(countryName);
    setStateSearch('');
    fetchCountryDetail(countryName);
  };

  const handleBackToCountries = () => {
    setSelectedCountryDetail(null);
    setCountryDetailData(null);
  };

  // Sync historical users to AppInstall
  const handleSyncHistorical = async () => {
    setSyncingHistorical(true);
    try {
      const res = await apiService.syncHistoricalDownloads();
      if (res?.success) {
        toast.success(res.message || "Historical install telemetry synced successfully!");
        fetchAnalytics(true);
      } else {
        toast.error("Sync completed with warnings.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync historical users.");
    } finally {
      setSyncingHistorical(false);
    }
  };

  // Sync GA4 Uninstalls
  const handleSyncGa4 = async () => {
    setSyncingGa4(true);
    try {
      const res = await apiService.syncGaUninstalls();
      if (res?.success) {
        toast.success(res.message || "GA4 uninstalls synced successfully!");
        fetchAnalytics(true);
      } else if (res?.needsConfig) {
        toast((t) => (
          <div className="text-xs">
            <p className="font-bold text-slate-900 dark:text-white">GA4 Setup Required</p>
            <p className="mt-1 text-slate-600 dark:text-zinc-300">{res.message}</p>
            <p className="mt-1 text-[11px] text-[#B88B2A] font-semibold">
              Add GA4_PROPERTY_ID to .env &amp; invite {res.serviceAccountEmail} in GA4 console.
            </p>
          </div>
        ), { duration: 6000 });
      } else {
        toast.error(res?.message || "GA4 sync completed with warnings.");
      }
    } catch (err) {
      console.error("GA4 sync error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to sync GA4 uninstalls.";
      if (err.response?.data?.needsConfig) {
        toast.error("GA4 Property ID not set in .env. See docs.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSyncingGa4(false);
    }
  };

  // Sync Real-Time Uninstalls via Silent Mobile Push Ping (Same-day live detection)
  const handleSyncSilent = async () => {
    setSyncingSilent(true);
    try {
      const res = await apiService.syncSilentUninstalls();
      if (res?.success) {
        toast.success(res.message || `Live sync complete: ${res.uninstalledDetected || 0} uninstalls detected today!`);
        fetchAnalytics(true);
      } else {
        toast.error(res?.message || "Live uninstall sync completed with warnings.");
      }
    } catch (err) {
      console.error("Silent uninstall sync error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to execute live uninstall sync.";
      toast.error(msg);
    } finally {
      setSyncingSilent(false);
    }
  };

  // Export handlers
  const handleExportCSV = async () => {
    try {
      toast.loading("Generating CSV export...", { id: 'export-csv' });
      const params = {
        range: dateRange,
        platform: platformFilter,
        country: countryFilter,
        state: stateFilter
      };
      const res = await apiService.exportDownloadAnalyticsReport(params);
      const rows = res?.data || res?.records;
      if (res?.success && rows) {
        if (!rows.length) {
          toast.error("No data to export", { id: 'export-csv' });
          return;
        }
        const headers = Object.keys(rows[0]).join(',');
        const csvContent = "data:text/csv;charset=utf-8," 
          + [headers, ...rows.map(r => Object.values(r).map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AI_Legal_Downloads_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV export downloaded successfully!", { id: 'export-csv' });
      }
    } catch (err) {
      console.error("CSV Export failed:", err);
      toast.error("CSV export failed", { id: 'export-csv' });
    }
    setExportOpen(false);
  };

  const handleExportExcel = async () => {
    try {
      toast.loading("Generating Excel workbook...", { id: 'export-excel' });
      const params = {
        range: dateRange,
        platform: platformFilter,
        country: countryFilter,
        state: stateFilter
      };
      const res = await apiService.exportDownloadAnalyticsReport(params);
      const rows = res?.data || res?.records;
      if (res?.success && rows) {
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Summary KPIs
        const summaryRows = [
          { Metric: "Scope Range", Value: dateRange.toUpperCase() },
          { Metric: "Total Installs / Downloads", Value: summary.total },
          { Metric: "Active Installs", Value: summary.activeInstalls },
          { Metric: "Android Installs", Value: summary.android },
          { Metric: "iOS Installs", Value: summary.ios },
          { Metric: "Web Portal Active Users", Value: summary.web },
          { Metric: "Today", Value: summary.today },
          { Metric: "Yesterday", Value: summary.yesterday },
          { Metric: "Last 7 Days", Value: summary.last7Days },
          { Metric: "Last 30 Days", Value: summary.last30Days },
          { Metric: "Last 90 Days", Value: summary.last90Days },
          { Metric: "Last 2 Years", Value: summary.last2Years },
          { Metric: "First-time Installers", Value: summary.firstTimeInstallers },
          { Metric: "Reported Uninstalls", Value: summary.uninstalls }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(workbook, wsSummary, "Overview KPIs");

        // Sheet 2: Countries Breakdown
        if (countriesList.length > 0) {
          const wsCountries = XLSX.utils.json_to_sheet(countriesList);
          XLSX.utils.book_append_sheet(workbook, wsCountries, "Country Breakdown");
        }

        // Sheet 3: Raw Telemetry Records
        const wsRaw = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, wsRaw, "Detailed Records");

        XLSX.writeFile(workbook, `AI_Legal_Installs_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel report downloaded!", { id: 'export-excel' });
      }
    } catch (err) {
      console.error("Excel Export failed:", err);
      toast.error("Excel export failed", { id: 'export-excel' });
    }
    setExportOpen(false);
  };

  const handleExportPDF = () => {
    try {
      toast.loading("Generating PDF report...", { id: 'export-pdf' });
      const doc = new jsPDF('p', 'mm', 'a4');

      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("AI Legal App — Downloads & Installs Report", 14, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateRange.toUpperCase()} | Platform: ${platformFilter.toUpperCase()}`, 14, 28);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 34, 196, 34);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Executive Summary KPIs", 14, 46);

      doc.setFontSize(9);
      let y = 54;
      const kpis = [
        ["Total Installs / Downloads", (summary.total || 0).toLocaleString()],
        ["Active Devices", (summary.activeInstalls || summary.total || 0).toLocaleString()],
        ["Android Platform Installs", (summary.android || 0).toLocaleString()],
        ["iOS Platform Installs", (summary.ios || 0).toLocaleString()],
        ["Web Portal Active Users", (summary.web || 0).toLocaleString()],
        ["Installs Today", (summary.today || 0).toLocaleString()],
        ["Installs Yesterday", (summary.yesterday || 0).toLocaleString()],
        ["Last 7 Days Velocity", (summary.last7Days || 0).toLocaleString()],
        ["Last 30 Days Velocity", (summary.last30Days || 0).toLocaleString()],
        ["Last 90 Days", (summary.last90Days || 0).toLocaleString()],
        ["Last 2 Years", (summary.last2Years || 0).toLocaleString()],
        ["First-time Installers", (summary.firstTimeInstallers || 0).toLocaleString()],
        ["Reported Uninstalls", (summary.uninstalls || 0).toLocaleString()]
      ];

      kpis.forEach(([label, val], idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const xPos = col === 0 ? 14 : 110;
        const yPos = y + (row * 8);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`${label}:`, xPos, yPos);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(val, xPos + 55, yPos);
      });

      y = y + (Math.ceil(kpis.length / 2) * 8) + 12;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("2. Top Geographic Regions", 14, y);

      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 4, 182, 7, 'F');
      doc.text("Country", 18, y);
      doc.text("Total Installs", 75, y);
      doc.text("Market Share", 115, y);
      doc.text("7-Day Velocity", 155, y);

      y += 7;
      doc.setFont("helvetica", "normal");
      countriesList.slice(0, 15).forEach((c, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 182, 6.5, 'F');
        }
        doc.setTextColor(30, 41, 59);
        doc.text(c.country || 'Unknown', 18, y);
        doc.text((c.totalInstalls || 0).toLocaleString(), 75, y);
        doc.text(`${c.percentageOfTotal || 0}%`, 115, y);
        doc.text((c.last7Days || 0).toLocaleString(), 155, y);
        y += 6.5;
      });

      doc.save(`AI_Legal_Downloads_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF summary downloaded!", { id: 'export-pdf' });
    } catch (err) {
      console.error("PDF Export failed:", err);
      toast.error("PDF export failed", { id: 'export-pdf' });
    }
    setExportOpen(false);
  };

  // Filtered states in country detail
  const filteredStates = useMemo(() => {
    if (!countryDetailData?.states) return [];
    if (!stateSearch.trim()) return countryDetailData.states;
    return countryDetailData.states.filter(s => 
      s.state?.toLowerCase().includes(stateSearch.toLowerCase())
    );
  }, [countryDetailData, stateSearch]);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Header & Actions Bar (Phone Responsive) */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#B88B2A]/10 text-[#B88B2A] border border-[#B88B2A]/20 shrink-0">
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Downloads & Installs</h2>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
              Production install tracking across Android, iOS, country jurisdictions, and regional territories.
            </p>
          </div>
        </div>

        {/* Global Action Buttons - Full width grid on phones, flex on larger screens */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleSyncHistorical}
            disabled={syncingHistorical}
            title="Sync all registered database users into device telemetry records"
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 shrink-0 ${syncingHistorical ? 'animate-spin text-[#B88B2A]' : 'text-slate-500'}`} />
            <span className="truncate">{syncingHistorical ? 'Syncing...' : 'Sync DB'}</span>
          </button>

          <button
            onClick={handleSyncGa4}
            disabled={syncingGa4}
            title="Sync mobile app uninstalls from Google Analytics (GA4)"
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${syncingGa4 ? 'animate-spin text-[#B88B2A]' : 'text-amber-600 dark:text-amber-400'}`} />
            <span className="truncate">{syncingGa4 ? 'Syncing GA4...' : 'Sync GA4'}</span>
          </button>

          <button
            onClick={handleSyncSilent}
            disabled={syncingSilent}
            title="Real-time same-day mobile uninstall detection via silent push ping"
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-800/60 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Radio className={`w-3.5 h-3.5 shrink-0 ${syncingSilent ? 'animate-spin text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="truncate">{syncingSilent ? 'Pinging...' : 'Sync Live'}</span>
          </button>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-[#B88B2A]' : 'text-slate-500'}`} />
            <span className="truncate">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="w-full sm:w-auto flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#B88B2A] hover:bg-[#a67c24] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-90 shrink-0" />
            </button>

            {exportOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Export CSV</p>
                    <p className="text-[10px] text-slate-400">Raw install data</p>
                  </div>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold">Export Excel (.xlsx)</p>
                    <p className="text-[10px] text-slate-400">Multi-sheet workbook</p>
                  </div>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold">Export PDF</p>
                    <p className="text-[10px] text-slate-400">Printable summary</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Global Filters Bar (Phone Responsive) */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Range Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 flex-1 xs:flex-initial min-w-[130px]">
            <Calendar className="w-3.5 h-3.5 text-[#B88B2A] shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 shrink-0">Range:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer pr-1 w-full"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Country Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 flex-1 xs:flex-initial min-w-[140px]">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setStateFilter('');
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer pr-1 w-full"
            >
              <option value="" className="bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">All Countries</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.name} className="bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* State Dropdown (Conditional when country selected) */}
          {countryFilter && availableStates.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 flex-1 xs:flex-initial min-w-[140px]">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none cursor-pointer pr-1 w-full"
              >
                <option value="" className="bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">All States / Regions</option>
                {availableStates.map(st => (
                  <option key={st} value={st} className="bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Pickers (if dateRange === 'custom') */}
          {dateRange === 'custom' && (
            <div className="flex flex-wrap xs:flex-nowrap items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 w-full sm:w-auto">
              <span className="text-[11px] text-slate-500 font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
          )}

          {(countryFilter || stateFilter || (dateRange !== 'all')) && (
            <button
              onClick={() => {
                setCountryFilter('');
                setStateFilter('');
                setDateRange('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-[#B88B2A] hover:underline font-bold transition-colors cursor-pointer px-1 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Platform Toggle (Equal width on mobile) */}
        <div className="grid grid-cols-4 sm:flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800 w-full md:w-auto shrink-0">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              platformFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPlatformFilter('android')}
            className={`flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              platformFilter === 'android'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
            }`}
          >
            <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setPlatformFilter('ios')}
            className={`flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              platformFilter === 'ios'
                ? 'bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
            }`}
          >
            <Apple className="w-3 h-3 text-sky-600 shrink-0" />
            <span>iOS</span>
          </button>
          <button
            onClick={() => setPlatformFilter('web')}
            className={`flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              platformFilter === 'web'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400'
            }`}
          >
            <Globe className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Web</span>
          </button>
        </div>
      </div>

      {/* 3. COMPACT SUMMARY KPI CARDS (Balanced on Mobile - Total Installs spans 2 cols, remaining 10 in pairs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* Total Downloads - Featured on Mobile */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#1E293B] border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Installs</span>
            <div className="p-1 rounded-md bg-[#B88B2A]/10 text-[#B88B2A] border border-[#B88B2A]/20">
              <Download className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.total || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5 shrink-0" />
              {summary.activeInstalls || summary.total} active devices
            </p>
          </div>
        </div>

        {/* Today */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.today || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">First 24 hrs</p>
          </div>
        </div>

        {/* Yesterday */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yesterday</span>
            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Calendar className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.yesterday || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Previous day</p>
          </div>
        </div>

        {/* Last 7 Days */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 7 Days</span>
            <div className="p-1 rounded-md bg-violet-500/10 text-violet-600 border border-violet-500/20">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.last7Days || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Weekly total</p>
          </div>
        </div>

        {/* Last 30 Days */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 30 Days</span>
            <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.last30Days || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Monthly run-rate</p>
          </div>
        </div>

        {/* Last 90 Days */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 90 Days</span>
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Calendar className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.last90Days || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Quarterly</p>
          </div>
        </div>

        {/* Last 2 Years */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 2 Years</span>
            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Calendar className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.last2Years || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Cumulative</p>
          </div>
        </div>

        {/* Android Installs */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Android</span>
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Smartphone className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.android || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
              {summary.total > 0 ? `${Math.round((summary.android / summary.total) * 100)}% share` : '0%'}
            </p>
          </div>
        </div>

        {/* iOS Installs */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">iOS</span>
            <div className="p-1 rounded-md bg-sky-500/10 text-sky-600 border border-sky-500/20">
              <Apple className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.ios || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-sky-600 font-semibold mt-0.5 truncate">
              {summary.total > 0 ? `${Math.round((summary.ios / summary.total) * 100)}% share` : '0%'}
            </p>
          </div>
        </div>

        {/* Web Portal Users */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Web Portal</span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <Globe className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.web || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate">
              Active Users
            </p>
          </div>
        </div>

        {/* First-time Users */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First Time</span>
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : (summary.firstTimeInstallers || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Unique devices</p>
          </div>
        </div>

        {/* Uninstalls */}
        <div 
          onClick={handleOpenUninstallsModal}
          className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          title="Click to view detailed list of uninstalled devices & users"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 group-hover:text-rose-600 flex items-center gap-1">
              Uninstall Rate
              <span className="text-[9px] font-semibold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                • View list
              </span>
            </span>
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-xs">
              <ArrowLeft className="w-3 h-3 rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {loading ? '...' : (summary.total > 0 ? `${((summary.uninstalls / summary.total) * 100).toFixed(1)}%` : '0%')}
              </p>
              <span className="text-[10px] text-rose-500 font-bold group-hover:underline flex items-center gap-0.5">
                Details &rarr;
              </span>
            </div>
            <p className="text-[10px] text-rose-500 font-semibold mt-0.5 truncate">
              Overall churn rate
            </p>
          </div>
        </div>
      </div>

      {/* 4. Time-Series Trends Chart (Phone Responsive) */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#B88B2A]" />
              Installation & Download Trends
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Daily telemetry velocity for {dateRange.toUpperCase()} ({platformFilter.toUpperCase()})
            </p>
          </div>

          <div className="flex items-center self-start sm:self-auto bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800 text-xs">
            <button
              onClick={() => setChartMode('split')}
              className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                chartMode === 'split' 
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Split Platforms
            </button>
            <button
              onClick={() => setChartMode('total')}
              className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                chartMode === 'total' 
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Total
            </button>
          </div>
        </div>

        <div className="h-56 sm:h-64 lg:h-72 w-full pt-2">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#B88B2A]" />
              Loading trends...
            </div>
          ) : trendsData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold">
              <Calendar className="w-6 h-6 mb-1 opacity-40" />
              No telemetry in range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotalLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B88B2A" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#B88B2A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAndroidLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIosLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWebLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const parts = val.split('-');
                    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                  }}
                />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    color: '#0f172a',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                  itemStyle={{ fontWeight: 700 }}
                  formatter={(value, name) => {
                    const n = String(name || '').toLowerCase();
                    const label = n.includes('android') ? 'Android' : n.includes('ios') ? 'iOS' : n.includes('web') ? 'Web' : 'Total Installs';
                    return [(value || 0).toLocaleString(), label];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                {chartMode === 'total' ? (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Installs"
                    stroke="#B88B2A"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotalLight)"
                  />
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="android"
                      name="Android"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAndroidLight)"
                    />
                    <Area
                      type="monotone"
                      dataKey="ios"
                      name="iOS"
                      stroke="#0284c7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIosLight)"
                    />
                    <Area
                      type="monotone"
                      dataKey="web"
                      name="Web"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWebLight)"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. Country Breakdown OR State Drill-Down (Light Theme & Phone Responsive) */}
      {selectedCountryDetail ? (
        /* State/Region Drill-Down View */
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center space-x-2.5 flex-wrap">
              <button
                onClick={handleBackToCountries}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>All Countries</span>
              </button>
              <span className="text-slate-300 dark:text-zinc-700">/</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#B88B2A] shrink-0" />
                <span>{selectedCountryDetail} — State & Regional Downloads</span>
              </h3>
            </div>

            <div className="relative w-full sm:w-auto">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter states..."
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#B88B2A] w-full sm:w-44"
              />
            </div>
          </div>

          {/* Country Snapshot KPIs */}
          {countryDetailData?.countryMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Total in {selectedCountryDetail}</p>
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {(countryDetailData.countryMetrics.total || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-[#B88B2A] font-semibold mt-0.5 truncate">
                  {countryDetailData.countryMetrics.percentageOfTotal || 0}% of global
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 shrink-0" />
                  <span>Android</span>
                </p>
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {(countryDetailData.countryMetrics.android || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                  {countryDetailData.countryMetrics.total > 0 ? Math.round((countryDetailData.countryMetrics.android / countryDetailData.countryMetrics.total) * 100) : 0}% country share
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Apple className="w-3 h-3 shrink-0" />
                  <span>iOS</span>
                </p>
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {(countryDetailData.countryMetrics.ios || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                  {countryDetailData.countryMetrics.total > 0 ? Math.round((countryDetailData.countryMetrics.ios / countryDetailData.countryMetrics.total) * 100) : 0}% country share
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">30-Day Installs</p>
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {(countryDetailData.countryMetrics.last30Days || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate">velocity run-rate</p>
              </div>
            </div>
          )}

          {/* Swipe indicator for mobile */}
          <div className="sm:hidden text-[10px] text-slate-400 dark:text-zinc-500 flex items-center justify-between px-1">
            <span>← Swipe table horizontally</span>
            <span>All columns →</span>
          </div>

          {/* State/Region Table with minimum width for clean mobile scrolling */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left border-collapse text-xs min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3">State / Province / Region</th>
                  <th className="py-2.5 px-3">Total Installs</th>
                  <th className="py-2.5 px-3">Country Share</th>
                  <th className="py-2.5 px-3">Android / iOS</th>
                  <th className="py-2.5 px-3">Last 7 Days</th>
                  <th className="py-2.5 px-3">Last 30 Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                {loadingCountryDetail ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#B88B2A]" />
                      Loading regions...
                    </td>
                  </tr>
                ) : filteredStates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No state telemetry recorded for {selectedCountryDetail}.
                    </td>
                  </tr>
                ) : (
                  filteredStates.map((st, idx) => {
                    const countryTotal = countryDetailData?.countryMetrics?.total || 1;
                    const pct = Math.round(((st.totalInstalls || 0) / countryTotal) * 100);
                    return (
                      <tr key={st.state || idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B88B2A] shrink-0" />
                          <span className="truncate">{st.state || 'General Territory'}</span>
                        </td>
                        <td className="py-2 px-3 font-black text-slate-900 dark:text-white">
                          {(st.totalInstalls || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-14 sm:w-16 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-[#B88B2A] h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{st.android || 0}</span>
                          <span className="text-slate-300 dark:text-zinc-700 mx-1">/</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold">{st.ios || 0}</span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                          {(st.last7Days || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                          {(st.last30Days || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredStates.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 dark:border-zinc-700 text-xs">
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-black text-slate-900 dark:text-white">
                    <td className="py-2.5 px-3">
                      Total ({filteredStates.length} Regions in {selectedCountryDetail})
                    </td>
                    <td className="py-2.5 px-3 text-[#B88B2A]">
                      {(countryDetailData?.countryMetrics?.total ?? filteredStates.reduce((acc, s) => acc + (s.totalInstalls || 0), 0)).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      100%
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {(countryDetailData?.countryMetrics?.android ?? filteredStates.reduce((acc, s) => acc + (s.android || 0), 0)).toLocaleString()}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700 mx-1">/</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        {(countryDetailData?.countryMetrics?.ios ?? filteredStates.reduce((acc, s) => acc + (s.ios || 0), 0)).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      {filteredStates.reduce((acc, s) => acc + (s.last7Days || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      {(countryDetailData?.countryMetrics?.last30Days ?? filteredStates.reduce((acc, s) => acc + (s.last30Days || 0), 0)).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* Countries Master Table (Light theme & Phone Responsive) */
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#B88B2A] shrink-0" />
                <span>Downloads by Country & Territory</span>
                {countriesTotalCount > 0 && (
                  <span className="text-[10px] font-bold text-[#B88B2A] bg-[#B88B2A]/10 border border-[#B88B2A]/20 px-2 py-0.5 rounded-full">
                    {countriesTotalCount} Countries
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Click any country row to drill-down into its state / regional distribution
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={countrySearch}
                  onChange={(e) => {
                    setCountrySearch(e.target.value);
                    setCountryPage(1);
                  }}
                  className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#B88B2A] w-full sm:w-36"
                />
              </div>

              {/* Page Size */}
              <select
                value={countryPageSize}
                onChange={(e) => {
                  setCountryPageSize(Number(e.target.value));
                  setCountryPage(1);
                }}
                className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                title="Rows per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>All (100)</option>
              </select>

              {/* Sort */}
              <select
                value={countrySortBy}
                onChange={(e) => setCountrySortBy(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="totalInstalls">Most Installs</option>
                <option value="today">Today's Installs</option>
                <option value="last7Days">7-Day Velocity</option>
                <option value="last30Days">30-Day Velocity</option>
                <option value="country">Country Name</option>
              </select>
            </div>
          </div>

          {/* Swipe indicator for mobile */}
          <div className="sm:hidden text-[10px] text-slate-400 dark:text-zinc-500 flex items-center justify-between px-1">
            <span>← Swipe table horizontally</span>
            <span>All metrics →</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left border-collapse text-xs min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold border-b border-slate-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3"># & Country</th>
                  <th className="py-2.5 px-3">Total Installs</th>
                  <th className="py-2.5 px-3">% Share</th>
                  <th className="py-2.5 px-3">Android / iOS</th>
                  <th className="py-2.5 px-3">Today</th>
                  <th className="py-2.5 px-3">7 Days</th>
                  <th className="py-2.5 px-3">30 Days</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#B88B2A]" />
                      Loading country breakdown...
                    </td>
                  </tr>
                ) : countriesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No country telemetry matches your filter.
                    </td>
                  </tr>
                ) : (
                  countriesList.map((item, idx) => {
                    const isTop1 = idx === 0 && countryPage === 1;
                    const countryMeta = COUNTRIES.find(
                      c => c.name.toLowerCase() === item.country?.toLowerCase() || c.code === item.countryCode
                    );
                    const flag = countryMeta?.flag || '🌐';

                    return (
                      <tr 
                        key={item.country || idx}
                        onClick={() => handleSelectCountry(item.country)}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 ${
                            isTop1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                          }`}>
                            {idx + 1 + ((countryPage - 1) * countryPageSize)}
                          </span>
                          <span className="text-sm shrink-0">{flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-slate-900 dark:text-white group-hover:text-[#B88B2A] transition-colors truncate">
                                {item.country || 'Unknown Region'}
                              </span>
                              {isTop1 && (
                                <span className="px-1 py-0.2 text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-300 rounded flex items-center gap-0.5 shrink-0">
                                  <Award className="w-2.5 h-2.5" />
                                  #1
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">{item.countryCode || 'GL'}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">
                          {(item.totalInstalls || 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-14 sm:w-16 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-[#B88B2A] h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(3, item.percentageOfTotal || 0))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">{item.percentageOfTotal || 0}%</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.android || 0}</span>
                          <span className="text-slate-300 dark:text-zinc-700 mx-1">/</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold">{item.ios || 0}</span>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                          {(item.today || 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                          {(item.last7Days || 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-zinc-300">
                          {(item.last30Days || 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCountry(item.country);
                            }}
                            className="inline-flex items-center space-x-0.5 text-xs font-bold text-[#B88B2A] hover:text-[#9e7520] px-2 py-1 rounded-md hover:bg-[#B88B2A]/10 transition-all cursor-pointer"
                          >
                            <span>States</span>
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Summary & Totals */}
              {countriesList.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 dark:border-zinc-700 text-xs">
                  {countriesTotalCount > countriesList.length && (
                    <tr className="bg-slate-50/70 dark:bg-zinc-900/70 text-slate-600 dark:text-zinc-400 font-semibold border-b border-slate-100 dark:border-zinc-800">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-700 dark:text-zinc-300">
                          Current Page ({countriesList.length} of {countriesTotalCount})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-zinc-200">
                        {countriesList.reduce((acc, c) => acc + (c.totalInstalls || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {countriesList.reduce((acc, c) => acc + (c.percentageOfTotal || 0), 0).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <span className="text-emerald-600 font-bold">{countriesList.reduce((acc, c) => acc + (c.android || 0), 0)}</span>
                        <span className="text-slate-300 dark:text-zinc-700 mx-1">/</span>
                        <span className="text-sky-600 font-bold">{countriesList.reduce((acc, c) => acc + (c.ios || 0), 0)}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {countriesList.reduce((acc, c) => acc + (c.today || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {countriesList.reduce((acc, c) => acc + (c.last7Days || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {countriesList.reduce((acc, c) => acc + (c.last30Days || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[10px] text-slate-400">
                        Page Sum
                      </td>
                    </tr>
                  )}
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-black text-slate-900 dark:text-white">
                    <td className="py-2.5 px-3 flex items-center space-x-1.5 text-slate-900 dark:text-white">
                      <Globe className="w-3.5 h-3.5 text-[#B88B2A] shrink-0" />
                      <span>Grand Total ({countriesTotalCount} Countries)</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#B88B2A] text-sm">
                      {(countrySummaryTotals?.totalInstalls ?? summary.total).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      100%
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {(countrySummaryTotals?.android ?? summary.android).toLocaleString()}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700 mx-1">/</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        {(countrySummaryTotals?.ios ?? summary.ios).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      {(countrySummaryTotals?.today ?? summary.today).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      {(countrySummaryTotals?.last7Days ?? summary.last7Days).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-zinc-300">
                      {(countrySummaryTotals?.last30Days ?? summary.last30Days).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[10px] text-slate-400 font-normal">
                      Overall
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {countriesTotalCount > countryPageSize && (
            <div className="flex flex-col xs:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
              <span className="font-medium">
                Showing {((countryPage - 1) * countryPageSize) + 1} - {Math.min(countryPage * countryPageSize, countriesTotalCount)} of {countriesTotalCount} countries
              </span>
              <div className="flex items-center space-x-1">
                <button
                  disabled={countryPage <= 1}
                  onClick={() => setCountryPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 dark:text-zinc-200 cursor-pointer"
                >
                  Prev
                </button>
                {Array.from({ length: Math.ceil(countriesTotalCount / countryPageSize) }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCountryPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      countryPage === pg 
                        ? 'bg-[#B88B2A] text-white shadow-xs' 
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={countryPage * countryPageSize >= countriesTotalCount}
                  onClick={() => setCountryPage(p => p + 1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 dark:text-zinc-200 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Uninstalled Devices & Users Drill-down Modal */}
      {showUninstallsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-zinc-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      Uninstalled Devices & Users Telemetry
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                        {(uninstallsPagination.total || 0).toLocaleString()} Records
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Telemetry for uninstalled mobile devices, locations (Country/State), and user accounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleExportUninstallsCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                  title="Export Uninstalls List to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export Excel
                </button>
                <button
                  onClick={() => setShowUninstallsModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Banner - Fully Interactive Filters */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-100/70 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Android Uninstalls Card */}
              <div 
                onClick={() => {
                  const next = uninstallsPlatform === 'android' ? 'all' : 'android';
                  setUninstallsPlatform(next);
                  fetchUninstalledUsers(1, uninstallsSearch, next, uninstallsUserType);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none group hover:shadow-xs ${
                  uninstallsPlatform === 'android'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-zinc-800/80 border-slate-200/60 dark:border-zinc-700/60 hover:border-emerald-300'
                }`}
                title="Click to filter by Android devices"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Android Uninstalls</p>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{uninstallsStats.android || 0}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uninstallsPlatform === 'android' ? 'bg-emerald-600 text-white' : 'text-slate-400 group-hover:text-emerald-600'}`}>
                  {uninstallsPlatform === 'android' ? 'Active' : 'Filter'}
                </span>
              </div>

              {/* iOS Uninstalls Card */}
              <div 
                onClick={() => {
                  const next = uninstallsPlatform === 'ios' ? 'all' : 'ios';
                  setUninstallsPlatform(next);
                  fetchUninstalledUsers(1, uninstallsSearch, next, uninstallsUserType);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none group hover:shadow-xs ${
                  uninstallsPlatform === 'ios'
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30'
                    : 'bg-white dark:bg-zinc-800/80 border-slate-200/60 dark:border-zinc-700/60 hover:border-sky-300'
                }`}
                title="Click to filter by iOS devices"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/50">
                    <Apple className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">iOS Uninstalls</p>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{uninstallsStats.ios || 0}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uninstallsPlatform === 'ios' ? 'bg-sky-600 text-white' : 'text-slate-400 group-hover:text-sky-600'}`}>
                  {uninstallsPlatform === 'ios' ? 'Active' : 'Filter'}
                </span>
              </div>

              {/* Registered Users Card (INTERACTIVE) */}
              <div 
                onClick={() => {
                  const next = uninstallsUserType === 'registered' ? 'all' : 'registered';
                  setUninstallsUserType(next);
                  fetchUninstalledUsers(1, uninstallsSearch, uninstallsPlatform, next);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none group hover:shadow-xs ${
                  uninstallsUserType === 'registered'
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-white dark:bg-zinc-800/80 border-slate-200/60 dark:border-zinc-700/60 hover:border-indigo-400'
                }`}
                title="Click to view all registered users with email and details"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Registered Users</p>
                    <p className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{uninstallsStats.registered || 0}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uninstallsUserType === 'registered' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                  {uninstallsUserType === 'registered' ? 'Active' : 'Show'}
                </span>
              </div>

              {/* Guest Devices Card */}
              <div 
                onClick={() => {
                  const next = uninstallsUserType === 'guest' ? 'all' : 'guest';
                  setUninstallsUserType(next);
                  fetchUninstalledUsers(1, uninstallsSearch, uninstallsPlatform, next);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none group hover:shadow-xs ${
                  uninstallsUserType === 'guest'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-white dark:bg-zinc-800/80 border-slate-200/60 dark:border-zinc-700/60 hover:border-amber-300'
                }`}
                title="Click to filter guest devices"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/50">
                    <UserX className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Guest Devices</p>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{uninstallsStats.guest || 0}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${uninstallsUserType === 'guest' ? 'bg-amber-600 text-white' : 'text-slate-400 group-hover:text-amber-600'}`}>
                  {uninstallsUserType === 'guest' ? 'Active' : 'Filter'}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col lg:flex-row items-center justify-between gap-2.5">
              {/* Search */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, email, state, country..."
                  value={uninstallsSearch}
                  onChange={(e) => {
                    setUninstallsSearch(e.target.value);
                    fetchUninstalledUsers(1, e.target.value, uninstallsPlatform, uninstallsUserType);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#B88B2A] dark:focus:border-[#B88B2A] text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Controls Group: User Type Filter + Platform Filter */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-between sm:justify-end">
                {/* User Type Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200/60 dark:border-zinc-800 text-xs">
                  <button
                    onClick={() => {
                      setUninstallsUserType('all');
                      fetchUninstalledUsers(1, uninstallsSearch, uninstallsPlatform, 'all');
                    }}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                      uninstallsUserType === 'all'
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    All ({uninstallsStats.total || 0})
                  </button>
                  <button
                    onClick={() => {
                      setUninstallsUserType('registered');
                      fetchUninstalledUsers(1, uninstallsSearch, uninstallsPlatform, 'registered');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                      uninstallsUserType === 'registered'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    Registered ({uninstallsStats.registered || 0})
                  </button>
                  <button
                    onClick={() => {
                      setUninstallsUserType('guest');
                      fetchUninstalledUsers(1, uninstallsSearch, uninstallsPlatform, 'guest');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                      uninstallsUserType === 'guest'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-amber-600'
                    }`}
                  >
                    <UserX className="w-3 h-3" />
                    Guests ({uninstallsStats.guest || 0})
                  </button>
                </div>

                {/* Platform Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200/60 dark:border-zinc-800 text-xs">
                  {['all', 'android', 'ios'].map((plat) => (
                    <button
                      key={plat}
                      onClick={() => {
                        setUninstallsPlatform(plat);
                        fetchUninstalledUsers(1, uninstallsSearch, plat, uninstallsUserType);
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs capitalize transition-all cursor-pointer ${
                        uninstallsPlatform === plat
                          ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
                      }`}
                    >
                      {plat === 'all' ? 'All OS' : plat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table / Content */}
            <div className="flex-1 overflow-auto p-0">
              {uninstallsLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#B88B2A]" />
                  <p className="text-xs font-semibold">Loading uninstalled telemetry records...</p>
                </div>
              ) : uninstallsList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-1">
                  <UserX className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">No uninstalls found</p>
                  <p className="text-xs text-slate-400">No records match the active search or platform filter.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                      <th className="py-2.5 px-3.5">User / Device ID</th>
                      <th className="py-2.5 px-3.5">Platform</th>
                      <th className="py-2.5 px-3.5">Country & State</th>
                      <th className="py-2.5 px-3.5">Device Type / OS</th>
                      <th className="py-2.5 px-3.5">Uninstalled On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                    {uninstallsList.map((item) => {
                      const isIos = (item.platform || '').toLowerCase() === 'ios';
                      return (
                        <tr key={item.id || item.installId} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors">
                          {/* User / Device */}
                          <td className="py-3 px-3.5">
                            {item.user ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                                  {item.user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                    {item.user.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                    {item.user.email || item.user.phone || 'Registered User'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-bold text-[10px] flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                                  ID
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700 dark:text-zinc-300 text-xs">
                                    Guest Device
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]" title={item.installId}>
                                    {item.installId}
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Platform */}
                          <td className="py-3 px-3.5">
                            {isIos ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-zinc-700 dark:text-zinc-100 text-[10px] font-bold shadow-2xs">
                                <Apple className="w-3 h-3" />
                                iOS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                <Smartphone className="w-3 h-3 text-emerald-600" />
                                Android
                              </span>
                            )}
                          </td>

                          {/* Country & State */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {item.state || 'Unspecified Region'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {item.country || 'India'} ({item.countryCode || 'IN'})
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Device Type / OS */}
                          <td className="py-3 px-3.5">
                            <span className="font-medium text-slate-700 dark:text-zinc-300">
                              {item.deviceOSVersion ? item.deviceOSVersion : (isIos ? 'iOS Device' : 'Android Device')}
                            </span>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {item.deviceType || 'Phone'}
                            </p>
                          </td>

                          {/* Uninstalled On */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-zinc-300 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.uninstalledAt ? new Date(item.uninstalledAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : 'Recent'}
                            </div>
                            <p className="text-[10px] text-slate-400 pl-4">
                              {item.uninstalledAt ? new Date(item.uninstalledAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer / Pagination */}
            {uninstallsPagination.totalPages > 1 && (
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-zinc-900/40">
                <span className="font-medium">
                  Showing {((uninstallsPagination.page - 1) * uninstallsPagination.limit) + 1} - {Math.min(uninstallsPagination.page * uninstallsPagination.limit, uninstallsPagination.total)} of {uninstallsPagination.total}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={uninstallsPagination.page <= 1}
                    onClick={() => fetchUninstalledUsers(uninstallsPagination.page - 1, uninstallsSearch, uninstallsPlatform)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-bold text-slate-900 dark:text-white">
                    Page {uninstallsPagination.page} of {uninstallsPagination.totalPages}
                  </span>
                  <button
                    disabled={uninstallsPagination.page >= uninstallsPagination.totalPages}
                    onClick={() => fetchUninstalledUsers(uninstallsPagination.page + 1, uninstallsSearch, uninstallsPlatform)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
