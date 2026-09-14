// Data definition for Indian Courts, Legal Sources, and Jurisdictions

export const INDIAN_COURTS = [
  {
    id: 'sc',
    name: 'Supreme Court of India',
    shortName: 'Supreme Court',
    code: 'SC',
    type: 'APEX',
    city: 'New Delhi',
    jurisdiction: 'Pan-India',
    established: '1950',
    landmarkRatioCount: '15,000+'
  },
  {
    id: 'hc_delhi',
    name: 'Delhi High Court',
    shortName: 'Delhi HC',
    code: 'DHC',
    type: 'HIGH_COURT',
    city: 'New Delhi',
    jurisdiction: 'National Capital Territory of Delhi',
    established: '1966'
  },
  {
    id: 'hc_bombay',
    name: 'Bombay High Court',
    shortName: 'Bombay HC',
    code: 'BOM',
    type: 'HIGH_COURT',
    city: 'Mumbai',
    benches: ['Nagpur', 'Aurangabad', 'Panaji (Goa)'],
    jurisdiction: 'Maharashtra, Goa, Dadra & Nagar Haveli and Daman & Diu',
    established: '1862'
  },
  {
    id: 'hc_allahabad',
    name: 'Allahabad High Court',
    shortName: 'Allahabad HC',
    code: 'ALL',
    type: 'HIGH_COURT',
    city: 'Prayagraj',
    benches: ['Lucknow'],
    jurisdiction: 'Uttar Pradesh',
    established: '1866'
  },
  {
    id: 'hc_calcutta',
    name: 'Calcutta High Court',
    shortName: 'Calcutta HC',
    code: 'CAL',
    type: 'HIGH_COURT',
    city: 'Kolkata',
    benches: ['Jalpaiguri', 'Port Blair'],
    jurisdiction: 'West Bengal, Andaman & Nicobar Islands',
    established: '1862'
  },
  {
    id: 'hc_madras',
    name: 'Madras High Court',
    shortName: 'Madras HC',
    code: 'MAD',
    type: 'HIGH_COURT',
    city: 'Chennai',
    benches: ['Madurai'],
    jurisdiction: 'Tamil Nadu, Puducherry',
    established: '1862'
  },
  {
    id: 'hc_karnataka',
    name: 'Karnataka High Court',
    shortName: 'Karnataka HC',
    code: 'KAR',
    type: 'HIGH_COURT',
    city: 'Bengaluru',
    benches: ['Dharwad', 'Kalaburagi'],
    jurisdiction: 'Karnataka',
    established: '1884'
  },
  {
    id: 'hc_kerala',
    name: 'Kerala High Court',
    shortName: 'Kerala HC',
    code: 'KER',
    type: 'HIGH_COURT',
    city: 'Kochi',
    jurisdiction: 'Kerala, Lakshadweep',
    established: '1956'
  },
  {
    id: 'hc_punjab_haryana',
    name: 'Punjab & Haryana High Court',
    shortName: 'P&H HC',
    code: 'P&H',
    type: 'HIGH_COURT',
    city: 'Chandigarh',
    jurisdiction: 'Punjab, Haryana, Chandigarh',
    established: '1966'
  },
  {
    id: 'hc_gujarat',
    name: 'Gujarat High Court',
    shortName: 'Gujarat HC',
    code: 'GUJ',
    type: 'HIGH_COURT',
    city: 'Ahmedabad',
    jurisdiction: 'Gujarat',
    established: '1960'
  },
  {
    id: 'hc_madhya_pradesh',
    name: 'Madhya Pradesh High Court',
    shortName: 'MP HC',
    code: 'MPH',
    type: 'HIGH_COURT',
    city: 'Jabalpur',
    benches: ['Gwalior', 'Indore'],
    jurisdiction: 'Madhya Pradesh',
    established: '1956'
  },
  {
    id: 'hc_rajasthan',
    name: 'Rajasthan High Court',
    shortName: 'Rajasthan HC',
    code: 'RAJ',
    type: 'HIGH_COURT',
    city: 'Jodhpur',
    benches: ['Jaipur'],
    jurisdiction: 'Rajasthan',
    established: '1949'
  },
  {
    id: 'hc_patna',
    name: 'Patna High Court',
    shortName: 'Patna HC',
    code: 'PAT',
    type: 'HIGH_COURT',
    city: 'Patna',
    jurisdiction: 'Bihar',
    established: '1916'
  },
  {
    id: 'hc_andhra_pradesh',
    name: 'Andhra Pradesh High Court',
    shortName: 'AP HC',
    code: 'APH',
    type: 'HIGH_COURT',
    city: 'Amaravati',
    jurisdiction: 'Andhra Pradesh',
    established: '2019'
  },
  {
    id: 'hc_telangana',
    name: 'Telangana High Court',
    shortName: 'Telangana HC',
    code: 'TSH',
    type: 'HIGH_COURT',
    city: 'Hyderabad',
    jurisdiction: 'Telangana',
    established: '2019'
  },
  {
    id: 'hc_chhattisgarh',
    name: 'Chhattisgarh High Court',
    shortName: 'Chhattisgarh HC',
    code: 'CGH',
    type: 'HIGH_COURT',
    city: 'Bilaspur',
    jurisdiction: 'Chhattisgarh',
    established: '2000'
  },
  {
    id: 'hc_gauhati',
    name: 'Gauhati High Court',
    shortName: 'Gauhati HC',
    code: 'GAU',
    type: 'HIGH_COURT',
    city: 'Guwahati',
    benches: ['Kohima', 'Aizawl', 'Itanagar'],
    jurisdiction: 'Assam, Nagaland, Mizoram, Arunachal Pradesh',
    established: '1948'
  },
  {
    id: 'hc_himachal_pradesh',
    name: 'Himachal Pradesh High Court',
    shortName: 'Himachal HC',
    code: 'HPH',
    type: 'HIGH_COURT',
    city: 'Shimla',
    jurisdiction: 'Himachal Pradesh',
    established: '1971'
  },
  {
    id: 'hc_jammu_kashmir',
    name: 'Jammu & Kashmir and Ladakh High Court',
    shortName: 'J&K and Ladakh HC',
    code: 'JKL',
    type: 'HIGH_COURT',
    city: 'Srinagar / Jammu',
    jurisdiction: 'Jammu & Kashmir, Ladakh',
    established: '1928'
  },
  {
    id: 'hc_jharkhand',
    name: 'Jharkhand High Court',
    shortName: 'Jharkhand HC',
    code: 'JHR',
    type: 'HIGH_COURT',
    city: 'Ranchi',
    jurisdiction: 'Jharkhand',
    established: '2000'
  },
  {
    id: 'hc_orissa',
    name: 'Orissa High Court',
    shortName: 'Orissa HC',
    code: 'ORI',
    type: 'HIGH_COURT',
    city: 'Cuttack',
    jurisdiction: 'Odisha',
    established: '1948'
  },
  {
    id: 'hc_uttarakhand',
    name: 'Uttarakhand High Court',
    shortName: 'Uttarakhand HC',
    code: 'UKH',
    type: 'HIGH_COURT',
    city: 'Nainital',
    jurisdiction: 'Uttarakhand',
    established: '2000'
  },
  {
    id: 'hc_manipur',
    name: 'Manipur High Court',
    shortName: 'Manipur HC',
    code: 'MAN',
    type: 'HIGH_COURT',
    city: 'Imphal',
    jurisdiction: 'Manipur',
    established: '2013'
  },
  {
    id: 'hc_meghalaya',
    name: 'Meghalaya High Court',
    shortName: 'Meghalaya HC',
    code: 'MEG',
    type: 'HIGH_COURT',
    city: 'Shillong',
    jurisdiction: 'Meghalaya',
    established: '2013'
  },
  {
    id: 'hc_tripura',
    name: 'Tripura High Court',
    shortName: 'Tripura HC',
    code: 'TRI',
    type: 'HIGH_COURT',
    city: 'Agartala',
    jurisdiction: 'Tripura',
    established: '2013'
  },
  {
    id: 'hc_sikkim',
    name: 'Sikkim High Court',
    shortName: 'Sikkim HC',
    code: 'SIK',
    type: 'HIGH_COURT',
    city: 'Gangtok',
    jurisdiction: 'Sikkim',
    established: '1975'
  }
];

