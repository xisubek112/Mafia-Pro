import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Crown,
  Gem,
  Lock,
  Package,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../shared/roles';
import { resolveShopImageSrc } from '../shared/shopArtwork';
import {
  FunctionalItemCategory,
  InventoryItemRecord,
  OrderRecord,
  PaymentProvider,
  ProductCategory,
  PromoCampaign,
  ShopProduct,
  VipPlan,
} from '../shared/types';

export const StorePage: React.FC = () => {
  const { user, token, lang, refreshUser, showToast, navigate } = useApp();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [vipPlans, setVipPlans] = useState<VipPlan[]>([]);
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('sandbox');
  const [category, setCategory] = useState<'ALL' | FunctionalItemCategory>('ALL');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<{
    orderType: 'VIP_PLAN' | 'SHOP_PRODUCT';
    referenceId: string;
    title: string;
    basePriceUzs: number;
  } | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>('PAYME');
  const [promoCode, setPromoCode] = useState('');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/shop/catalog');
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories || []);
        setProducts(d.products || []);
        setVipPlans(d.vipPlans || []);
        setCampaigns(d.campaigns || []);
        setPaymentMode(d.paymentMode || 'sandbox');
      }
    } catch {
      // ignore
    }
  };

  const loadUserEconomy = async () => {
    if (!token) {
      setOrders([]);
      setInventoryItems([]);
      return;
    }
    try {
      const [histRes, invRes] = await Promise.all([
        fetch('/api/payments/history', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (histRes.ok) {
        const d = await histRes.json();
        setOrders(d.orders || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInventoryItems(d.functionalItems || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadUserEconomy();
  }, [token, user?.gold, user?.diamonds, user?.subscription?.status]);

  const handleBuyCurrency = async (item: ShopProduct, currency: 'GOLD' | 'DIAMONDS') => {
    if (!token) {
      navigate('auth');
      return;
    }
    setBusyId(item.id);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: item.id, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      await loadUserEconomy();
      showToast(
        lang === 'uz'
          ? 'Funksional buyum inventarga qo‘shildi!'
          : 'Предмет успешно добавлен в инвентарь!',
        'success'
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openCheckout = (target: {
    orderType: 'VIP_PLAN' | 'SHOP_PRODUCT';
    referenceId: string;
    title: string;
    basePriceUzs: number;
  }) => {
    if (!token) {
      navigate('auth');
      return;
    }
    setCheckoutTarget(target);
    setActiveOrder(null);
    setPromoCode('');
  };

  const handleCreateOrder = async () => {
    if (!token || !checkoutTarget) return;
    setCheckoutBusy(true);
    try {
      const res = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderType: checkoutTarget.orderType,
          referenceId: checkoutTarget.referenceId,
          provider,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setActiveOrder(d.order);
      await loadUserEconomy();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Order error', 'error');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleSandboxStatus = async (status: 'PAID' | 'FAILED' | 'CANCELLED') => {
    if (!token || !activeOrder) return;
    setCheckoutBusy(true);
    try {
      const res = await fetch('/api/payments/sandbox/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: activeOrder.id, status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await refreshUser();
      await loadUserEconomy();
      setCheckoutTarget(null);
      setActiveOrder(null);
      showToast(
        status === 'PAID'
          ? lang === 'uz'
            ? 'To‘lov tasdiqlandi! Buyum inventaringizga qo‘shildi.'
            : 'Оплата подтверждена! Предмет добавлен в инвентарь.'
          : lang === 'uz'
            ? `To‘lov holati: ${status}`
            : `Статус оплаты: ${status}`,
        status === 'PAID' ? 'success' : 'info'
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Payment error', 'error');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleRequestRefund = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/payments/orders/${orderId}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reason: lang === 'uz' ? 'Foydalanuvchi qaytarish so‘radi' : 'Запрос возврата от пользователя',
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await loadUserEconomy();
      showToast(lang === 'uz' ? 'Qaytarish so‘rovi yuborildi' : 'Запрос на возврат отправлен', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const filteredProducts = products.filter((p) => category === 'ALL' || p.category === category);
  const activeInvCount = inventoryItems.filter(
    (i) => i.status === 'ACTIVE' || i.status === 'EQUIPPED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'MAFIA PRO Taktik Do‘kon' : 'Тактический магазин MAFIA PRO'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'VIP obunalar, o‘yin ichidagi himoya buyumlari, hujjatlar, statistika tozalash va rol tanlov jetonlari.'
              : 'VIP-подписки, тактическая защита, документы, сброс публичной статистики и жетоны активных ролей.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <>
              <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border border-[#E7B65B]/30">
                <Coins className="w-4 h-4 text-[#E7B65B]" />
                <span className="font-mono font-bold text-[#E7B65B] tabular-nums">{user.gold}</span>
              </div>
              <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 border border-[#38BDF8]/30">
                <Gem className="w-4 h-4 text-[#38BDF8]" />
                <span className="font-mono font-bold text-[#38BDF8] tabular-nums">{user.diamonds}</span>
              </div>
              <button
                onClick={() => navigate('inventory')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7] whitespace-nowrap"
              >
                <Package className="w-4 h-4 text-[#E7B65B]" />
                {lang === 'uz' ? 'Inventar' : 'Инвентарь'} ({activeInvCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Promo Banner */}
      {campaigns.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-[#E7B65B]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Tag className="w-4 h-4 text-[#E7B65B]" />
            <span className="font-semibold text-[#F5F5F7]">
              {campaigns[0].title[lang]} — -{campaigns[0].discountPercent}%
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#E7B65B]">
            {lang === 'uz' ? 'Promokod:' : 'Промокод:'} {campaigns[0].code}
          </span>
        </div>
      )}

      {/* VIP Membership Plans */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#E7B65B]" />
            <h2 className="font-display text-xl font-bold text-[#F5F5F7]">
              {lang === 'uz' ? 'VIP A’zolik Rejalari' : 'Тарифы VIP-подписки'}
            </h2>
          </div>
          {user && (
            <span className="text-xs font-mono text-[#F5F5F7]/70">
              {lang === 'uz' ? 'Joriy holat:' : 'Статус:'}{' '}
              <strong className="text-[#E7B65B]">{user.subscription.status}</strong>
              {user.subscription.expiresAt
                ? ` · ${new Date(user.subscription.expiresAt).toLocaleDateString()}`
                : ''}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {vipPlans.map((plan) => (
            <div
              key={plan.id}
              className="glass-panel-elevated rounded-2xl p-6 border border-[#E7B65B]/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">{plan.name[lang]}</h3>
                  <span className="font-mono text-xs text-[#E7B65B] font-bold">
                    {plan.durationDays} {lang === 'uz' ? 'kun' : 'дн.'}
                  </span>
                </div>
                <p className="text-xs text-[#F5F5F7]/70 leading-relaxed">{plan.description[lang]}</p>
                <p className="mt-4 font-mono text-2xl font-extrabold text-[#E7B65B] tabular-nums">
                  {plan.priceUzs.toLocaleString()} <span className="text-xs font-semibold">UZS</span>
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-[#F5F5F7]/80">
                  {(plan.features[lang] || []).map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() =>
                  openCheckout({
                    orderType: 'VIP_PLAN',
                    referenceId: plan.id,
                    title: plan.name[lang],
                    basePriceUzs: plan.priceUzs,
                  })
                }
                className="mt-6 w-full py-2.5 rounded-xl bg-[#E7B65B] hover:bg-[#E7B65B]/90 text-xs font-bold text-[#090B12] transition-colors"
              >
                {lang === 'uz' ? 'VIP Faollashtirish' : 'Активировать VIP'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Functional Game Shop */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-[#F5F5F7] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#E63946]" />
            {lang === 'uz' ? 'Funksional O‘yin Buyumlari' : 'Функциональные игровые предметы'}
          </h2>
          <span className="text-xs text-[#F5F5F7]/55">
            {filteredProducts.length} {lang === 'uz' ? 'ta faol mahsulot' : 'активных товаров'}
          </span>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
              category === 'ALL'
                ? 'bg-[#E63946] border-[#E63946] text-white'
                : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
            }`}
          >
            {lang === 'uz' ? 'Barchasi' : 'Все'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.slug as FunctionalItemCategory)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                category === cat.slug
                  ? 'bg-[#E63946] border-[#E63946] text-white'
                  : 'bg-[#111522] border-white/10 text-[#F5F5F7]/70 hover:text-white'
              }`}
            >
              {cat.name[lang]}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((item) => {
            const catDef = categories.find((c) => c.slug === item.category);
            const artSrc = resolveShopImageSrc(item.imageUrl, item.category);
            const matchingOwned = inventoryItems.filter(
              (inv) =>
                inv.productId === item.id &&
                (inv.status === 'ACTIVE' || inv.status === 'EQUIPPED')
            );
            const ownedTotalQty = matchingOwned.reduce((acc, inv) => acc + (inv.quantity || 1), 0);
            const roleUnlockOwned = Boolean(
              item.effectType === 'ROLE_UNLOCK' &&
                item.effectConfig?.targetRoleId &&
                user?.unlockedRoles?.includes(item.effectConfig.targetRoleId)
            );
            const atPurchaseLimit =
              roleUnlockOwned ||
              (item.isUnique && ownedTotalQty > 0) ||
              (typeof item.purchaseLimitPerUser === 'number' &&
                item.purchaseLimitPerUser > 0 &&
                ownedTotalQty >= item.purchaseLimitPerUser);
            const targetRoleName = item.effectConfig?.targetRoleId
              ? ROLES[item.effectConfig.targetRoleId]?.name[lang]
              : undefined;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between border border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#F5F5F7]/65 truncate">
                      {catDef ? catDef.name[lang] : item.category}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {ownedTotalQty > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          {lang === 'uz' ? 'Bor:' : 'Есть:'} x{ownedTotalQty}
                        </span>
                      )}
                      <span className="text-[11px] font-bold" style={{ color: item.previewColor }}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-32 rounded-xl mb-4 flex items-center justify-center border border-white/10 overflow-hidden relative"
                    style={{
                      background: `radial-gradient(circle at center, ${item.previewColor}33, #090B12 85%)`,
                    }}
                  >
                    {artSrc ? (
                      <img src={artSrc} alt={item.name[lang]} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-8 h-8" style={{ color: item.previewColor }} />
                    )}
                    {item.vipOnly && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#090B12]/85 border border-[#E7B65B]/50 text-[10px] font-bold text-[#E7B65B] inline-flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">{item.name[lang]}</h3>
                  <p className="mt-1 text-xs text-[#F5F5F7]/70 leading-relaxed">{item.description[lang]}</p>

                  {/* Functional Metadata */}
                  <div className="mt-3 space-y-1 text-[11px] text-[#F5F5F7]/60">
                    {item.usageCondition && (
                      <p className="flex items-center gap-1.5 text-[#E7B65B]/90">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.usageCondition[lang]}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[#F5F5F7]/55">
                      <span>
                        {item.maxUsesPerItem === -1
                          ? lang === 'uz'
                            ? 'Cheksiz'
                            : 'Безлимит'
                          : `${item.maxUsesPerItem || 1} ${lang === 'uz' ? 'zaryad' : 'использ.'}`}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.durationHours && item.durationHours > 0
                          ? `${Math.round(item.durationHours / 24)} ${lang === 'uz' ? 'kun' : 'дн.'}`
                          : lang === 'uz'
                            ? 'Muddat cheklanmagan'
                            : 'Бессрочно'}
                      </span>
                      {targetRoleName && (
                        <>
                          <span>·</span>
                          <span className="text-[#38BDF8] font-bold">{targetRoleName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold tabular-nums">
                    <span className="text-[#F5F5F7]/65">
                      {lang === 'uz' ? 'O‘yin valyutasi' : 'Игровая валюта'}
                    </span>
                    <div className="flex items-center gap-3 text-[#F5F5F7]/85">
                      {item.priceGold && item.priceGold > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#E7B65B]">
                          <Coins className="w-3.5 h-3.5" /> {item.priceGold} Gold
                        </span>
                      ) : null}
                      {item.priceDiamonds && item.priceDiamonds > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#38BDF8]">
                          <Gem className="w-3.5 h-3.5" /> {item.priceDiamonds} Diamonds
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {atPurchaseLimit ? (
                    <button
                      type="button"
                      onClick={() => navigate('inventory')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {roleUnlockOwned
                        ? lang === 'uz'
                          ? 'Rol ochilgan (Inventarda)'
                          : 'Роль открыта (в инвентаре)'
                        : lang === 'uz'
                          ? 'Limit to‘lgan — Inventar'
                          : 'Лимит достигнут — Инвентарь'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.priceGold && item.priceGold > 0 && item.currencyMode !== 'DIAMONDS' ? (
                        <button
                          onClick={() => handleBuyCurrency(item, 'GOLD')}
                          disabled={busyId === item.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 text-xs font-bold text-white disabled:opacity-50 whitespace-nowrap"
                        >
                          {item.vipOnly && <Lock className="w-3 h-3 text-[#E7B65B]" />}
                          <Coins className="w-3.5 h-3.5 text-[#E7B65B]" />
                          {item.priceGold} Gold
                        </button>
                      ) : null}
                      {item.priceDiamonds && item.priceDiamonds > 0 && item.currencyMode !== 'GOLD' ? (
                        <button
                          onClick={() => handleBuyCurrency(item, 'DIAMONDS')}
                          disabled={busyId === item.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 border border-[#38BDF8]/40 text-xs font-bold text-[#38BDF8] disabled:opacity-50 whitespace-nowrap"
                        >
                          {item.vipOnly && <Lock className="w-3 h-3 text-[#E7B65B]" />}
                          <Gem className="w-3.5 h-3.5" />
                          {item.priceDiamonds} Diamonds
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Order History */}
      {user && orders.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] mb-4">
            {lang === 'uz' ? 'Buyurtmalar va To‘lovlar tarixi' : 'История заказов и платежей'}
          </h2>
          <div className="divide-y divide-white/10 max-h-[280px] overflow-y-auto">
            {orders.map((ord) => (
              <div key={ord.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-[#F5F5F7]">{ord.itemName}</p>
                  <p className="text-[#F5F5F7]/50 font-mono">
                    {ord.id} · {ord.provider} · {new Date(ord.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#E7B65B] tabular-nums">
                    {ord.amountUzs.toLocaleString()} UZS
                  </span>
                  <span className="font-mono text-[11px] text-[#F5F5F7]/75">{ord.status}</span>
                  {ord.status === 'PAID' && (
                    <button
                      onClick={() => handleRequestRefund(ord.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-[#F5F5F7]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {lang === 'uz' ? 'Qaytarish' : 'Возврат'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Server-Backed Checkout Modal */}
      <AnimatePresence>
        {checkoutTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => !checkoutBusy && setCheckoutTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 border border-white/15 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">
                    {lang === 'uz' ? 'Xavfsiz To‘lov' : 'Безопасная оплата'}
                  </h3>
                </div>
                <button
                  onClick={() => setCheckoutTarget(null)}
                  className="p-1.5 rounded-lg text-[#F5F5F7]/60 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090B12] border border-white/10 text-xs space-y-1">
                <p className="font-bold text-[#F5F5F7]">{checkoutTarget.title}</p>
                <p className="font-mono text-[#E7B65B] text-base font-bold">
                  {checkoutTarget.basePriceUzs.toLocaleString()} UZS
                </p>
                <p className="text-[11px] text-[#F5F5F7]/50">
                  {lang === 'uz' ? 'Rejim:' : 'Режим:'} {paymentMode.toUpperCase()}
                </p>
              </div>

              {!activeOrder ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#F5F5F7]/75 mb-1.5">
                      {lang === 'uz' ? 'To‘lov tizimini tanlang' : 'Выберите платёжную систему'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PAYME', 'CLICK', 'SANDBOX'] as PaymentProvider[]).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setProvider(prov)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                            provider === prov
                              ? 'bg-[#E63946]/20 border-[#E63946] text-white'
                              : 'bg-[#090B12] border-white/10 text-[#F5F5F7]/70'
                          }`}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#F5F5F7]/75 mb-1.5">
                      {lang === 'uz' ? 'Promokod (ixtiyoriy)' : 'Промокод (необязательно)'}
                    </label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="MAFIA20"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B12] border border-white/15 text-xs text-[#F5F5F7]"
                    />
                  </div>

                  <button
                    onClick={handleCreateOrder}
                    disabled={checkoutBusy}
                    className="w-full py-3 rounded-xl bg-[#E63946] hover:bg-[#E63946]/90 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {checkoutBusy
                      ? '...'
                      : lang === 'uz'
                        ? 'Buyurtma yaratish'
                        : 'Создать заказ'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                    <p className="font-mono text-emerald-300 font-bold">
                      Order: {activeOrder.id}
                    </p>
                    <p className="text-[#F5F5F7]">
                      {lang === 'uz' ? 'To‘lov summasi:' : 'К оплате:'}{' '}
                      <strong>{activeOrder.amountUzs.toLocaleString()} UZS</strong>
                      {activeOrder.discountUzs > 0
                        ? ` (-${activeOrder.discountUzs.toLocaleString()} UZS)`
                        : ''}
                    </p>
                  </div>

                  {paymentMode !== 'production' ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[#F5F5F7]/65">
                        {lang === 'uz'
                          ? 'Sandbox test rejimi — server callback natijasini tanlang:'
                          : 'Тестовый режим Sandbox — выберите результат callback:'}
                      </p>
                      <button
                        onClick={() => handleSandboxStatus('PAID')}
                        disabled={checkoutBusy}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                      >
                        {lang === 'uz' ? 'To‘lovni tasdiqlash (PAID)' : 'Подтвердить оплату (PAID)'}
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSandboxStatus('FAILED')}
                          disabled={checkoutBusy}
                          className="py-2 rounded-xl bg-white/10 hover:bg-[#E63946]/25 text-xs font-semibold text-[#F5F5F7]"
                        >
                          FAILED
                        </button>
                        <button
                          onClick={() => handleSandboxStatus('CANCELLED')}
                          disabled={checkoutBusy}
                          className="py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7]"
                        >
                          CANCELLED
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#F5F5F7]/75">
                      {lang === 'uz'
                        ? 'To‘lov provayderi sahifasida to‘lovni yakunlang.'
                        : 'Завершите оплату на странице платёжного провайдера.'}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
