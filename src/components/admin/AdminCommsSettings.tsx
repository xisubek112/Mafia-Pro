import React, { useState } from 'react';
import { Bell, Globe, Plus, Send, Tag, Trash2 } from 'lucide-react';
import { AdminNotificationRecord, AdminOverview, Language, WebsiteSettings } from '../../shared/types';

export const AdminCommsSettings: React.FC<{
  moduleId: 'notifications' | 'promos' | 'settings';
  data: AdminOverview;
  token: string;
  lang: Language;
  onRefresh: () => Promise<void> | void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}> = ({ moduleId, data, token, lang, onRefresh, showToast }) => {
  // Module 10: Notifications
  const [ntfTitle, setNtfTitle] = useState('');
  const [ntfContent, setNtfContent] = useState('');
  const [ntfAudience, setNtfAudience] = useState<AdminNotificationRecord['audience']>('GLOBAL');
  const [ntfTargetIds, setNtfTargetIds] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);

  // Module 11: Promos
  const [promoCode, setPromoCode] = useState('');
  const [promoTitleUz, setPromoTitleUz] = useState('');
  const [promoTitleRu, setPromoTitleRu] = useState('');
  const [promoType, setPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [promoValue, setPromoValue] = useState(15);
  const [promoMaxUses, setPromoMaxUses] = useState(100);
  const [promoAppliesTo, setPromoAppliesTo] = useState<'ALL' | 'VIP_PLAN' | 'SHOP_PRODUCT'>('ALL');

  // Module 12: Website Settings
  const ws: WebsiteSettings = data.websiteSettings;
  const [siteTitle, setSiteTitle] = useState(ws?.siteTitle || 'MAFIA PRO');
  const [logoUrl, setLogoUrl] = useState(ws?.logoUrl || '/logo.png');
  const [faviconUrl, setFaviconUrl] = useState(ws?.faviconUrl || '/favicon.ico');
  const [heroUz, setHeroUz] = useState(ws?.heroTitle?.uz || '');
  const [heroRu, setHeroRu] = useState(ws?.heroTitle?.ru || '');
  const [bannerUz, setBannerUz] = useState(ws?.bannerText?.uz || '');
  const [bannerRu, setBannerRu] = useState(ws?.bannerText?.ru || '');
  const [telegram, setTelegram] = useState(ws?.socialLinks?.telegram || '');
  const [discord, setDiscord] = useState(ws?.socialLinks?.discord || '');
  const [instagram, setInstagram] = useState(ws?.socialLinks?.instagram || '');
  const [youtube, setYoutube] = useState(ws?.socialLinks?.youtube || '');
  const [adsEnabled, setAdsEnabled] = useState(Boolean(ws?.adsEnabled));
  const [maintenanceMode, setMaintenanceMode] = useState(Boolean(data.serverConfig?.maintenanceMode));
  const [privacyPolicy, setPrivacyPolicy] = useState(ws?.privacyPolicy || '');
  const [termsOfService, setTermsOfService] = useState(ws?.termsOfService || '');

  const sendNotification = async () => {
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: ntfTitle.trim(),
        content: ntfContent.trim(),
        audience: ntfAudience,
        targetUserIds:
          ntfAudience === 'SELECTED'
            ? ntfTargetIds
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Bildirishnoma yuborildi' : 'Уведомление отправлено', 'success');
      setNtfTitle('');
      setNtfContent('');
      setNtfTargetIds('');
      setConfirmSend(false);
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: promoCode.trim().toUpperCase(),
        title: { uz: promoTitleUz || promoCode, ru: promoTitleRu || promoCode },
        discountType: promoType,
        discountPercent: promoType === 'PERCENT' ? promoValue : 0,
        fixedAmountUzs: promoType === 'FIXED' ? promoValue : 0,
        maxUses: promoMaxUses,
        appliesTo: promoAppliesTo,
        isActive: true,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Promokod yaratildi' : 'Промокод создан', 'success');
      setPromoCode('');
      setPromoTitleUz('');
      setPromoTitleRu('');
      onRefresh();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const togglePromo = async (c: AdminOverview['campaigns'][number]) => {
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...c, isActive: !c.isActive }),
    });
    if (res.ok) onRefresh();
  };

  const deletePromo = async (id: string) => {
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Promokod o‘chirildi' : 'Промокод удалён', 'info');
      onRefresh();
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siteTitle,
          logoUrl,
          faviconUrl,
          heroTitle: { uz: heroUz, ru: heroRu },
          bannerText: { uz: bannerUz, ru: bannerRu },
          socialLinks: { telegram, discord, instagram, youtube },
          adsEnabled,
          privacyPolicy,
          termsOfService,
        }),
      }),
      fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ maintenanceMode }),
      }),
    ]);
    if (r1.ok && r2.ok) {
      showToast(lang === 'uz' ? 'Sozlamalar saqlandi' : 'Настройки сохранены', 'success');
      onRefresh();
    } else {
      showToast('Error saving settings', 'error');
    }
  };

  if (moduleId === 'notifications') {
    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E7B65B]" />
            {lang === 'uz' ? 'Bildirishnoma yuborish' : 'Отправить уведомление'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <input
              value={ntfTitle}
              onChange={(e) => setNtfTitle(e.target.value)}
              placeholder={lang === 'uz' ? 'Sarlavha...' : 'Заголовок...'}
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
            <select
              value={ntfAudience}
              onChange={(e) => setNtfAudience(e.target.value as AdminNotificationRecord['audience'])}
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            >
              <option value="GLOBAL">GLOBAL (All Users)</option>
              <option value="VIP">VIP Members</option>
              <option value="TOURNAMENT">Tournament Players</option>
              <option value="PRODUCT">Product Launch</option>
              <option value="MAINTENANCE">Maintenance Alert</option>
              <option value="SELECTED">Selected User IDs</option>
            </select>
          </div>
          {ntfAudience === 'SELECTED' && (
            <input
              value={ntfTargetIds}
              onChange={(e) => setNtfTargetIds(e.target.value)}
              placeholder="usr_1, usr_2, ..."
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
            />
          )}
          <textarea
            rows={3}
            value={ntfContent}
            onChange={(e) => setNtfContent(e.target.value)}
            placeholder={lang === 'uz' ? 'Xabar matni...' : 'Текст сообщения...'}
            className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-xs text-[#F5F5F7]"
          />
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!ntfTitle.trim() || !ntfContent.trim()) {
                  showToast(lang === 'uz' ? 'Sarlavha va matn kiriting' : 'Заполните поля', 'error');
                  return;
                }
                setConfirmSend(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E63946] hover:bg-[#d32f3d] text-xs font-bold text-white"
            >
              <Send className="w-3.5 h-3.5" />
              {lang === 'uz' ? 'Yuborish' : 'Отправить'}
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#F5F5F7]">
            {lang === 'uz' ? 'Yuborilgan bildirishnomalar' : 'История уведомлений'} ({data.notifications.length})
          </h4>
          {data.notifications.length === 0 ? (
            <p className="text-xs text-[#F5F5F7]/50 py-6 text-center">
              {lang === 'uz' ? 'Tarix bo‘sh' : 'История пуста'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {data.notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F5F5F7]">{n.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#E7B65B]/15 text-[#E7B65B] text-[10px] font-bold">
                        {n.audience}
                      </span>
                    </div>
                    <p className="text-[#F5F5F7]/70 mt-1">{n.content}</p>
                    <p className="text-[10px] font-mono text-[#F5F5F7]/40 mt-1">
                      {n.createdBy} • {n.recipientCount} recipients • {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {n.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmSend && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-[#E7B65B]/40">
              <h3 className="font-display text-base font-bold text-[#F5F5F7]">
                {lang === 'uz' ? 'Yuborishni tasdiqlaysizmi?' : 'Подтвердить отправку?'}
              </h3>
              <p className="text-xs text-[#F5F5F7]/70">
                Audience: <span className="text-[#E7B65B] font-bold">{ntfAudience}</span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmSend(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs text-[#F5F5F7]"
                >
                  {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                </button>
                <button
                  onClick={sendNotification}
                  className="px-4 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                >
                  {lang === 'uz' ? 'Ha, yuborish' : 'Да, отправить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (moduleId === 'promos') {
    return (
      <div className="space-y-6">
        <form onSubmit={createPromo} className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#E7B65B]" />
            {lang === 'uz' ? 'Yangi promokod' : 'Новый промокод'}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="CODE2025"
              required
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7] font-mono"
            />
            <input
              value={promoTitleUz}
              onChange={(e) => setPromoTitleUz(e.target.value)}
              placeholder="Title (UZ)"
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
            <select
              value={promoType}
              onChange={(e) => setPromoType(e.target.value as 'PERCENT' | 'FIXED')}
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            >
              <option value="PERCENT">Percent (%)</option>
              <option value="FIXED">Fixed (UZS)</option>
            </select>
            <input
              type="number"
              min={1}
              value={promoValue}
              onChange={(e) => setPromoValue(Number(e.target.value))}
              placeholder="Value"
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
            <select
              value={promoAppliesTo}
              onChange={(e) => setPromoAppliesTo(e.target.value as typeof promoAppliesTo)}
              className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            >
              <option value="ALL">ALL</option>
              <option value="VIP_PLAN">VIP_PLAN</option>
              <option value="SHOP_PRODUCT">SHOP_PRODUCT</option>
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={promoMaxUses}
                onChange={(e) => setPromoMaxUses(Number(e.target.value))}
                placeholder="Max uses"
                className="w-20 px-2 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
              />
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#E63946] text-white font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        <div className="glass-panel rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-[#F5F5F7]/45 border-b border-white/10">
              <tr>
                <th className="py-2.5 pr-3">Code</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Chegirma' : 'Скидка'}</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Qamrov' : 'Область'}</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Ishlatilgan' : 'Использовано'}</th>
                <th className="py-2.5 pr-3">{lang === 'uz' ? 'Holat' : 'Статус'}</th>
                <th className="py-2.5 text-right">{lang === 'uz' ? 'Amallar' : 'Действия'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-3 font-mono font-bold text-[#E7B65B]">{c.code}</td>
                  <td className="py-3 pr-3 font-mono">
                    {c.discountType === 'FIXED'
                      ? `${(c.fixedAmountUzs || 0).toLocaleString()} UZS`
                      : `${c.discountPercent}%`}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px]">{c.appliesTo}</td>
                  <td className="py-3 pr-3 font-mono">
                    {c.usedCount || 0} / {c.maxUses || '∞'}
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      onClick={() => togglePromo(c)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-[#F5F5F7]/50'
                      }`}
                    >
                      {c.isActive ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => deletePromo(c.id)}
                      className="p-1.5 rounded-lg bg-[#E63946]/15 hover:bg-[#E63946]/25 text-[#E63946]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Module 12: Website Settings
  return (
    <form onSubmit={saveSettings} className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-[#F5F5F7] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#E7B65B]" />
            {lang === 'uz' ? 'Sayt sozlamalari' : 'Настройки сайта'}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="accent-[#E63946]"
            />
            <span className="font-bold text-[#E63946]">Maintenance Mode</span>
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Site Title</label>
            <input
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Logo URL</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Favicon URL</label>
            <input
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Hero Title (UZ)</label>
            <input
              value={heroUz}
              onChange={(e) => setHeroUz(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Hero Title (RU)</label>
            <input
              value={heroRu}
              onChange={(e) => setHeroRu(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Announcement Banner (UZ)</label>
            <input
              value={bannerUz}
              onChange={(e) => setBannerUz(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Announcement Banner (RU)</label>
            <input
              value={bannerRu}
              onChange={(e) => setBannerRu(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="Telegram URL"
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
          <input
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="Discord URL"
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="Instagram URL"
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
          <input
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="YouTube URL"
            className="px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Privacy Policy</label>
            <textarea
              rows={3}
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
          <div>
            <label className="text-[#F5F5F7]/60 block mb-1">Terms of Service</label>
            <textarea
              rows={3}
              value={termsOfService}
              onChange={(e) => setTermsOfService(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090B12] border border-white/10 text-[#F5F5F7]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={adsEnabled}
              onChange={(e) => setAdsEnabled(e.target.checked)}
              className="accent-[#E7B65B]"
            />
            <span className="text-[#F5F5F7] font-semibold">
              {lang === 'uz' ? 'Reklamalarni yoqish (VIP uchun o‘chiriladi)' : 'Показывать рекламу (откл. для VIP)'}
            </span>
          </label>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#E63946] hover:bg-[#d32f3d] text-white font-bold"
          >
            {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
          </button>
        </div>
      </div>
    </form>
  );
};
