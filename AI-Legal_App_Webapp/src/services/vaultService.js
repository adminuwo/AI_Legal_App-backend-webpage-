import axios from 'axios';
import { apis } from '../types';

export const VAULT_STORAGE_KEY = '@user_legal_vault_docs';

export const isRealVaultDoc = (d) => Boolean(
  d && d.name &&
  d.name !== 'Rental_Agreement_Signed.pdf' &&
  d.name !== 'Identity_Aadhaar_Card.pdf' &&
  d.id !== 'doc_1' &&
  d.id !== 'doc_2'
);

export async function addDocumentToVault(doc) {
  if (!doc || !doc.name || !isRealVaultDoc(doc)) return null;

  const sizeKB = typeof doc.size === 'number' ? Math.round(doc.size / 1024) : 0;
  const sizeStr = typeof doc.size === 'string'
    ? doc.size
    : (sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB || 520} KB`);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const newDoc = {
    id: doc.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: doc.name,
    size: sizeStr,
    date: dateStr,
    url: doc.url || '',
    type: doc.type || (doc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'doc'),
    source: doc.source || 'AI Legal Assistant'
  };

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw).filter(isRealVaultDoc) : [];
    const exists = existing.some(d => d.name === newDoc.name && (d.url === newDoc.url || d.id === newDoc.id));
    if (!exists) {
      const updated = [newDoc, ...existing];
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('[vaultService] localStorage error:', e);
  }

  // Sync to Backend API
  try {
    const token = localStorage.getItem('token');
    if (token) {
      await axios.post(apis.vault, { document: newDoc }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (e) {
    // Non-blocking offline
  }

  return newDoc;
}

export async function getVaultDocuments() {
  let localDocs = [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) {
      localDocs = JSON.parse(raw).filter(isRealVaultDoc);
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(localDocs));
    }
  } catch (e) {}

  try {
    const token = localStorage.getItem('token');
    if (token) {
      const res = await axios.get(apis.vault, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res?.data?.success && Array.isArray(res.data.vaultDocs)) {
        const serverDocs = res.data.vaultDocs.filter(isRealVaultDoc);
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(serverDocs));
        return serverDocs;
      }
    }
  } catch (e) {}

  return localDocs;
}

export async function deleteVaultDocument(docId, docName) {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) {
      const existing = JSON.parse(raw);
      const updated = existing.filter(
        d => isRealVaultDoc(d) &&
             d.id !== docId &&
             d.name !== docId &&
             (!docName || d.name !== docName)
      );
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    const token = localStorage.getItem('token');
    if (token) {
      const query = docName ? `?name=${encodeURIComponent(docName)}` : '';
      await axios.delete(`${apis.vault}/${encodeURIComponent(docId)}${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (e) {}
}
