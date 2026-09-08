import React, { memo } from 'react';
import { CreditCard, DollarSign, Calendar } from 'lucide-react';

const AdminBillingSection = memo(function AdminBillingSection({ paymentsList = [] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2.5 whitespace-nowrap">Transaction ID</th>
              <th className="px-4 py-2.5 whitespace-nowrap">User</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Amount</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paymentsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 whitespace-nowrap">
                  No transaction records found.
                </td>
              </tr>
            ) : (
              paymentsList.map((tx, idx) => (
                <tr key={tx._id || idx} className="hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                    {tx.paymentId || tx._id || `TXN-${idx}`}
                  </td>
                  <td className="px-4 py-2.5 text-white whitespace-nowrap">{tx.userName || tx.userEmail || 'N/A'}</td>
                  <td className="px-4 py-2.5 font-semibold text-emerald-400 whitespace-nowrap">₹{tx.amount}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap inline-block ${
                        tx.status === 'success'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {tx.status || 'success'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default AdminBillingSection;

