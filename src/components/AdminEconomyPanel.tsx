import React, { useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  CheckCircle,
  Crown,
  Package,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { createFunctionalProductCategories } from '../shared/functionalShop';
import { ROLES } from '../shared/roles';
import {
  AdminOverview,
  FunctionalEffectType,
  FunctionalItemCategory,
  FunctionalItemType,
  Language,
  RoleId,
  ShopProduct,
  VipPlan,
} from '../shared/types';

interface AdminEconomyPanelProps {
  data: AdminOverview;
  token: string;
  lang: Language;
  onReload: () => Promise<void> | void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  initialTab?: 'products' | 'vip' | 'orders' | 'campaigns' | 'analytics';
}

const DEFAULT_EFFECT_BY_CATEGORY: Record<FunctionalItemCategory, FunctionalEffectType> = {
  STATISTICS_RESET: 'STATS_RESET',
  DOCUMENTS: 'DOC_INVESTIGATE',
  PROTECTIVE_MASK: 'MASK_STATUS_BLOCK',
  RIFLE: 'RIFLE_NIGHT_STRIKE',
  WHITE_KILLER_PROTECTION: 'WHITE_KILLER_SHIELD',
  VOTING_PROTECTION: 'VOTE_PARDON_SHIELD',
  ROLE_PURCHASE: 'ROLE_TOKEN',
};

const ALL_EFFECT_TYPES: FunctionalEffectType[] = [
  'STATS_RESET',
  'DOC_INVESTIGATE',
  'DOC_IDENTITY',
  'DOC_PROTECTION',
  'DOC_EVIDENCE',
  'MASK_STATUS_BLOCK',
  'RIFLE_NIGHT_STRIKE',
  'WHITE_KILLER_SHIELD',
  'VOTE_PARDON_SHIELD',
  'ROLE_TOKEN',
  'ROLE_UNLOCK',
];

export const AdminEconomyPanel: React.FC<AdminEconomyPanelProps> = ({
  data,
  token,
  lang,
  onReload,
  showToast,
  initialTab = 'products',
}) => {
  const [subTab, setSubTab] = useState<'products' | 'vip' | 'orders' | 'campaigns' | 'analytics'>(
    initialTab
  );

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const functionalCategories =
    data.categories && data.categories.length > 0
      ? data.categories
      : createFunctionalProductCategories();

  // Product Form
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodNameUz, setProdNameUz] = useState('');
  const [prodNameRu, setProdNameRu] = useState('');
  const [prodDescUz, setProdDescUz] = useState('');
  const [prodDescRu, setProdDescRu] = useState('');
  const [prodCategory, setProdCategory] = useState<FunctionalItemCategory>('DOCUMENTS');
  const [prodEffectType, setProdEffectType] = useState<FunctionalEffectType>('DOC_INVESTIGATE');
  const [prodItemType, setProdItemType] = useState<FunctionalItemType>('CONSUMABLE');
  const [prodCurrencyMode, setProdCurrencyMode] = useState<'GOLD' | 'DIAMONDS'>('GOLD');
  const [prodPriceGold, setProdPriceGold] = useState(300);
  const [prodPriceDiamonds, setProdPriceDiamonds] = useState(0);
  const [prodRarity, setProdRarity] = useState<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'>('RARE');
  const [prodColor, setProdColor] = useState('#E7B65B');
  const [prodImageUrl, setProdImageUrl] = useState('documents');
  const [prodMaxUses, setProdMaxUses] = useState(1);
  const [prodPurchaseLimit, setProdPurchaseLimit] = useState(5);
  const [prodDurationHours, setProdDurationHours] = useState(720);
  const [prodTargetRoleId, setProdTargetRoleId] = useState<RoleId>('sheriff');
  const [prodVipOnly, setProdVipOnly] = useState(false);

  // VIP Plan Form
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planNameUz, setPlanNameUz] = useState('');
  const [planNameRu, setPlanNameRu] = useState('');
  const [planPriceUzs, setPlanPriceUzs] = useState(15000);
  const [planDays, setPlanDays] = useState(30);

  // Promo Campaign Form
  const [promoCode, setPromoCode] = useState('');
  const [promoTitleUz, setPromoTitleUz] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(15);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast(
        lang === 'uz' ? 'Rasm 1MB dan kichik bo‘lishi kerak' : 'Размер изображения до 1 МБ',
        'error'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProdImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startEditProduct = (p: ShopProduct) => {
    setEditingProductId(p.id);
    setProdNameUz(p.name.uz);
    setProdNameRu(p.name.ru);
    setProdDescUz(p.description.uz);
    setProdDescRu(p.description.ru);
    const cat = p.category as FunctionalItemCategory;
    setProdCategory(cat);
    setProdEffectType(p.effectType || DEFAULT_EFFECT_BY_CATEGORY[cat] || 'DOC_INVESTIGATE');
    setProdItemType(p.itemType || 'CONSUMABLE');
    setProdCurrencyMode(p.currencyMode === 'DIAMONDS' ? 'DIAMONDS' : 'GOLD');
    setProdPriceGold(p.priceGold || 0);
    setProdPriceDiamonds(p.priceDiamonds || 0);
    setProdRarity(p.rarity);
    setProdColor(p.previewColor);
    setProdImageUrl(p.imageUrl);
    setProdMaxUses(p.maxUsesPerItem ?? 1);
    setProdPurchaseLimit(p.purchaseLimitPerUser ?? -1);
    setProdDurationHours(p.durationHours ?? 0);
    if (p.effectConfig?.targetRoleId) setProdTargetRoleId(p.effectConfig.targetRoleId);
    setProdVipOnly(p.vipOnly);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdNameUz('');
    setProdNameRu('');
    setProdDescUz('');
    setProdDescRu('');
    setProdCategory('DOCUMENTS');
    setProdEffectType('DOC_INVESTIGATE');
    setProdItemType('CONSUMABLE');
    setProdCurrencyMode('GOLD');
    setProdPriceGold(300);
    setProdPriceDiamonds(0);
    setProdImageUrl('documents');
    setProdMaxUses(1);
    setProdPurchaseLimit(5);
    setProdDurationHours(720);
    setProdVipOnly(false);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: editingProductId || undefined,
        category: prodCategory,
        name: { uz: prodNameUz || 'Yangi buyum', ru: prodNameRu || prodNameUz || 'Новый предмет' },
        description: {
          uz: prodDescUz || 'Funksional o‘yin buyumi',
          ru: prodDescRu || prodDescUz || 'Функциональный игровой предмет',
        },
        currencyMode: prodCurrencyMode,
        priceUzs: 0,
        priceGold: prodPriceGold > 0 ? Number(prodPriceGold) : undefined,
        priceDiamonds: prodPriceDiamonds > 0 ? Number(prodPriceDiamonds) : undefined,
        rarity: prodRarity,
        previewColor: prodColor,
        imageUrl: prodImageUrl,
        itemType: prodItemType,
        effectType: prodEffectType,
        maxUsesPerItem: Number(prodMaxUses),
        purchaseLimitPerUser: Number(prodPurchaseLimit),
        durationHours: Number(prodDurationHours),
        effectConfig: {
          allowedModes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
          allowedPhases:
            prodEffectType === 'VOTE_PARDON_SHIELD'
              ? ['VOTING']
              : prodEffectType === 'ROLE_TOKEN' || prodEffectType === 'ROLE_UNLOCK'
                ? ['LOBBY']
                : ['NIGHT'],
          maxPerMatch: 1,
          consumable: prodEffectType !== 'ROLE_UNLOCK',
          targetRoleId: prodCategory === 'ROLE_PURCHASE' ? prodTargetRoleId : undefined,
        },
        isUnique: prodEffectType === 'ROLE_UNLOCK',
        vipOnly: prodVipOnly,
        isActive: true,
        isArchived: false,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Funksional mahsulot saqlandi' : 'Товар сохранён', 'success');
      resetProductForm();
      await onReload();
    } else {
      const err = await res.json();
      showToast(err.error || 'Error', 'error');
    }
  };

  const toggleArchiveProduct = async (p: ShopProduct) => {
    const res = await fetch(`/api/admin/products/${p.id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ archived: !p.isArchived }),
    });
    if (res.ok) {
      showToast(
        p.isArchived
          ? lang === 'uz'
            ? 'Mahsulot tiklandi'
            : 'Товар восстановлен'
          : lang === 'uz'
            ? 'Mahsulot arxivlandi'
            : 'Товар архивирован',
        'info'
      );
      await onReload();
    }
  };

  const deleteProduct = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Mahsulot o‘chirildi/arxivlandi' : 'Товар удалён/архивирован', 'info');
      await onReload();
    }
  };

  const startEditPlan = (plan: VipPlan) => {
    setEditingPlanId(plan.id);
    setPlanNameUz(plan.name.uz);
    setPlanNameRu(plan.name.ru);
    setPlanPriceUzs(plan.priceUzs);
    setPlanDays(plan.durationDays);
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/vip-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: editingPlanId || undefined,
        name: { uz: planNameUz || 'VIP Reja', ru: planNameRu || planNameUz || 'VIP План' },
        priceUzs: Number(planPriceUzs),
        durationDays: Number(planDays),
        isActive: true,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'VIP reja saqlandi' : 'VIP план сохранён', 'success');
      setEditingPlanId(null);
      setPlanNameUz('');
      setPlanNameRu('');
      await onReload();
    }
  };

  const resolveRefund = async (orderId: string, approve: boolean) => {
    const res = await fetch(`/api/admin/refunds/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approve }),
    });
    if (res.ok) {
      showToast(
        approve
          ? lang === 'uz'
            ? 'Qaytarish tasdiqlandi'
            : 'Возврат одобрен'
          : lang === 'uz'
            ? 'Qaytarish rad etildi'
            : 'Возврат отклонён',
        'success'
      );
      await onReload();
    }
  };

  const saveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code: promoCode.trim().toUpperCase(),
        title: { uz: promoTitleUz || 'Aksiya', ru: promoTitleUz || 'Акция' },
        discountPercent: Number(promoDiscount),
        appliesTo: 'ALL',
        isActive: true,
      }),
    });
    if (res.ok) {
      showToast(lang === 'uz' ? 'Promokod yaratildi' : 'Промокод создан', 'success');
      setPromoCode('');
      setPromoTitleUz('');
      await onReload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Revenue & VIP KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-[#E7B65B]/25">
          <p className="text-xs text-[#F5F5F7]/60">
            {lang === 'uz' ? 'Umumiy tushum (UZS)' : 'Общая выручка (UZS)'}
          </p>
          <p className="font-mono text-2xl font-bold text-[#E7B65B] tabular-nums mt-1">
            {(data.totalRevenueUzs || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs text-[#F5F5F7]/60">{lang === 'uz' ? 'Faol VIP obunalar' : 'Активные VIP'}</p>
          <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
            {data.activeVipCount || 0}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs text-[#F5F5F7]/60">
            {lang === 'uz' ? 'To‘langan buyurtmalar' : 'Оплаченные заказы'}
          </p>
          <p className="font-mono text-2xl font-bold text-[#38BDF8] tabular-nums mt-1">
            {data.paidOrdersCount || 0}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs text-[#F5F5F7]/60">
            {lang === 'uz' ? 'Kutilayotgan qaytarishlar' : 'Запросы возврата'}
          </p>
          <p className="font-mono text-2xl font-bold text-[#E63946] tabular-nums mt-1">
            {data.pendingRefundsCount || 0}
          </p>
        </div>
      </div>

      {/* Economy Sub-Tabs */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[#F5F5F7] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#E7B65B]" />
            {lang === 'uz'
              ? 'Funksional Do‘kon va Iqtisodiyot Boshqaruvi'
              : 'Управление функциональным магазином'}
          </h2>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#090B12] border border-white/10">
            {[
              { id: 'products', label: lang === 'uz' ? 'Mahsulotlar' : 'Товары', icon: Package },
              { id: 'analytics', label: lang === 'uz' ? 'Do‘kon Tahlili' : 'Аналитика', icon: BarChart3 },
              { id: 'vip', label: lang === 'uz' ? 'VIP Rejalar' : 'VIP Тарифы', icon: Crown },
              { id: 'orders', label: lang === 'uz' ? 'Buyurtma & Qaytarish' : 'Заказы и Возвраты', icon: RefreshCw },
              { id: 'campaigns', label: lang === 'uz' ? 'Promokodlar' : 'Промокоды', icon: Tag },
            ].map((tb) => {
              const Icon = tb.icon;
              return (
                <button
                  key={tb.id}
                  onClick={() => setSubTab(tb.id as typeof subTab)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subTab === tb.id ? 'bg-[#E63946] text-white' : 'text-[#F5F5F7]/65 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tb.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* PRODUCTS TAB */}
        {subTab === 'products' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form
              onSubmit={saveProduct}
              className="lg:col-span-5 space-y-3 bg-[#090B12]/70 p-4 rounded-xl border border-white/10"
            >
              <h3 className="text-sm font-bold text-[#F5F5F7]">
                {editingProductId
                  ? lang === 'uz'
                    ? 'Funksional mahsulotni tahrirlash'
                    : 'Редактировать товар'
                  : lang === 'uz'
                    ? 'Yangi funksional mahsulot'
                    : 'Добавить функциональный товар'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={prodNameUz}
                  onChange={(e) => setProdNameUz(e.target.value)}
                  placeholder="Nomi (UZ)"
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
                <input
                  value={prodNameRu}
                  onChange={(e) => setProdNameRu(e.target.value)}
                  placeholder="Название (RU)"
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
              </div>
              <input
                value={prodDescUz}
                onChange={(e) => setProdDescUz(e.target.value)}
                placeholder={lang === 'uz' ? 'Tavsif (UZ)' : 'Описание (UZ)'}
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />
              <input
                value={prodDescRu}
                onChange={(e) => setProdDescRu(e.target.value)}
                placeholder={lang === 'uz' ? 'Tavsif (RU)' : 'Описание (RU)'}
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={prodCategory}
                  onChange={(e) => {
                    const cat = e.target.value as FunctionalItemCategory;
                    setProdCategory(cat);
                    setProdEffectType(DEFAULT_EFFECT_BY_CATEGORY[cat]);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                >
                  {functionalCategories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name[lang]}
                    </option>
                  ))}
                </select>
                <select
                  value={prodEffectType}
                  onChange={(e) => setProdEffectType(e.target.value as FunctionalEffectType)}
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                >
                  {ALL_EFFECT_TYPES.map((eff) => (
                    <option key={eff} value={eff}>
                      {eff}
                    </option>
                  ))}
                </select>
              </div>

              {prodCategory === 'ROLE_PURCHASE' && (
                <select
                  value={prodTargetRoleId}
                  onChange={(e) => setProdTargetRoleId(e.target.value as RoleId)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-[#E7B65B]/40 text-xs text-[#E7B65B]"
                >
                  {(Object.keys(ROLES) as RoleId[]).map((rid) => (
                    <option key={rid} value={rid}>
                      {ROLES[rid].name[lang]} ({rid})
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={prodItemType}
                  onChange={(e) => setProdItemType(e.target.value as FunctionalItemType)}
                  className="px-2 py-2 rounded-lg bg-[#111522] border border-white/10 text-[11px] text-[#F5F5F7]"
                >
                  <option value="CONSUMABLE">CONSUMABLE</option>
                  <option value="DURATION">DURATION</option>
                  <option value="PERMANENT_UNLOCK">PERMANENT_UNLOCK</option>
                  <option value="ACCOUNT_UTILITY">ACCOUNT_UTILITY</option>
                </select>
                <select
                  value={prodCurrencyMode}
                  onChange={(e) => setProdCurrencyMode(e.target.value as typeof prodCurrencyMode)}
                  className="px-2 py-2 rounded-lg bg-[#111522] border border-white/10 text-[11px] text-[#F5F5F7]"
                >
                  <option value="GOLD">GOLD</option>
                  <option value="DIAMONDS">DIAMONDS</option>
                </select>
                <select
                  value={prodRarity}
                  onChange={(e) => setProdRarity(e.target.value as typeof prodRarity)}
                  className="px-2 py-2 rounded-lg bg-[#111522] border border-white/10 text-[11px] text-[#F5F5F7]"
                >
                  <option value="COMMON">COMMON</option>
                  <option value="RARE">RARE</option>
                  <option value="EPIC">EPIC</option>
                  <option value="LEGENDARY">LEGENDARY</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={prodPriceGold}
                  onChange={(e) => setProdPriceGold(Number(e.target.value))}
                  placeholder="Gold"
                  title="Gold"
                  className="px-2.5 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#E7B65B]"
                />
                <input
                  type="number"
                  min={0}
                  value={prodPriceDiamonds}
                  onChange={(e) => setProdPriceDiamonds(Number(e.target.value))}
                  placeholder="Diamonds"
                  title="Diamonds"
                  className="px-2.5 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={-1}
                  value={prodMaxUses}
                  onChange={(e) => setProdMaxUses(Number(e.target.value))}
                  placeholder="Charges (-1=∞)"
                  title="Max uses (-1 = unlimited)"
                  className="px-2.5 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
                <input
                  type="number"
                  min={-1}
                  value={prodPurchaseLimit}
                  onChange={(e) => setProdPurchaseLimit(Number(e.target.value))}
                  placeholder="Limit (-1=∞)"
                  title="Per-user active limit (-1 = unlimited)"
                  className="px-2.5 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
                <input
                  type="number"
                  min={0}
                  value={prodDurationHours}
                  onChange={(e) => setProdDurationHours(Number(e.target.value))}
                  placeholder="Hours (0=∞)"
                  title="Expiration hours (0 = permanent)"
                  className="px-2.5 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={prodColor}
                  onChange={(e) => setProdColor(e.target.value)}
                  className="w-10 h-9 rounded-lg bg-[#111522] border border-white/10 p-1 shrink-0"
                />
                <input
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="Image key or URL"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
                <label className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#F5F5F7]/80">
                <input
                  type="checkbox"
                  checked={prodVipOnly}
                  onChange={(e) => setProdVipOnly(e.target.checked)}
                />
                {lang === 'uz' ? 'Faqat VIP uchun' : 'Только для VIP'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-3 py-2.5 rounded-xl bg-white/10 text-xs font-semibold"
                  >
                    {lang === 'uz' ? 'Bekor' : 'Отмена'}
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-7 divide-y divide-white/10 max-h-[440px] overflow-y-auto pr-1">
              {(data.products || []).map((p) => (
                <div
                  key={p.id}
                  className={`py-2.5 flex items-center justify-between gap-3 text-xs ${
                    p.isArchived ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F5F5F7] truncate">
                      {p.name[lang]}
                      {p.priceGold ? <span className="text-[#E7B65B] font-mono"> · {p.priceGold} Gold</span> : null}
                      {p.priceDiamonds ? (
                        <span className="text-[#38BDF8] font-mono"> · {p.priceDiamonds} Diamonds</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-[#F5F5F7]/50">
                      {p.category} · {p.effectType || 'CUSTOM'} · {p.rarity}{' '}
                      {p.vipOnly ? '· VIP' : ''} {p.isArchived ? '· ARCHIVED' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!p.isArchived && (
                      <button
                        onClick={() => startEditProduct(p)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 font-semibold"
                      >
                        {lang === 'uz' ? 'Tahrir' : 'Изм.'}
                      </button>
                    )}
                    <button
                      onClick={() => toggleArchiveProduct(p)}
                      title={p.isArchived ? 'Restore' : 'Archive'}
                      className="p-1.5 rounded-lg bg-[#E7B65B]/15 text-[#E7B65B] hover:bg-[#E7B65B]/25"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-[#E63946]/15 text-[#E63946] hover:bg-[#E63946]/25"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FUNCTIONAL SHOP ANALYTICS TAB */}
        {subTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                {
                  label: lang === 'uz' ? 'To‘langan UZS buyurtma' : 'Заказы UZS',
                  val: data.shopAnalytics?.totalFunctionalOrders || 0,
                  color: 'text-[#E7B65B]',
                },
                {
                  label: lang === 'uz' ? 'Jami xaridlar' : 'Всего покупок',
                  val: data.shopAnalytics?.totalFunctionalPurchases || 0,
                  color: 'text-emerald-400',
                },
                {
                  label: lang === 'uz' ? 'O‘yinda ishlatilgan' : 'Применено в играх',
                  val: data.shopAnalytics?.totalItemUsages || 0,
                  color: 'text-[#38BDF8]',
                },
                {
                  label: lang === 'uz' ? 'Statistika tozalashlar' : 'Сбросы статистики',
                  val: data.shopAnalytics?.totalStatsResets || 0,
                  color: 'text-[#E63946]',
                },
                {
                  label: lang === 'uz' ? 'Faol inventarlar' : 'Активных в инвентарях',
                  val: data.shopAnalytics?.activeInventoryItems || 0,
                  color: 'text-[#F5F5F7]',
                },
              ].map((stat) => (
                <div key={stat.label} className="p-3.5 rounded-xl bg-[#090B12] border border-white/10">
                  <p className="text-[11px] text-[#F5F5F7]/55">{stat.label}</p>
                  <p className={`font-mono text-xl font-bold tabular-nums mt-1 ${stat.color}`}>
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-[#F5F5F7] mb-2">
                  {lang === 'uz' ? 'Mahsulotlar samaradorligi' : 'Эффективность товаров'}
                </h3>
                <div className="divide-y divide-white/10 max-h-[280px] overflow-y-auto">
                  {(data.shopAnalytics?.productStats || []).map((ps) => (
                    <div key={ps.productId} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#F5F5F7] truncate">{ps.name[lang]}</p>
                        <p className="text-[10px] text-[#F5F5F7]/45 font-mono">{ps.category}</p>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                        <span className="text-[#E7B65B]">
                          {lang === 'uz' ? 'Sotildi:' : 'Прод:'} {ps.totalSold}
                        </span>
                        <span className="text-emerald-400">
                          {lang === 'uz' ? 'Faol:' : 'Акт:'} {ps.activeOwned}
                        </span>
                        <span className="text-[#38BDF8]">
                          {lang === 'uz' ? 'Ishl:' : 'Исп:'} {ps.totalConsumed}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#F5F5F7] mb-2">
                  {lang === 'uz' ? 'So‘nggi o‘yinda ishlatishlar' : 'Последние использования в матчах'}
                </h3>
                <div className="divide-y divide-white/10 max-h-[280px] overflow-y-auto">
                  {(data.shopAnalytics?.recentUsageHistory || []).length === 0 ? (
                    <p className="text-xs text-[#F5F5F7]/50 py-4">
                      {lang === 'uz' ? 'Hali ishlatilmagan' : 'Использований пока нет'}
                    </p>
                  ) : (
                    (data.shopAnalytics?.recentUsageHistory || []).map((u) => (
                      <div key={u.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#F5F5F7] truncate">
                            {u.username} · <span className="text-[#E7B65B] font-mono">{u.effectType}</span>
                          </p>
                          <p className="text-[10px] text-[#F5F5F7]/50 truncate">{u.outcome}</p>
                        </div>
                        <span className="text-[10px] font-mono text-[#F5F5F7]/45 shrink-0">
                          {u.roomCode || 'GLOBAL'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIP PLANS TAB */}
        {subTab === 'vip' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form
              onSubmit={savePlan}
              className="lg:col-span-5 space-y-3 bg-[#090B12]/70 p-4 rounded-xl border border-white/10"
            >
              <h3 className="text-sm font-bold text-[#F5F5F7]">
                {editingPlanId
                  ? lang === 'uz'
                    ? 'VIP Rejani tahrirlash'
                    : 'Редактировать VIP тариф'
                  : lang === 'uz'
                    ? 'Yangi VIP Reja'
                    : 'Новый VIP тариф'}
              </h3>
              <input
                required
                value={planNameUz}
                onChange={(e) => setPlanNameUz(e.target.value)}
                placeholder="Reja nomi (UZ)"
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />
              <input
                value={planNameRu}
                onChange={(e) => setPlanNameRu(e.target.value)}
                placeholder="Название тарифа (RU)"
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1000}
                  value={planPriceUzs}
                  onChange={(e) => setPlanPriceUzs(Number(e.target.value))}
                  placeholder="Narx (UZS)"
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
                <input
                  type="number"
                  min={1}
                  value={planDays}
                  onChange={(e) => setPlanDays(Number(e.target.value))}
                  placeholder="Kun"
                  className="px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#E7B65B] text-xs font-bold text-[#090B12]"
              >
                {lang === 'uz' ? 'VIP Rejani saqlash' : 'Сохранить VIP тариф'}
              </button>
            </form>

            <div className="lg:col-span-7 divide-y divide-white/10">
              {(data.vipPlans || []).map((plan) => (
                <div key={plan.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#F5F5F7]">{plan.name[lang]}</p>
                    <p className="text-[#E7B65B] font-mono">
                      {plan.priceUzs.toLocaleString()} UZS · {plan.durationDays} {lang === 'uz' ? 'kun' : 'дн.'}
                    </p>
                  </div>
                  <button
                    onClick={() => startEditPlan(plan)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 font-semibold"
                  >
                    {lang === 'uz' ? 'Tahrirlash' : 'Изменить'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS & REFUNDS TAB */}
        {subTab === 'orders' && (
          <div className="divide-y divide-white/10 max-h-[340px] overflow-y-auto">
            {(data.orders || []).length === 0 ? (
              <p className="text-xs text-[#F5F5F7]/50 py-6 text-center">
                {lang === 'uz' ? 'Buyurtmalar hali yo‘q' : 'Заказов пока нет'}
              </p>
            ) : (
              (data.orders || []).map((ord) => (
                <div key={ord.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#F5F5F7]">
                      {ord.username} — {ord.itemName}
                    </p>
                    <p className="text-[11px] font-mono text-[#F5F5F7]/50">
                      {ord.id} · {ord.provider} · {new Date(ord.createdAt).toLocaleString()}
                    </p>
                    {ord.refundReason && (
                      <p className="text-[11px] text-[#E7B65B] mt-0.5">{ord.refundReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#E7B65B]">
                      {ord.amountUzs.toLocaleString()} UZS
                    </span>
                    <span className="font-mono text-[11px] text-[#F5F5F7]/75">{ord.status}</span>
                    {ord.status === 'REFUND_REQUESTED' && (
                      <>
                        <button
                          onClick={() => resolveRefund(ord.id, true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold"
                        >
                          <CheckCircle className="w-3 h-3" /> {lang === 'uz' ? 'Tasdiq' : 'Одобрить'}
                        </button>
                        <button
                          onClick={() => resolveRefund(ord.id, false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E63946]/20 text-[#E63946] font-semibold"
                        >
                          <XCircle className="w-3 h-3" /> {lang === 'uz' ? 'Rad' : 'Отклонить'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {subTab === 'campaigns' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <form
              onSubmit={saveCampaign}
              className="lg:col-span-5 space-y-3 bg-[#090B12]/70 p-4 rounded-xl border border-white/10"
            >
              <h3 className="text-sm font-bold text-[#F5F5F7]">
                {lang === 'uz' ? 'Yangi promokod' : 'Новый промокод'}
              </h3>
              <input
                required
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="MAFIA25"
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7] uppercase"
              />
              <input
                value={promoTitleUz}
                onChange={(e) => setPromoTitleUz(e.target.value)}
                placeholder={lang === 'uz' ? 'Aksiya nomi' : 'Название акции'}
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />
              <input
                type="number"
                min={1}
                max={80}
                value={promoDiscount}
                onChange={(e) => setPromoDiscount(Number(e.target.value))}
                placeholder="Chegirma %"
                className="w-full px-3 py-2 rounded-lg bg-[#111522] border border-white/10 text-xs text-[#F5F5F7]"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#E63946] text-xs font-bold text-white"
              >
                {lang === 'uz' ? 'Promokod yaratish' : 'Создать промокод'}
              </button>
            </form>
            <div className="lg:col-span-7 divide-y divide-white/10">
              {(data.campaigns || []).map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-mono font-bold text-[#E7B65B]">{c.code}</p>
                    <p className="text-[#F5F5F7]/70">{c.title[lang]}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">-{c.discountPercent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
