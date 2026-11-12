import React, { useState } from 'react';
import { Activity, Database, HardDrive, Key, Lock, Shield, UserCheck } from 'lucide-react';
import {
  AdminModuleId,
  AdminOverview,
  AdminRoleSlug,
  Language,
  ModulePermissionSet,
} from '../../shared/types';

const MODULES_ORDER: AdminModuleId[] = [
  'dashboard',
  'users',
  'vip',
  'shop',
  'payments',
  'rooms',
  'roles',
  'tournaments',
  'moderation',
  'notifications',
  'promos',
  'settings',
  'admins',
  'analytics',
  'system',
];

export const AdminSecuritySystem: React.FC<{
  moduleId: 'admins' | 'system';
  data: AdminOverview;
  token: string;
  lang: Language;
  onRefresh: () => Promise<void> | void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}> = ({ moduleId, data, token, lang, onRefresh, showToast }) => {
  const [selectedSlug, setSelectedSlug] = useState<AdminRoleSlug>('MODERATOR');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'USER' | 'ADMIN'>('ADMIN');
  const [assignAdminRole, setAssignAdminRole] = useState<AdminRoleSlug>('MODERATOR');
  const [auditSeverity, setAuditSeverity] = useState<'ALL' | 'INFO' | 'WARN' | 'CRITICAL'>('ALL');
  const [creatingBackup, setCreatingBackup] = useState(false);

  const togglePerm = async (
    slug: AdminRoleSlug,
    mod: AdminModuleId,
    current: ModulePermissionSet,
    key: keyof ModulePermissionSet
  ) => {
    const updated = { ...current, [key]: !current[key] };
    const res = await fetch('/api/admin/roles-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug, moduleId: mod, permissions: updated }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Ruxsat yangilandi' : 'Права обновлены', 'success');
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const assignUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId) return;
    const res = await fetch('/api/admin/assign-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: assignUserId,
        role: assignRole,
        adminRole: assignRole === 'ADMIN' ? assignAdminRole : undefined,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Rol tayinlandi' : 'Роль назначена', 'success');
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/system/backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(lang === 'uz' ? 'Zaxira nusxa yaratildi' : 'Резервная копия создана', 'success');
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || 'Backup failed', 'error');
      }
    } finally {
      setCreatingBackup(false);
    }
  };

  if (moduleId === 'admins') {
    const activeRoleDef = data.adminRoles.find((r) => r.slug === selectedSlug) || data.adminRoles[0];
    const adminsList = data.users.filter((u) => u.role === 'ADMIN');

    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#E7B65B]" />
              {lang === 'uz' ? 'Amaldagi administratorlar' : 'Действующие администраторы'} ({adminsList.length})
            </h3>
            <div className="divide-y divide-white/10 text-xs">
              {adminsList.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">{u.username}</p>
                    <p className="text-[11px] text-[#F5F5F7]/50">{u.email}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] font-mono text-[10px] font-bold">
                    {u.adminRole || 'SUPER_ADMIN'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={assignUserRole} className="glass-panel rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#E63946]" />
              {lang === 'uz' ? 'Administrator roli tayinlash' : 'Назначить роль администратора'}
            </h3>
            <div className="space-y-3">
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
              >
                <option value="">{lang === 'uz' ? 'Foydalanuvchi tanlang...' : 'Выберите пользователя...'}</option>
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as 'USER' | 'ADMIN')}
                  className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER (Revoke Admin)</option>
                </select>
                {assignRole === 'ADMIN' && (
                  <select
                    value={assignAdminRole}
                    onChange={(e) => setAssignAdminRole(e.target.value as AdminRoleSlug)}
                    className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  >
                    {data.adminRoles.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.slug}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#E63946] hover:bg-[#d32f3d] text-white font-bold"
              >
                {lang === 'uz' ? 'Tayinlash' : 'Применить'}
              </button>
            </div>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#A855F7]" />
              {lang === 'uz' ? 'RBAC ruxsatlar matritsasi' : 'Матрица прав RBAC'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.adminRoles.map((r) => (
                <button
                  key={r.slug}
                  onClick={() => setSelectedSlug(r.slug)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                    selectedSlug === r.slug
                      ? 'bg-[#E7B65B] border-[#E7B65B] text-[#090B12]'
                      : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/70'
                  }`}
                >
                  {r.slug}
                </button>
              ))}
            </div>
          </div>

          {activeRoleDef && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-[#F5F5F7]/45 border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-3">Module</th>
                    <th className="py-2 px-3 text-center">Read</th>
                    <th className="py-2 px-3 text-center">Create</th>
                    <th className="py-2 px-3 text-center">Edit</th>
                    <th className="py-2 px-3 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {MODULES_ORDER.map((mod) => {
                    const perm = activeRoleDef.permissions[mod] || {
                      read: false,
                      create: false,
                      edit: false,
                      delete: false,
                    };
                    return (
                      <tr key={mod} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3 font-mono font-semibold text-[#F5F5F7]">{mod}</td>
                        {(['read', 'create', 'edit', 'delete'] as const).map((k) => (
                          <td key={k} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm[k])}
                              disabled={activeRoleDef.slug === 'SUPER_ADMIN'}
                              onChange={() => togglePerm(activeRoleDef.slug, mod, perm, k)}
                              className="accent-[#E7B65B] w-4 h-4 cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Module 15: System & Security
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#F5F5F7]/60">
            <span>Server Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-mono text-xl font-bold text-emerald-400 mt-1">ONLINE</p>
          <p className="text-[11px] font-mono text-[#F5F5F7]/45 mt-0.5">
            Uptime: {Math.floor(data.uptimeSec / 60)}m {data.uptimeSec % 60}s
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#F5F5F7]/60">
            <span>Database Engine</span>
            <Database className="w-4 h-4 text-[#E7B65B]" />
          </div>
          <p className="font-mono text-xl font-bold text-[#E7B65B] mt-1 uppercase">{data.dbMode}</p>
          <p className="text-[11px] font-mono text-[#F5F5F7]/45 mt-0.5">Migrations 001 & 002</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#F5F5F7]/60">
            <span>Failed Logins</span>
            <Shield className="w-4 h-4 text-[#E63946]" />
          </div>
          <p className="font-mono text-xl font-bold text-[#E63946] mt-1">{data.failedLoginsCount}</p>
          <p className="text-[11px] font-mono text-[#F5F5F7]/45 mt-0.5">Logged in security events</p>
        </div>
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#F5F5F7]/60">
            <span>Backups</span>
            <HardDrive className="w-4 h-4 text-[#A855F7]" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-xl font-bold text-[#F5F5F7]">{data.backups.length}</span>
            <button
              onClick={createBackup}
              disabled={creatingBackup}
              className="px-3 py-1.5 rounded-lg bg-[#E63946] hover:bg-[#d32f3d] text-[11px] font-bold text-white disabled:opacity-50"
            >
              {creatingBackup ? '...' : lang === 'uz' ? 'Zaxira olish' : 'Создать бэкап'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Xavfsizlik va tizim hodisalari' : 'События безопасности'} ({data.systemEvents.length})
          </h3>
          <div className="divide-y divide-white/10 max-h-[340px] overflow-y-auto text-xs">
            {data.systemEvents.length === 0 ? (
              <p className="text-center py-8 text-[#F5F5F7]/50">No events</p>
            ) : (
              data.systemEvents.map((ev) => (
                <div key={ev.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-[#E7B65B]">{ev.eventType}</span>
                    <p className="text-[#F5F5F7] mt-0.5">{ev.message}</p>
                    <p className="text-[10px] font-mono text-[#F5F5F7]/40">
                      {ev.source} • {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ev.severity === 'CRITICAL'
                        ? 'bg-[#E63946]/20 text-[#E63946]'
                        : ev.severity === 'WARN'
                          ? 'bg-[#E7B65B]/20 text-[#E7B65B]'
                          : 'bg-white/10 text-[#F5F5F7]/70'
                    }`}
                  >
                    {ev.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[#F5F5F7]">
              {lang === 'uz' ? 'Audit jurnali' : 'Журнал аудита'}
            </h3>
            <div className="inline-flex rounded-lg bg-[#090B12] p-0.5 border border-white/10 text-[10px] font-semibold">
              {(['ALL', 'WARN', 'CRITICAL'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAuditSeverity(sev)}
                  className={`px-2 py-0.5 rounded ${
                    auditSeverity === sev ? 'bg-[#A855F7] text-white' : 'text-[#F5F5F7]/60'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/10 max-h-[340px] overflow-y-auto text-xs">
            {data.auditLogs
              .filter((l) => auditSeverity === 'ALL' || l.severity === auditSeverity)
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((log) => (
                <div key={log.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#F5F5F7]">{log.action}</span>
                    <span className="text-[10px] font-mono text-[#F5F5F7]/45">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#F5F5F7]/65 mt-0.5">
                    {log.actorName}: {log.details}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {data.backups.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Saqlangan zaxira nusxalar' : 'Сохранённые резервные копии'}
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {data.backups.map((b) => (
              <div key={b.file} className="p-3 rounded-xl bg-[#090B12] border border-white/10 flex items-center justify-between">
                <span className="font-mono text-[#F5F5F7] truncate">{b.file}</span>
                <span className="font-mono text-[#E7B65B] shrink-0 ml-2">
                  {(b.sizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
