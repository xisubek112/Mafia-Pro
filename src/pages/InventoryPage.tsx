import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  History,
  Package,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../shared/roles';
import { resolveShopImageSrc } from '../shared/shopArtwork';
import { createFunctionalProductCategories } from '../shared/functionalShop';
import {
  FunctionalItemCategory,
  InventoryItemRecord,
  InventoryItemStatus,
  InventoryTransactionRecord,
  ItemUsageHistoryRecord,
  OrderRecord,
  ShopProduct,
  StatisticsResetRecord,
  SubscriptionRecord,
} from '../shared/types';

type LegacyCosmeticProduct = ShopProduct & {
  category: string;
};

export const InventoryPage: React.FC = () => {
  const { user, token, lang, refreshUser, showToast, navigate } = useApp();
  const [functionalItems, setFunctionalItems] = useState<
    (InventoryItemRecord & { product?: ShopProduct })[]
  >([]);
  const [legacyItems, setLegacyItems] = useState<LegacyCosmeticProduct[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransactionRecord[]>([]);
  const [usageHistory, setUsageHistory] = useState<ItemUsageHistoryRecord[]>([]);
  const [resetHistory, setResetHistory] = useState<StatisticsResetRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | FunctionalItemCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryItemStatus>('ALL');
  const [historyTab, setHistoryTab] = useState<'TRANSACTIONS' | 'USAGE' | 'RESETS' | 'ORDERS'>(
    'TRANSACTIONS'
  );
  const [showLegacyCollection, setShowLegacyCollection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetConfirmItem, setResetConfirmItem] = useState<
    (InventoryItemRecord & { product?: ShopProduct }) | null
  >(null);

  const functionalCategories = createFunctionalProductCategories();

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
        setFunctionalItems(d.functionalItems || []);
        setLegacyItems(d.items || []);
        setTransactions(d.transactions || []);
        setUsageHistory(d.usageHistory || []);
        setResetHistory(d.resetHistory || []);
        setOrders(d.orders || []);
        setSubscriptions(d.subscriptions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [token, user?.totalGames, user?.activeRolePreference]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#F5F5F7]/70 mb-4">
          {lang === 'uz'
            ? 'Inventarni ko‘rish uchun hisobga kiring.'
            : 'Войдите для просмотра инвентаря.'}
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

  const handleConfirmStatsReset = async () => {
    if (!token || !resetConfirmItem) return;
    setBusyId(resetConfirmItem.id);
    try {
      const res = await fetch('/api/inventory/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inventoryItemId: resetConfirmItem.id, confirmed: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResetConfirmItem(null);
      await refreshUser();
      await loadInventory();
      showToast(
        lang === 'uz'
          ? 'Ommaviy statistika muvaffaqiyatli tozalandi! ELO reytingingiz saqlandi.'
          : 'Публичная статистика сброшена! Ваш рейтинг ELO сохранён.',
        'success'
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRolePref = async (roleId: string) => {
    if (!token) return;
    setBusyId(`role_${roleId}`);
    try {
      const nextRole = user.activeRolePreference === roleId ? null : roleId;
      const res = await fetch('/api/shop/role-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roleId: nextRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await refreshUser();
      await loadInventory();
      showToast(
        nextRole
          ? lang === 'uz'
            ? 'Standart rol afzalligi belgilandi'
            : 'Предпочитаемая роль выбрана'
          : lang === 'uz'
            ? 'Rol afzalligi bekor qilindi'
            : 'Выбор роли снят',
        'success'
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleLegacyEquip = async (itemId: string) => {
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
      showToast(lang === 'uz' ? 'Kolleksiya yangilandi' : 'Коллекция обновлена', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filteredItems = functionalItems.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && (item.status || 'ACTIVE') !== statusFilter) return false;
    return true;
  });

  const activeCount = functionalItems.filter(
    (i) => i.status === 'ACTIVE' || i.status === 'EQUIPPED'
  ).length;
  const consumedCount = functionalItems.filter((i) => i.status === 'CONSUMED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <Package className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'Taktik Inventar' : 'Тактический инвентарь'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'Sotib olingan himoya buyumlari, hujjatlar, statistika tozalagichlar va rol jetonlarini boshqaring.'
              : 'Управляйте купленной защитой, документами, сбросом статистики и жетонами ролей.'}
          </p>
        </div>
        <button
          onClick={() => navigate('store')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90 self-start whitespace-nowrap"
        >
          <ShoppingBag className="w-4 h-4" />
          {lang === 'uz' ? 'Do‘konga o‘tish' : 'В магазин'}
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel rounded-xl p-4 border border-white/10">
          <p className="text-[11px] text-[#F5F5F7]/55">
            {lang === 'uz' ? 'Faol buyumlar' : 'Активные предметы'}
          </p>
          <p className="font-mono text-xl font-bold text-emerald-400 tabular-nums mt-1">
            {activeCount}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-white/10">
          <p className="text-[11px] text-[#F5F5F7]/55">
            {lang === 'uz' ? 'Sarflangan' : 'Использовано'}
          </p>
          <p className="font-mono text-xl font-bold text-[#F5F5F7] tabular-nums mt-1">
            {consumedCount}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-white/10">
          <p className="text-[11px] text-[#F5F5F7]/55">
            {lang === 'uz' ? 'Ochilgan rollar' : 'Открытые роли'}
          </p>
          <p className="font-mono text-xl font-bold text-[#E7B65B] tabular-nums mt-1">
            {user.unlockedRoles?.length || 0}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-white/10">
          <p className="text-[11px] text-[#F5F5F7]/55">
            {lang === 'uz' ? 'Joriy ELO reytingi' : 'Текущий ELO рейтинг'}
          </p>
          <p className="font-mono text-xl font-bold text-[#38BDF8] tabular-nums mt-1">
            {user.rating}
          </p>
        </div>
      </div>

      {/* Status + Category Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'ACTIVE', 'EQUIPPED', 'CONSUMED', 'EXPIRED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === st
                  ? 'bg-[#E7B65B] border-[#E7B65B] text-[#090B12]'
                  : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/70 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-[#E63946] border-[#E63946] text-white'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            {lang === 'uz' ? 'Barchasi' : 'Все'} ({functionalItems.length})
          </button>
          {functionalCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.slug as FunctionalItemCategory)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                categoryFilter === cat.slug
                  ? 'bg-[#E63946] border-[#E63946] text-white'
                  : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
              }`}
            >
              {cat.name[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Functional Items Grid */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[#F5F5F7]/60">
          {lang === 'uz' ? 'Yuklanmoqda...' : 'Загрузка...'}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-[#F5F5F7]/70">
            {lang === 'uz'
              ? 'Tanlangan filtr bo‘yicha inventarda buyum topilmadi.'
              : 'В инвентаре пока нет предметов по выбранному фильтру.'}
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
          {filteredItems.map((inv) => {
            const prod = inv.product;
            const status = inv.status || 'ACTIVE';
            const artSrc = resolveShopImageSrc(prod?.imageUrl, inv.category);
            const catDef = functionalCategories.find((c) => c.slug === inv.category);
            const isRoleItem = inv.category === 'ROLE_PURCHASE' && Boolean(inv.targetRoleId);
            const isSelectedRolePref = Boolean(
              inv.targetRoleId && user.activeRolePreference === inv.targetRoleId
            );
            const isActiveOrEquipped = status === 'ACTIVE' || status === 'EQUIPPED';

            return (
              <motion.div
                key={inv.id}
                whileHover={{ y: -2 }}
                className={`glass-panel rounded-2xl p-5 flex flex-col justify-between border ${
                  status === 'EXPIRED' || status === 'CONSUMED'
                    ? 'border-white/5 opacity-65'
                    : isSelectedRolePref
                      ? 'border-[#E7B65B]/60'
                      : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#F5F5F7]/60">
                      {catDef ? catDef.name[lang] : inv.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : status === 'EQUIPPED'
                            ? 'bg-[#E7B65B]/20 text-[#E7B65B]'
                            : 'bg-white/10 text-[#F5F5F7]/60'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    className="h-28 rounded-xl mb-4 flex items-center justify-center border border-white/10 overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at center, ${prod?.previewColor || '#E7B65B'}33, #090B12 85%)`,
                    }}
                  >
                    {artSrc ? (
                      <img
                        src={artSrc}
                        alt={(inv.itemName || prod?.name)?.[lang] || inv.productId}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-[#E7B65B]" />
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
                      {(inv.itemName || prod?.name)?.[lang] || inv.productId}
                    </h3>
                    {(inv.quantity || 1) > 1 && (
                      <span className="font-mono text-xs font-bold text-[#E7B65B] shrink-0">
                        x{inv.quantity}
                      </span>
                    )}
                  </div>
                  {prod?.description && (
                    <p className="mt-1 text-xs text-[#F5F5F7]/70">{prod.description[lang]}</p>
                  )}

                  <div className="mt-3 space-y-1 text-[11px] font-mono text-[#F5F5F7]/60">
                    <div>
                      {lang === 'uz' ? 'Qolgan zaryad:' : 'Остаток зарядов:'}{' '}
                      <strong className="text-[#F5F5F7]">
                        {inv.remainingUses === -1
                          ? lang === 'uz'
                            ? 'Cheksiz'
                            : '∞'
                          : inv.remainingUses ?? 1}
                      </strong>
                    </div>
                    {inv.expiresAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E7B65B]" />
                        <span>
                          {lang === 'uz' ? 'Muddat:' : 'Срок:'}{' '}
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {inv.targetRoleId && (
                      <div className="text-[#38BDF8]">
                        {lang === 'uz' ? 'Rol:' : 'Роль:'} {ROLES[inv.targetRoleId]?.name[lang] || inv.targetRoleId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  {inv.category === 'STATISTICS_RESET' && isActiveOrEquipped ? (
                    <button
                      onClick={() => setResetConfirmItem(inv)}
                      disabled={busyId === inv.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 text-xs font-bold text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {lang === 'uz' ? 'Statistikani tozalash' : 'Сбросить статистику'}
                    </button>
                  ) : isRoleItem && isActiveOrEquipped && inv.targetRoleId ? (
                    <button
                      onClick={() => handleToggleRolePref(inv.targetRoleId!)}
                      disabled={busyId === `role_${inv.targetRoleId}`}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isSelectedRolePref
                          ? 'bg-[#E7B65B]/20 text-[#E7B65B] border border-[#E7B65B]/50'
                          : 'bg-white/10 text-[#F5F5F7] hover:bg-white/15'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isSelectedRolePref
                        ? lang === 'uz'
                          ? 'Tanlangan (Bekor qilish)'
                          : 'Выбрано (Снять)'
                        : lang === 'uz'
                          ? 'Asosiy rol sifatida tanlash'
                          : 'Выбрать приоритетной'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#F5F5F7]/55">
                      {isActiveOrEquipped
                        ? lang === 'uz'
                          ? 'O‘yin ichida avtomatik ko‘rinadi'
                          : 'Доступно внутри матча'
                        : lang === 'uz'
                          ? 'Foydalanish tugagan'
                          : 'Неактивно'}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pre-Owned Battle Pass / Referral Collection (No Store Purchase Option) */}
      {legacyItems.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-[#F5F5F7]">
                {lang === 'uz'
                  ? 'Avvalgi mukofotlar kolleksiyasi (Battle Pass / Referal)'
                  : 'Ранее полученные награды (Battle Pass / Рефералы)'}
              </h2>
              <p className="text-xs text-[#F5F5F7]/55">
                {lang === 'uz'
                  ? 'Do‘kondan kosmetika xaridi o‘chirilgan; avvalgi shaxsiy mukofotlaringiz saqlangan.'
                  : 'Покупка косметики в магазине отключена; ваши ранее полученные награды сохранены.'}
              </p>
            </div>
            <button
              onClick={() => setShowLegacyCollection((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-[#F5F5F7]"
            >
              {showLegacyCollection
                ? lang === 'uz'
                  ? 'Yopish'
                  : 'Скрыть'
                : `${lang === 'uz' ? 'Ko‘rish' : 'Показать'} (${legacyItems.length})`}
            </button>
          </div>
          {showLegacyCollection && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {legacyItems.map((it) => {
                const equipped = user.equippedCosmetics?.[it.category as keyof typeof user.equippedCosmetics] === it.id;
                return (
                  <div
                    key={it.id}
                    className="p-4 rounded-xl bg-[#090B12] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#F5F5F7] truncate">{it.name[lang]}</p>
                      <p className="text-[10px] text-[#F5F5F7]/50">{it.category}</p>
                    </div>
                    <button
                      onClick={() => handleLegacyEquip(it.id)}
                      disabled={busyId === it.id}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${
                        equipped ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-[#F5F5F7]'
                      }`}
                    >
                      {equipped
                        ? lang === 'uz'
                          ? 'Faol'
                          : 'Надето'
                        : lang === 'uz'
                          ? 'Tanlash'
                          : 'Надеть'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detailed Audit / Usage / Orders History */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
            <History className="w-5 h-5 text-[#E7B65B]" />
            {lang === 'uz' ? 'Tranzaksiyalar va Foydalanish tarixi' : 'История операций и использования'}
          </h2>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#090B12] border border-white/10">
            {[
              { id: 'TRANSACTIONS', label: lang === 'uz' ? 'Inventar amallari' : 'Операции' },
              { id: 'USAGE', label: lang === 'uz' ? 'O‘yinda qo‘llash' : 'В матчах' },
              { id: 'RESETS', label: lang === 'uz' ? 'Statistika tozalash' : 'Сбросы стат.' },
              { id: 'ORDERS', label: lang === 'uz' ? 'UZS & VIP' : 'Заказы и VIP' },
            ].map((tb) => (
              <button
                key={tb.id}
                onClick={() => setHistoryTab(tb.id as typeof historyTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  historyTab === tb.id ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        {historyTab === 'TRANSACTIONS' && (
          <div className="divide-y divide-white/10 max-h-[260px] overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-xs text-[#F5F5F7]/50 py-4">
                {lang === 'uz' ? 'Inventar amallari hali yo‘q' : 'Операций с инвентарём пока нет'}
              </p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">
                      {tx.productName} · <span className="text-[#E7B65B] font-mono">{tx.action}</span>
                    </p>
                    <p className="text-[11px] text-[#F5F5F7]/50">{tx.details}</p>
                  </div>
                  <span className="text-[11px] font-mono text-[#F5F5F7]/50 shrink-0">
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {historyTab === 'USAGE' && (
          <div className="divide-y divide-white/10 max-h-[260px] overflow-y-auto">
            {usageHistory.length === 0 ? (
              <p className="text-xs text-[#F5F5F7]/50 py-4">
                {lang === 'uz' ? 'O‘yinda ishlatish tarixi yo‘q' : 'История использования в играх пуста'}
              </p>
            ) : (
              usageHistory.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">
                      {u.effectType} {u.roomCode ? `· ${u.roomCode}` : ''}
                    </p>
                    <p className="text-[11px] text-[#F5F5F7]/55">{u.outcome}</p>
                  </div>
                  <span className="text-[11px] font-mono text-[#F5F5F7]/50 shrink-0">
                    {new Date(u.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {historyTab === 'RESETS' && (
          <div className="divide-y divide-white/10 max-h-[260px] overflow-y-auto">
            {resetHistory.length === 0 ? (
              <p className="text-xs text-[#F5F5F7]/50 py-4">
                {lang === 'uz' ? 'Statistika tozalanmagan' : 'Сбросов статистики ещё не было'}
              </p>
            ) : (
              resetHistory.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">
                      {lang === 'uz' ? 'Oldingi W/L:' : 'До сброса:'}{' '}
                      {r.previousSnapshot.wins}W / {r.previousSnapshot.losses}L ({r.previousSnapshot.totalGames}{' '}
                      {lang === 'uz' ? 'o‘yin' : 'игр'})
                    </p>
                    <p className="text-[11px] text-emerald-400">
                      {lang === 'uz' ? 'Saqlangan ELO:' : 'Сохранённый ELO:'} {r.preservedEloRating}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#F5F5F7]/50 shrink-0">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {historyTab === 'ORDERS' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F7]/75 mb-2">
                {lang === 'uz' ? 'Buyurtmalar (UZS)' : 'Заказы (UZS)'}
              </h3>
              <div className="divide-y divide-white/10 max-h-[220px] overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="text-xs text-[#F5F5F7]/50">{lang === 'uz' ? 'Buyurtmalar yo‘q' : 'Заказов нет'}</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-[#F5F5F7]">{ord.itemName}</p>
                        <p className="text-[11px] text-[#F5F5F7]/45 font-mono">
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
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F7]/75 mb-2 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#E7B65B]" />
                {lang === 'uz' ? 'VIP Obunalar' : 'VIP Подписки'}
              </h3>
              <div className="divide-y divide-white/10 max-h-[220px] overflow-y-auto">
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-[#F5F5F7]/50">
                    {lang === 'uz' ? 'VIP obunalar yo‘q' : 'VIP подписок нет'}
                  </p>
                ) : (
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-[#F5F5F7]">{sub.planName}</p>
                        <p className="text-[#F5F5F7]/45">
                          {new Date(sub.startedAt).toLocaleDateString()} —{' '}
                          {new Date(sub.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#E7B65B]">{sub.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Reset Confirmation Modal */}
      <AnimatePresence>
        {resetConfirmItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => !busyId && setResetConfirmItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 border border-[#E63946]/40 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#E63946]">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
                    {lang === 'uz' ? 'Statistikani tozalashni tasdiqlang' : 'Подтвердите сброс статистики'}
                  </h3>
                </div>
                <button
                  onClick={() => setResetConfirmItem(null)}
                  className="p-1.5 rounded-lg text-[#F5F5F7]/60 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 rounded-xl bg-[#E63946]/10 border border-[#E63946]/30 text-[#FCA5A5]">
                  <p className="font-bold mb-1">
                    {lang === 'uz' ? 'Nollar tushadigan ko‘rsatkichlar:' : 'Что будет сброшено:'}
                  </p>
                  <p>
                    {lang === 'uz'
                      ? 'G‘alabalar, mag‘lubiyatlar, o‘yinlar soni, joriy va eng yaxshi g‘alaba seriyalari, rol/rejim hisoblagichlari.'
                      : 'Победы, поражения, количество матчей, серии побед и счётчики ролей/режимов.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {lang === 'uz' ? 'Doimiy saqlanadigan ma’lumotlar:' : 'Что НИКОГДА не сбрасывается:'}
                  </p>
                  <p>
                    {lang === 'uz'
                      ? 'Raqobatbardosh ELO reytingingiz, to‘lovlar, buyurtmalar, o‘yin tarixi va moderatsiya yozuvlari.'
                      : 'Ваш соревновательный ELO рейтинг, платежи, заказы, история матчей и записи модерации.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetConfirmItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-semibold text-[#F5F5F7]"
                >
                  {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatsReset}
                  disabled={busyId === resetConfirmItem.id}
                  className="px-4 py-2.5 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busyId === resetConfirmItem.id
                    ? '...'
                    : lang === 'uz'
                      ? 'Ha, statistikani tozala'
                      : 'Да, сбросить статистику'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
