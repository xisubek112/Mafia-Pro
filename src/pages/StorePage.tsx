import React, { useEffect, useState } from 'react';
import {
  Check,
  Coins,
  CreditCard,
  Crown,
  Gem,
  Lock,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  CosmeticCategory,
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
  const [category, setCategory] = useState<'ALL' | CosmeticCategory>('ALL');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
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

  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payments/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [token, user?.ownedCosmetics?.length, user?.subscription?.status]);

  const handleBuyCurrency = async (itemId: string) => {
    if (!token) {
      navigate('auth');
      return;
    }
    setBusyId(itemId);
    try {
      const res = await fetch('/api/store/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      showToast(lang === 'uz' ? 'Buyum sotib olindi!' : 'Предмет куплен!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (itemId: string) => {
    if (!token) return;
    setBusyId(itemId);
    try {
      const res = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
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
      await loadOrders();
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
      await loadOrders();
      setCheckoutTarget(null);
      setActiveOrder(null);
      showToast(
        status === 'PAID'
          ? lang === 'uz'
            ? 'To‘lov tasdiqlandi!'
            : 'Оплата подтверждена!'
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
      await loadOrders();
      showToast(lang === 'uz' ? 'Qaytarish so‘rovi yuborildi' : 'Запрос на возврат отправлен', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const filteredProducts = products.filter((p) => category === 'ALL' || p.category === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-[#E7B65B]" />
            {lang === 'uz' ? 'MAFIA PRO 2.0 Do‘koni' : 'Магазин MAFIA PRO 2.0'}
          </h1>
          <p className="mt-1 text-sm text-[#F5F5F7]/65">
            {lang === 'uz'
              ? 'VIP obunalar va eksklyuziv kosmetika. Barcha buyumlar o‘yin balansiga ta’sir qilmaydi.'
              : 'VIP-подписки и эксклюзивная косметика. Никаких игровых преимуществ.'}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7]"
              >
                <Package className="w-4 h-4 text-[#E7B65B]" />
                {lang === 'uz' ? 'Inventar' : 'Инвентарь'} ({user.ownedCosmetics.length})
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

      {/* Category Filter */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
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
              onClick={() => setCategory(cat.slug)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
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
            const owned = Boolean(user?.ownedCosmetics.includes(item.id));
            const equipped = user?.equippedCosmetics[item.category] === item.id;
            const catDef = categories.find((c) => c.slug === item.category);
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                className="glass-panel rounded-2xl p-5 flex flex-col justify-between border border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-[#F5F5F7]/60">
                      {catDef ? catDef.name[lang] : item.category}
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
                      <Sparkles className="w-7 h-7" style={{ color: item.previewColor }} />
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#F5F5F7]">{item.name[lang]}</h3>
                  <p className="mt-1 text-xs text-[#F5F5F7]/70">{item.description[lang]}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-[#E7B65B]">{item.priceUzs.toLocaleString()} UZS</span>
                    {(item.priceGold || item.priceDiamonds) && (
                      <span className="flex items-center gap-1 text-[#F5F5F7]/75">
                        {item.priceGold ? (
                          <>
                            <Coins className="w-3.5 h-3.5 text-[#E7B65B]" /> {item.priceGold}
                          </>
                        ) : (
                          <>
                            <Gem className="w-3.5 h-3.5 text-[#38BDF8]" /> {item.priceDiamonds}
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {owned ? (
                    <button
                      onClick={() => handleEquip(item.id)}
                      disabled={busyId === item.id}
                      className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
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
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          openCheckout({
                            orderType: 'SHOP_PRODUCT',
                            referenceId: item.id,
                            title: item.name[lang],
                            basePriceUzs: item.priceUzs,
                          })
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#E63946] text-xs font-bold text-white hover:bg-[#E63946]/90"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        {lang === 'uz' ? 'UZS Xarid' : 'Купить UZS'}
                      </button>
                      {(item.priceGold || item.priceDiamonds) && (
                        <button
                          onClick={() => handleBuyCurrency(item.id)}
                          disabled={busyId === item.id}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F5F7] disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {item.vipOnly && <Lock className="w-3 h-3 text-[#E7B65B]" />}
                          {item.priceGold ? `${item.priceGold} G` : `${item.priceDiamonds} D`}
                        </button>
                      )}
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