export const MAJOR_BARE_ACTS = [
  { id: 'bns', name: 'Bharatiya Nyaya Sanhita, 2023 (BNS)', short: 'BNS 2023', year: 2023, category: 'Criminal' },
  { id: 'bnss', name: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)', short: 'BNSS 2023', year: 2023, category: 'Criminal' },
  { id: 'bsa', name: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA)', short: 'BSA 2023', year: 2023, category: 'Evidence' },
  { id: 'constitution', name: 'Constitution of India, 1950', short: 'Constitution', year: 1950, category: 'Constitutional' },
  { id: 'ipc', name: 'Indian Penal Code, 1860 (IPC)', short: 'IPC 1860', year: 1860, category: 'Criminal' },
  { id: 'crpc', name: 'Code of Criminal Procedure, 1973 (CrPC)', short: 'CrPC 1973', year: 1973, category: 'Criminal' },
  { id: 'cpc', name: 'Code of Civil Procedure, 1908 (CPC)', short: 'CPC 1908', year: 1908, category: 'Civil' },
  { id: 'evidence', name: 'Indian Evidence Act, 1872', short: 'Evidence Act 1872', year: 1872, category: 'Evidence' },
  { id: 'ni_act', name: 'Negotiable Instruments Act, 1881', short: 'NI Act 1881', year: 1881, category: 'Commercial' },
  { id: 'contract', name: 'Indian Contract Act, 1872', short: 'Contract Act 1872', year: 1872, category: 'Commercial' },
  { id: 'arbitration', name: 'Arbitration and Conciliation Act, 1996', short: 'Arbitration Act 1996', year: 1996, category: 'Arbitration' },
  { id: 'ibc', name: 'Insolvency and Bankruptcy Code, 2016 (IBC)', short: 'IBC 2016', year: 2016, category: 'Corporate' },
  { id: 'companies', name: 'Companies Act, 2013', short: 'Companies Act 2013', year: 2013, category: 'Corporate' },
  { id: 'it_act', name: 'Information Technology Act, 2000', short: 'IT Act 2000', year: 2000, category: 'Cyber' },
  { id: 'consumer', name: 'Consumer Protection Act, 2019', short: 'CPA 2019', year: 2019, category: 'Consumer' },
  { id: 'specific_relief', name: 'Specific Relief Act, 1963', short: 'Specific Relief Act', year: 1963, category: 'Civil' },
  { id: 'limitation', name: 'Limitation Act, 1963', short: 'Limitation Act', year: 1963, category: 'Civil' },
  { id: 'transfer_property', name: 'Transfer of Property Act, 1882', short: 'TPA 1882', year: 1882, category: 'Property' }
];

