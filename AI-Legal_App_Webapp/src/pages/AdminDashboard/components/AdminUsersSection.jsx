import React, { useState, useMemo, memo } from 'react';
import { Search, UserCheck, Lock, Trash2, Mail } from 'lucide-react';

const AdminUsersSection = memo(function AdminUsersSection({ usersList = [], onSelectUser, onDeleteUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(user => (
      (user.name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q)
    ));
  }, [usersList, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-sm text-slate-400">Total Users: {filteredUsers.length}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2.5 whitespace-nowrap">User</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Role</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Plan</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Credits</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 whitespace-nowrap">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id || user.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="font-medium text-white whitespace-nowrap">{user.name || 'Unnamed'}</div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">{user.email}</div>
                  </td>
                  <td className="px-4 py-2.5 capitalize whitespace-nowrap">{user.role || 'user'}</td>
                  <td className="px-4 py-2.5 capitalize whitespace-nowrap">{user.plan || 'Free'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{user.credits ?? 0}</td>
                  <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                    {onSelectUser && (
                      <button
                        onClick={() => onSelectUser(user)}
                        className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium whitespace-nowrap inline-block"
                      >
                        View
                      </button>
                    )}
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

export default AdminUsersSection;
