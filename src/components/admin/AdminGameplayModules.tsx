import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Gamepad2,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Trophy,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_LIST } from '../../shared/roles';
import {
  getDefaultRoleImageUrl,
  getRoleImageStatus,
  resolveRoleImageUrl,
} from '../../shared/roleArtwork';
import { AdminOverview, GameMode, Language, RoleDefinition, Team, TournamentFormat } from '../../shared/types';
import { RolePortrait } from '../RolePortrait';

export const AdminGameplayModules: React.FC<{
  moduleId: 'rooms' | 'roles' | 'tournaments';
  data: AdminOverview;
  token: string;
  lang: Language;
  onRefresh: () => Promise<void> | void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}> = ({ moduleId, data, token, lang, onRefresh, showToast }) => {
  const { refreshRoleConfigs } = useApp();

  // Module 06: Rooms
  const [roomSearch, setRoomSearch] = useState('');
  const [inspectRoomCode, setInspectRoomCode] = useState<string | null>(null);
  const [confirmCloseCode, setConfirmCloseCode] = useState<string | null>(null);

  // Module 07: Roles
  const [roleSearch, setRoleSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<'ALL' | Team>('ALL');
  const [missingOnly, setMissingOnly] = useState(false);
  const [previewRole, setPreviewRole] = useState<RoleDefinition | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleNameUz, setRoleNameUz] = useState('');
  const [roleNameRu, setRoleNameRu] = useState('');
  const [roleDescUz, setRoleDescUz] = useState('');
  const [roleDescRu, setRoleDescRu] = useState('');
  const [roleAbilityUz, setRoleAbilityUz] = useState('');
  const [roleAbilityRu, setRoleAbilityRu] = useState('');
  const [roleRarity, setRoleRarity] = useState<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'>('COMMON');
  const [roleImageUrl, setRoleImageUrl] = useState('');
  const [roleActive, setRoleActive] = useState(true);
  const [uploadingRoleImage, setUploadingRoleImage] = useState(false);

  // Module 08: Tournaments
  const [trnName, setTrnName] = useState('');
  const [trnFormat, setTrnFormat] = useState<TournamentFormat>('SINGLE_ELIMINATION');
  const [trnMode, setTrnMode] = useState<GameMode>('CLASSIC');
  const [trnMaxPlayers, setTrnMaxPlayers] = useState<8 | 16 | 32>(16);
  const [trnPrizeGold, setTrnPrizeGold] = useState(1500);
  const [trnPrizeDiamonds, setTrnPrizeDiamonds] = useState(25);
  const [selectedTrnId, setSelectedTrnId] = useState<string | null>(null);

  const roleConfigMap = useMemo(() => {
    const map = new Map<string, AdminOverview['roleConfigs'][number]>();
    for (const rc of data.roleConfigs || []) {
      map.set(rc.roleId, rc);
    }
    return map;
  }, [data.roleConfigs]);

  const closeRoom = async (code: string) => {
    const res = await fetch(`/api/admin/rooms/${code}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(lang === 'uz' ? `Xona ${code} yopildi` : `Комната ${code} закрыта`, 'success');
      setConfirmCloseCode(null);
      if (inspectRoomCode === code) setInspectRoomCode(null);
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const openRoleEditor = (role: RoleDefinition) => {
    const ov = roleConfigMap.get(role.id);
    const resolvedUrl = resolveRoleImageUrl(role.id, data.roleConfigs);
    setEditingRole(role);
    setRoleNameUz(ov?.name?.uz || role.name.uz);
    setRoleNameRu(ov?.name?.ru || role.name.ru);
    setRoleDescUz(ov?.description?.uz || role.shortDesc.uz);
    setRoleDescRu(ov?.description?.ru || role.shortDesc.ru);
    setRoleAbilityUz(ov?.abilityName?.uz || role.abilityName.uz);
    setRoleAbilityRu(ov?.abilityName?.ru || role.abilityName.ru);
    setRoleRarity(ov?.rarity || 'COMMON');
    setRoleImageUrl(resolvedUrl || '');
    setRoleActive(ov ? ov.isActive : true);
  };

  const saveRoleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        roleId: editingRole.id,
        name: { uz: roleNameUz, ru: roleNameRu },
        description: { uz: roleDescUz, ru: roleDescRu },
        abilityName: { uz: roleAbilityUz, ru: roleAbilityRu },
        team: editingRole.team,
        rarity: roleRarity,
        imageUrl: roleImageUrl.trim(),
        isActive: roleActive,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Rol saqlandi' : 'Роль сохранена', 'success');
      setEditingRole(null);
      await Promise.all([onRefresh(), refreshRoleConfigs()]);
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const handleUploadRoleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingRole) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast(
        lang === 'uz' ? 'Faqat JPG, PNG yoki WEBP ruxsat etiladi' : 'Допустимы только JPG, PNG или WEBP',
        'error',
      );
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast(
        lang === 'uz' ? 'Fayl hajmi 3MB dan oshmasligi kerak' : 'Размер файла не должен превышать 3 МБ',
        'error',
      );
      return;
    }
    setUploadingRoleImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/admin/roles/${editingRole.id}/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataUrl }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || 'Upload error', 'error');
        return;
      }
      setRoleImageUrl(body.imageUrl || '');
      showToast(
        lang === 'uz' ? 'Rol portreti yuklandi' : 'Портрет роли загружен',
        'success',
      );
      await Promise.all([onRefresh(), refreshRoleConfigs()]);
    } catch {
      showToast(lang === 'uz' ? 'Yuklashda xatolik' : 'Ошибка загрузки', 'error');
    } finally {
      setUploadingRoleImage(false);
    }
  };

  const handleRemoveRoleImage = async () => {
    if (!editingRole) return;
    setUploadingRoleImage(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || 'Error', 'error');
        return;
      }
      setRoleImageUrl('');
      showToast(
        lang === 'uz' ? "Rol rasmi o'chirildi" : 'Изображение роли удалено',
        'info',
      );
      await Promise.all([onRefresh(), refreshRoleConfigs()]);
    } finally {
      setUploadingRoleImage(false);
    }
  };

  const handleRestoreDefaultRoleImage = async () => {
    if (!editingRole) return;
    setUploadingRoleImage(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ restoreDefault: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || 'Error', 'error');
        return;
      }
      setRoleImageUrl(body.imageUrl || getDefaultRoleImageUrl(editingRole.id));
      showToast(
        lang === 'uz' ? 'Standart portret tiklandi' : 'Стандартный портрет восстановлен',
        'success',
      );
      await Promise.all([onRefresh(), refreshRoleConfigs()]);
    } finally {
      setUploadingRoleImage(false);
    }
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trnName.trim()) return;
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: trnName.trim(),
        format: trnFormat,
        mode: trnMode,
        maxPlayers: trnMaxPlayers,
        prizeGold: trnPrizeGold,
        prizeDiamonds: trnPrizeDiamonds,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Turnir yaratildi' : 'Турнир создан', 'success');
      setTrnName('');
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const cancelTournament = async (id: string) => {
    const res = await fetch(`/api/admin/tournaments/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Turnir bekor qilindi' : 'Турнир отменён', 'info');
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  if (moduleId === 'rooms') {
    const filteredRooms = data.rooms.filter((r) => {
      const q = roomSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.hostName || '').toLowerCase().includes(q)
      );
    });
    const inspected = filteredRooms.find((r) => r.code === inspectRoomCode) || null;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#F5F5F7]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder={lang === 'uz' ? 'Xona kodi, nomi yoki host...' : 'Код комнаты, название или хост...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7] outline-none focus:border-[#E63946]/50"
            />
          </div>
          <div className="text-xs text-[#F5F5F7]/60 font-mono">
            {lang === 'uz' ? 'Faol xonalar:' : 'Активные комнаты:'}{' '}
            <span className="text-[#E7B65B] font-bold">{data.rooms.length}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 overflow-x-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#F5F5F7]/50">
              {lang === 'uz' ? 'Hozircha faol xonalar yo‘q' : 'Нет активных комнат'}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-[#F5F5F7]/45 border-b border-white/10">
                <tr>
                  <th className="py-2.5 pr-3">Code</th>
                  <th className="py-2.5 pr-3">{lang === 'uz' ? 'Xona nomi' : 'Название'}</th>
                  <th className="py-2.5 pr-3">{lang === 'uz' ? 'Rejim' : 'Режим'}</th>
                  <th className="py-2.5 pr-3">{lang === 'uz' ? 'Faza' : 'Фаза'}</th>
                  <th className="py-2.5 pr-3">{lang === 'uz' ? 'O‘yinchilar' : 'Игроки'}</th>
                  <th className="py-2.5 pr-3">{lang === 'uz' ? 'Holat' : 'Доступ'}</th>
                  <th className="py-2.5 text-right">{lang === 'uz' ? 'Amallar' : 'Действия'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRooms.map((r) => (
                  <tr key={r.code} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-3 font-mono font-bold text-[#E7B65B]">{r.code}</td>
                    <td className="py-3 pr-3 text-[#F5F5F7] font-semibold">
                      {r.name}
                      {r.hostName && (
                        <span className="block text-[10px] text-[#F5F5F7]/45 font-normal">
                          Host: {r.hostName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 font-mono">{r.mode}</td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded bg-[#A855F7]/15 text-[#A855F7] text-[10px] font-bold">
                        {r.phase}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-mono tabular-nums">
                      {r.playerCount}/{r.maxPlayers}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.isPrivate ? 'bg-[#E7B65B]/15 text-[#E7B65B]' : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {r.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => setInspectRoomCode(r.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#F5F5F7] text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {lang === 'uz' ? 'Ko‘rish' : 'Детали'}
                      </button>
                      <button
                        onClick={() => setConfirmCloseCode(r.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E63946]/20 hover:bg-[#E63946]/30 text-[#E63946] text-[11px] font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {lang === 'uz' ? 'Yopish' : 'Закрыть'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {inspected && (
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#E7B65B]" />
                {inspected.name} ({inspected.code})
              </h3>
              <button
                onClick={() => setInspectRoomCode(null)}
                className="text-xs text-[#F5F5F7]/50 hover:text-white"
              >
                {lang === 'uz' ? 'Yopish' : 'Скрыть'}
              </button>
            </div>
            <div className="grid sm:grid-cols-4 gap-3 text-xs pt-2">
              <div className="p-3 rounded-xl bg-[#090B12] border border-white/5">
                <p className="text-[#F5F5F7]/45">Host</p>
                <p className="font-semibold text-[#F5F5F7] mt-0.5">{inspected.hostName || 'Host'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090B12] border border-white/5">
                <p className="text-[#F5F5F7]/45">{lang === 'uz' ? 'Rejim / Faza' : 'Режим / Фаза'}</p>
                <p className="font-mono text-[#E7B65B] mt-0.5">{inspected.mode} • {inspected.phase}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090B12] border border-white/5">
                <p className="text-[#F5F5F7]/45">{lang === 'uz' ? 'Ishtirokchilar' : 'Участники'}</p>
                <p className="font-mono text-[#F5F5F7] mt-0.5">{inspected.playerCount} / {inspected.maxPlayers}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#090B12] border border-white/5">
                <p className="text-[#F5F5F7]/45">{lang === 'uz' ? 'Yaratilgan' : 'Создана'}</p>
                <p className="font-mono text-[#F5F5F7] mt-0.5">{new Date(inspected.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}

        {confirmCloseCode && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-[#E63946]/40">
              <h3 className="font-display text-base font-bold text-[#F5F5F7]">
                {lang === 'uz' ? `Xonani yopish (${confirmCloseCode})?` : `Закрыть комнату (${confirmCloseCode})?`}
              </h3>
              <p className="text-xs text-[#F5F5F7]/70">
                {lang === 'uz'
                  ? 'Barcha o‘yinchilarga xabar yuboriladi va xona darhol o‘chiriladi.'
                  : 'Все игроки получат уведомление, а комната будет немедленно закрыта.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmCloseCode(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-[#F5F5F7]"
                >
                  {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                </button>
                <button
                  onClick={() => closeRoom(confirmCloseCode)}
                  className="px-4 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                >
                  {lang === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'roles') {
    const imageSummary = ROLE_LIST.reduce(
      (acc, r) => {
        const st = getRoleImageStatus(r.id, data.roleConfigs);
        acc.total += 1;
        if (st === 'MISSING') acc.missing += 1;
        else acc.ready += 1;
        if (st === 'CUSTOM') acc.custom += 1;
        return acc;
      },
      { total: 0, ready: 0, custom: 0, missing: 0 },
    );

    const filteredRoles = ROLE_LIST.filter((r) => {
      if (teamFilter !== 'ALL' && r.team !== teamFilter) return false;
      if (missingOnly && getRoleImageStatus(r.id, data.roleConfigs) !== 'MISSING') return false;
      const q = roleSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.uz.toLowerCase().includes(q) ||
        r.name.ru.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-[#F5F5F7]/50">
              {lang === 'uz' ? 'Jami rollar' : 'Всего ролей'}
            </div>
            <div className="font-display text-2xl font-bold text-[#F5F5F7] mt-1">
              {imageSummary.total}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20">
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lang === 'uz' ? 'Portretlar tayyor' : 'Портреты готовы'}
            </div>
            <div className="font-display text-2xl font-bold text-emerald-300 mt-1">
              {imageSummary.ready} / {imageSummary.total}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-[#E7B65B]/25">
            <div className="text-[11px] uppercase tracking-wider text-[#E7B65B]/85 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {lang === 'uz' ? 'Maxsus yuklangan' : 'Пользовательские'}
            </div>
            <div className="font-display text-2xl font-bold text-[#E7B65B] mt-1">
              {imageSummary.custom}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-[#E63946]/25">
            <div className="text-[11px] uppercase tracking-wider text-[#E63946] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lang === 'uz' ? 'Rasmsiz rollar' : 'Без изображения'}
            </div>
            <div className="font-display text-2xl font-bold text-[#F5F5F7] mt-1">
              {imageSummary.missing}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#F5F5F7]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              placeholder={lang === 'uz' ? 'Rol qidirish...' : 'Поиск роли...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7] outline-none focus:border-[#E7B65B]/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'TOWN', 'MAFIA', 'NEUTRAL'] as const).map((tm) => (
              <button
                key={tm}
                onClick={() => setTeamFilter(tm)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                  teamFilter === tm
                    ? 'bg-[#E63946] border-[#E63946] text-white'
                    : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/65'
                }`}
              >
                {tm}
              </button>
            ))}
            <button
              onClick={() => setMissingOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                missingOnly
                  ? 'bg-[#E7B65B] border-[#E7B65B] text-[#090B12]'
                  : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/65 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {lang === 'uz' ? `Rasmsiz (${imageSummary.missing})` : `Без фото (${imageSummary.missing})`}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const ov = roleConfigMap.get(role.id);
            const active = ov ? ov.isActive : true;
            const title = ov?.name?.[lang] || role.name[lang];
            const desc = ov?.description?.[lang] || role.shortDesc[lang];
            const ability = ov?.abilityName?.[lang] || role.abilityName[lang];
            const imgStatus = getRoleImageStatus(role.id, data.roleConfigs);

            return (
              <div
                key={role.id}
                className={`glass-panel rounded-2xl p-4 border space-y-3 ${
                  active ? 'border-white/10' : 'border-[#E63946]/30 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewRole(role)}
                    title={lang === 'uz' ? 'Portretni kattalashtirish' : 'Увеличить портрет'}
                    className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/15 group"
                  >
                    <RolePortrait
                      roleId={role.id}
                      roleConfigs={data.roleConfigs}
                      alt={title}
                      className="w-full h-full"
                    />
                    {imgStatus === 'MISSING' && (
                      <span className="absolute inset-x-0 bottom-0 bg-[#E63946]/90 text-[9px] font-bold text-white py-0.5 text-center">
                        MISSING
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display text-sm font-bold text-[#F5F5F7] truncate">
                            {title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              role.team === 'MAFIA'
                                ? 'bg-[#E63946]/20 text-[#E63946]'
                                : role.team === 'TOWN'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-[#A855F7]/20 text-[#A855F7]'
                            }`}
                          >
                            {role.team}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#E7B65B] mt-0.5 truncate">{ability}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                          active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#E63946]/20 text-[#E63946]'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                          imgStatus === 'CUSTOM'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : imgStatus === 'DEFAULT'
                              ? 'bg-[#E7B65B]/15 text-[#E7B65B] border-[#E7B65B]/30'
                              : 'bg-[#E63946]/15 text-[#E63946] border-[#E63946]/30'
                        }`}
                      >
                        ART: {imgStatus}
                      </span>
                      <span className="text-[10px] font-mono text-[#F5F5F7]/40">{role.id}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#F5F5F7]/70 line-clamp-2">{desc}</p>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] gap-2">
                  <span className="font-mono text-[#F5F5F7]/45 truncate">
                    {ov?.rarity || 'COMMON'} • {role.modes.join('/')}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewRole(role)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[#F5F5F7]/75 hover:text-white"
                      title={lang === 'uz' ? "Ko'rish" : 'Просмотр'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openRoleEditor(role)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#F5F5F7] font-semibold"
                    >
                      {lang === 'uz' ? 'Tahrirlash' : 'Изменить'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRoles.length === 0 && (
          <div className="glass-panel rounded-2xl p-8 text-center text-xs text-[#F5F5F7]/55 border border-white/10">
            {lang === 'uz' ? 'Mos keladigan rol topilmadi' : 'Подходящие роли не найдены'}
          </div>
        )}

        {previewRole && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl p-5 max-w-md w-full border border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#F5F5F7]">
                  {(roleConfigMap.get(previewRole.id)?.name?.[lang] || previewRole.name[lang])}{' '}
                  <span className="text-xs font-mono text-[#F5F5F7]/45">({previewRole.id})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewRole(null)}
                  className="text-xs text-[#F5F5F7]/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="w-full max-w-[320px] mx-auto aspect-square rounded-2xl overflow-hidden border border-white/15">
                <RolePortrait
                  roleId={previewRole.id}
                  roleConfigs={data.roleConfigs}
                  lazy={false}
                  className="w-full h-full"
                />
              </div>
              <div className="text-xs text-[#F5F5F7]/80 space-y-1.5">
                <p className="font-mono text-[#E7B65B]">
                  {roleConfigMap.get(previewRole.id)?.abilityName?.[lang] || previewRole.abilityName[lang]}
                </p>
                <p>{previewRole.abilityDesc[lang]}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = previewRole;
                    setPreviewRole(null);
                    openRoleEditor(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                >
                  {lang === 'uz' ? 'Portret / Rolni tahrirlash' : 'Редактировать'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingRole && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
            <form
              onSubmit={saveRoleConfig}
              className="glass-panel rounded-2xl p-6 max-w-xl w-full space-y-4 border border-white/15 my-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#F5F5F7] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#E7B65B]" />
                  {editingRole.id.toUpperCase()}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="text-xs text-[#F5F5F7]/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#090B12] border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-28 h-28 rounded-xl overflow-hidden border border-white/15 shrink-0">
                  <RolePortrait
                    roleId={editingRole.id}
                    imageUrlOverride={roleImageUrl.trim() ? roleImageUrl.trim() : null}
                    lazy={false}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#F5F5F7]">
                      {lang === 'uz' ? 'Rol portreti (1:1)' : 'Портрет роли (1:1)'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#E7B65B]">
                      {roleImageUrl.trim()
                        ? roleImageUrl.trim() === getDefaultRoleImageUrl(editingRole.id)
                          ? 'DEFAULT'
                          : 'CUSTOM'
                        : 'MISSING'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E63946] hover:bg-[#E63946]/90 text-white font-semibold cursor-pointer ${
                        uploadingRoleImage ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingRoleImage
                        ? lang === 'uz'
                          ? 'Yuklanmoqda...'
                          : 'Загрузка...'
                        : lang === 'uz'
                          ? 'Rasm yuklash'
                          : 'Загрузить фото'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUploadRoleFile}
                        disabled={uploadingRoleImage}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={uploadingRoleImage}
                      onClick={handleRestoreDefaultRoleImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[#E7B65B] font-semibold disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {lang === 'uz' ? 'Standart' : 'Стандарт'}
                    </button>
                    <button
                      type="button"
                      disabled={uploadingRoleImage || !roleImageUrl.trim()}
                      onClick={handleRemoveRoleImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E63946]/15 hover:bg-[#E63946]/25 text-[#E63946] font-semibold disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {lang === 'uz' ? "O'chirish" : 'Удалить'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#F5F5F7]/45">
                    {lang === 'uz'
                      ? 'JPG, PNG yoki WEBP (maks. 3MB). Yoki quyida URL kiriting.'
                      : 'JPG, PNG или WEBP (макс. 3 МБ). Или укажите URL ниже.'}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Name (UZ)</label>
                  <input
                    value={roleNameUz}
                    onChange={(e) => setRoleNameUz(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  />
                </div>
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Name (RU)</label>
                  <input
                    value={roleNameRu}
                    onChange={(e) => setRoleNameRu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  />
                </div>
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Ability (UZ)</label>
                  <input
                    value={roleAbilityUz}
                    onChange={(e) => setRoleAbilityUz(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  />
                </div>
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Ability (RU)</label>
                  <input
                    value={roleAbilityRu}
                    onChange={(e) => setRoleAbilityRu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  />
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <label className="text-[#F5F5F7]/60 block">Description (UZ)</label>
                <textarea
                  rows={2}
                  value={roleDescUz}
                  onChange={(e) => setRoleDescUz(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                />
                <label className="text-[#F5F5F7]/60 block">Description (RU)</label>
                <textarea
                  rows={2}
                  value={roleDescRu}
                  onChange={(e) => setRoleDescRu(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-xs items-end">
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Rarity</label>
                  <select
                    value={roleRarity}
                    onChange={(e) => setRoleRarity(e.target.value as typeof roleRarity)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGENDARY">LEGENDARY</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#F5F5F7]/60 block mb-1">Image URL</label>
                  <input
                    value={roleImageUrl}
                    onChange={(e) => setRoleImageUrl(e.target.value)}
                    placeholder="/assets/roles/don.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
                  />
                </div>
                <label className="flex items-center gap-2 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roleActive}
                    onChange={(e) => setRoleActive(e.target.checked)}
                    className="accent-[#E63946]"
                  />
                  <span className="text-[#F5F5F7] font-semibold">
                    {lang === 'uz' ? 'Faol rol' : 'Активна'}
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-[#F5F5F7]"
                >
                  {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                >
                  {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Module 08: Tournament Management
  const selectedTrn = data.tournaments.find((t) => t.id === selectedTrnId) || null;

  return (
    <div className="space-y-6">
      <form onSubmit={createTournament} className="glass-panel rounded-2xl p-5 space-y-4">
        <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#E7B65B]" />
          {lang === 'uz' ? 'Yangi turnir yaratish' : 'Создать турнир'}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <input
            value={trnName}
            onChange={(e) => setTrnName(e.target.value)}
            placeholder={lang === 'uz' ? 'Turnir nomi...' : 'Название турнира...'}
            required
            className="lg:col-span-2 px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
          <select
            value={trnFormat}
            onChange={(e) => setTrnFormat(e.target.value as TournamentFormat)}
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          >
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
          <select
            value={trnMaxPlayers}
            onChange={(e) => setTrnMaxPlayers(Number(e.target.value) as 8 | 16 | 32)}
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          >
            <option value={8}>8 Players</option>
            <option value={16}>16 Players</option>
            <option value={32}>32 Players</option>
          </select>
          <input
            type="number"
            min={0}
            value={trnPrizeGold}
            onChange={(e) => setTrnPrizeGold(Number(e.target.value))}
            placeholder="Gold Prize"
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
          <div className="flex gap-2">
            <select
              value={trnMode}
              onChange={(e) => setTrnMode(e.target.value as GameMode)}
              className="flex-1 px-2 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            >
              <option value="CLASSIC">CLASSIC</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="CHAOS">CHAOS</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#E63946] hover:bg-[#d32f3d] text-white font-bold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="glass-panel rounded-2xl p-5 overflow-x-auto">
        {data.tournaments.length === 0 ? (
          <p className="text-center py-10 text-xs text-[#F5F5F7]/50">
            {lang === 'uz' ? 'Turnirlar mavjud emas' : 'Турниры отсутствуют'}
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-[#F5F5F7]/45 border-b border-white/10">
              <tr>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Turnir' : 'Турнир'}</th>
                <th className="py-2.5 pr-3">Format</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Ishtirokchilar' : 'Участники'}</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Mukofot' : 'Приз'}</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Holat' : 'Статус'}</th>
                <th className="py-2.5 text-right">{lang === 'uz' ? 'Amallar' : 'Действия'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.tournaments.map((trn) => (
                <tr key={trn.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-3 font-semibold text-[#F5F5F7]">{trn.name}</td>
                  <td className="py-3 pr-3 font-mono text-[11px]">{trn.format} • {trn.mode}</td>
                  <td className="py-3 pr-3 font-mono">
                    {trn.participants.length}/{trn.maxPlayers}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[#E7B65B]">
                    {trn.prizeGold}G / {trn.prizeDiamonds}D
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trn.status === 'REGISTRATION'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : trn.status === 'IN_PROGRESS'
                            ? 'bg-[#E7B65B]/20 text-[#E7B65B]'
                            : trn.status === 'CANCELLED'
                              ? 'bg-[#E63946]/20 text-[#E63946]'
                              : 'bg-white/10 text-[#F5F5F7]/70'
                      }`}
                    >
                      {trn.status}
                    </span>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedTrnId(selectedTrnId === trn.id ? null : trn.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[#F5F5F7] text-[11px]"
                    >
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      {lang === 'uz' ? 'Jadval' : 'Сетка'}
                    </button>
                    {(trn.status === 'REGISTRATION' || trn.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => cancelTournament(trn.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#E63946]/20 hover:bg-[#E63946]/30 text-[#E63946] text-[11px] font-semibold"
                      >
                        {lang === 'uz' ? 'Bekor qilish' : 'Отменить'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedTrn && (
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#F5F5F7]">
            {selectedTrn.name} — {lang === 'uz' ? 'Matchlar jadvali' : 'Турнирная сетка'} ({selectedTrn.matches.length})
          </h4>
          {selectedTrn.matches.length === 0 ? (
            <p className="text-xs text-[#F5F5F7]/50">
              {lang === 'uz' ? 'Bracket o‘yinlar boshlanganda shakllanadi.' : 'Сетка формируется после старта.'}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {selectedTrn.matches.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-[#090B12] border border-white/10 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#E7B65B]">
                    <span>R{m.round} #{m.matchNumber}</span>
                    <span>{m.status}</span>
                  </div>
                  <p className="text-[#F5F5F7] font-semibold">
                    {m.player1Id || 'TBD'} vs {m.player2Id || 'TBD'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