export const SEARCH_MODES = [
  { id: 'AI', label: 'AI Search', placeholder: 'Ask a legal question in natural language (e.g. Can an accused get anticipatory bail when FIR alleges cheating?)...', hint: 'Interprets legal intent, precedents & statutes with AI' },
  { id: 'CASE', label: 'Case Search', placeholder: 'Search by case title or party name (e.g. S.R. Bommai, Rangappa v. Sri Mohan)...', hint: 'Find specific rulings by title or subject matter' },
  { id: 'CITATION', label: 'Citation Search', placeholder: 'Enter official law report citation (e.g. 2024 INSC 123, (2010) 11 SCC 441, AIR 1994 SC 1918)...', hint: 'Instant lookup across SCC, AIR, SCR, INSC citations' },
  { id: 'ACT', label: 'Act & Section', placeholder: 'Search by Act and Section (e.g. Section 438 CrPC, Section 138 NI Act, Section 482 BNSS)...', hint: 'Filter judgments interpreting specific statutory sections' },
  { id: 'PARTY', label: 'Party Search', placeholder: 'Search by Petitioner, Appellant or Respondent name...', hint: 'Locate disputes involving specific institutions or persons' },
  { id: 'JUDGE', label: 'Judge Search', placeholder: "Search by Hon'ble Judge name (e.g. Justice Chandrachud, Justice Khanna)...", hint: 'View landmark opinions authored by specific benches' }
];

export const CASE_TYPES = [
  'All Types',
  'Criminal Appeal',
  'Civil Appeal',
  'Special Leave Petition (Criminal)',
  'Special Leave Petition (Civil)',
  'Writ Petition (Civil)',
  'Writ Petition (Criminal)',
  'Arbitration Petition',
  'Review Petition',
  'Contempt Petition',
  'Original Jurisdiction',
  'Curative Petition'
];

export const POPULAR_SEARCH_CHIPS = [
  'Maintenance rights of divorced Muslim woman',
  'Anticipatory bail in cheating & breach of trust',
  'Section 138 cheque bounce limitation & statutory notice',
  'Quashing of FIR under Section 482 CrPC after chargesheet',
  'Anticipatory bail parameters under PMLA',
  'Section 65B Indian Evidence Act electronic certificate',
  'Arrest guidelines under Section 41A CrPC (Arnesh Kumar)',
  'Grounds for interim maintenance under Section 125 CrPC',
  'Specific performance readiness and willingness'
];
