export interface CourtRecord {
  id: string;
  name: string;
  type: string;
  state: string;
  district: string;
}

export const COURT_DATABASE: CourtRecord[] = [
  // Supreme Court
  { id: 'sc_india', name: 'Supreme Court of India', type: 'Supreme Court of India', state: 'Delhi (NCT)', district: 'New Delhi' },
  
  // High Courts
  { id: 'hc_delhi', name: 'High Court of Delhi', type: 'High Court', state: 'Delhi (NCT)', district: 'New Delhi' },
  { id: 'hc_bombay', name: 'High Court of Bombay', type: 'High Court', state: 'Maharashtra', district: 'Mumbai' },
  { id: 'hc_madras', name: 'High Court of Madras', type: 'High Court', state: 'Tamil Nadu', district: 'Chennai' },
  { id: 'hc_calcutta', name: 'High Court of Calcutta', type: 'High Court', state: 'West Bengal', district: 'Kolkata' },
  { id: 'hc_karnataka', name: 'High Court of Karnataka', type: 'High Court', state: 'Karnataka', district: 'Bengaluru' },
  { id: 'hc_allahabad', name: 'High Court of Judicature at Allahabad', type: 'High Court', state: 'Uttar Pradesh', district: 'Allahabad' },
  { id: 'hc_gujarat', name: 'High Court of Gujarat', type: 'High Court', state: 'Gujarat', district: 'Ahmedabad' },
  { id: 'hc_madhya_pradesh', name: 'High Court of Madhya Pradesh', type: 'High Court', state: 'Madhya Pradesh', district: 'Jabalpur' },

  // Districts
  { id: 'dc_saket', name: 'District Court Saket', type: 'District Court', state: 'Delhi (NCT)', district: 'Saket' },
  { id: 'dc_dwarka', name: 'District Court Dwarka', type: 'District Court', state: 'Delhi (NCT)', district: 'Dwarka' },
  { id: 'dc_bandra', name: 'District Court Bandra', type: 'District Court', state: 'Maharashtra', district: 'Mumbai' },
  { id: 'dc_pune', name: 'District Court Pune', type: 'District Court', state: 'Maharashtra', district: 'Pune' },
  { id: 'dc_jabalpur', name: 'District Court Jabalpur', type: 'District Court', state: 'Madhya Pradesh', district: 'Jabalpur' },
  { id: 'fc_jabalpur', name: 'Family Court Jabalpur', type: 'Family Court', state: 'Madhya Pradesh', district: 'Jabalpur' },
  { id: 'cc_jabalpur', name: 'Commercial Court Jabalpur', type: 'Commercial Court', state: 'Madhya Pradesh', district: 'Jabalpur' },
];

export const getCourtsForLocation = (type: string, state: string, district: string): string[] => {
  if (type === 'Supreme Court of India') {
    return ['Supreme Court of India', 'Other'];
  }

  const matched = COURT_DATABASE.filter(
    (c) =>
      (!type || c.type === type || type === 'Other') &&
      (!state || c.state === state || state === 'Other') &&
      (!district || c.district === district || district === 'Other')
  ).map((c) => c.name);

  const defaults = [
    'District & Sessions Court',
    'Chief Judicial Magistrate Court',
    'Civil Court (Senior Division)',
    'Civil Court (Junior Division)',
    'Family Court',
    'Commercial Court',
    'Other',
  ];

  return Array.from(new Set([...matched, ...defaults]));
};
