import React, { useEffect, useState } from 'react';
import { Check, Crown, Package, ShoppingBag, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { CosmeticCategory, OrderRecord, ShopProduct, SubscriptionRecord } from '../shared/types';

const CATEGORY_LABELS: Record<CosmeticCategory, { uz: string; ru: string }> = {
  AVATAR: { uz: 'Avatarlar', ru: 'Аватары' },
  FRAME: { uz: 'Ramkalar', ru: 'Рамки' },
  NAME_EFFECT: { uz: 'Ism effektlari', ru: 'Эффекты имени' },
  CHAT_DECORATION: { uz: 'Chat bezaklari', ru: 'Украшения чата' },
  PROFILE_BG: { uz: 'Profil fonlari', ru: 'Фоны профиля' },
  BADGE: { uz: 'Maxsus nishonlar', ru: 'Особые значки' },
  LOBBY_THEME: { uz: 'Xona mavzulari', ru: 'Темы комнат' },
  CARD_SKIN: { uz: 'Karta terilari', ru: 'Скины карт' },
  VICTORY_ANIM: { uz: 'G‘alaba animatsiyasi', ru: 'Анимации победы' },
};

export const InventoryPage: React.FC = () => {
  const { user, token, lang, refreshUser, showToast, navigate } = useApp();
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [category, setCategory] = useState<'ALL' | CosmeticCategory>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInventory = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        setOrders(d.orders || []);
        setSubscriptions(d.subscriptions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [token, user?.ownedCosmetics?.length]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz' ? 'Inventarni ko‘rish uchun hisobga kiring.' : 'Войдите для просмотра инвентаря.'}
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#E63946] text-sm font-bold text-white"
        >
          {lang === 'uz' ? 'Kirish' : 'Войти'}
        </button>
      </div>
    );
  }

  const handleEquip = async (itemId: string) => {
    if (!token) return;
    setBusyId(itemId);
    try {
      const res = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await refreshUser();
      showToast(lang === 'uz' ? 'Jihozlanish yangilandi' : 'Экипировка обновлена', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = items.filter((it) => category === 'ALL' || it.category === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Package className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'Mening Inventarim' : 'Мой инвентарь'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'Sotib olingan avatarlar, ramkalar, ism effektlari va profil fonlarini boshqaring.'
              : 'Управляйте купленными аватарами, рамками, эффектами имени и фонами профиля.'}
          </p>
        </div>
        <button
          onClick={() => navigate('store')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90 self-start"
        >
          <ShoppingBag className="w-4 h-4" />
          {lang === 'uz' ? 'Do‘konga o‘tish' : 'В магазин'}
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            category === 'ALL'
              ? 'bg-[#E63946] border-[#E63946] text-white'
              : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
          }`}
        >
          {lang === 'uz' ? 'Barchasi' : 'Все'} ({items.length})
        </button>
        {(Object.keys(CATEGORY_LABELS) as CosmeticCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              category === cat
                ? 'bg-[#E63946] border-[#E63946] text-white'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            {CATEGORY_LABELS[cat][lang]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/60">
          {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-[#F5F5F7]/70">
            {lang === 'uz'
              ? 'Bu toifada hali sotib olingan buyumlar yo‘q.'
              : 'В этой категории пока нет купленных предметов.'}
          </p>
          <button
            onClick={() => navigate('store')}
            className="px-5 py-2.5 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12]"
          >
            {lang === 'uz' ? 'Do‘kondan xarid qilish' : 'Перейти в магазин'}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const equipped = user.equippedCosmetics[item.category] === item.id;
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                className={`glass-panel rounded-2xl p-5 flex flex-col justify-between border ${
                  equipped ? 'border-emerald-500/45' : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#F5F5F7]/60">
                      {CATEGORY_LABELS[item.category][lang]}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: item.previewColor }}>
                      {item.rarity}
                    </span>
                  </div>
                  <div
                    className="h-24 rounded-xl mb-4 flex items-center justify-center border border-white/10 overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at center, ${item.previewColor}33, #090B12 85%)`,
                    }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name[lang]} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-8 h-8" style={{ color: item.previewColor }} />
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">{item.name[lang]}</h3>
                  <p className="mt-1 text-xs text-[#F5F5F7]/70">{item.description[lang]}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-400">
                    {lang === 'uz' ? 'Sizga tegishli' : 'В коллекции'}
                  </span>
                  <button
                    onClick={() => handleEquip(item.id)}
                    disabled={busyId === item.id}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      equipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/10 text-[#F5F5F7] hover:bg-white/15'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {equipped
                      ? lang === 'uz'
                        ? 'Jihozlangan'
                        : 'Надето'
                      : lang === 'uz'
                        ? 'Jihozlash'
                        : 'Надеть'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Purchase & Subscription History */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] mb-3">
            {lang === 'uz' ? 'Buyurtmalar tarixi (UZS)' : 'История заказов (UZS)'}
          </h2>
          {orders.length === 0 ? (
            <p className="text-xs text-[#F5F5F7]/50">{lang === 'uz' ? 'Buyurtmalar yo‘q' : 'Заказов нет'}</p>
          ) : (
            <div className="divide-y divide-white/10 max-h-[240px] overflow-y-auto">
              {orders.map((ord) => (
                <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">{ord.itemName}</p>
                    <p className="text-[#F5F5F7]/45 font-mono">
                      {ord.provider} · {new Date(ord.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-[#E7B65B] tabular-nums">
                      {ord.amountUzs.toLocaleString()} UZS
                    </p>
                    <p className="text-[11px] font-mono text-[#F5F5F7]/65">{ord.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#E7B65B]" />
            {lang === 'uz' ? 'VIP Obunalar tarixi' : 'История VIP подписок'}
          </h2>
          {subscriptions.length === 0 ? (
            <p className="text-xs text-[#F5F5F7]/50">{lang === 'uz' ? 'VIP obunalar yo‘q' : 'VIP подписок нет'}</p>
          ) : (
            <div className="divide-y divide-white/10 max-h-[240px] overflow-y-auto">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">{sub.planName}</p>
                    <p className="text-[#F5F5F7]/45">
                      {new Date(sub.startedAt).toLocaleDateString()} — {new Date(sub.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#E7B65B]">{sub.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
