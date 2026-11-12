import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ACHIEVEMENTS, TITLES } from '../shared/achievements';
import {
  calculateGoldReward,
  calculateRatingDelta,
  calculateXpReward,
  COSMETICS,
  DAILY_REWARD_CALENDAR,
  generateTournamentBracket,
  getUtcDayKey,
  getUtcWeekKey,
  MISSIONS,
} from '../shared/ecosystem';
import {
  AchievementDef,
  AdminModuleId,
  AdminNotificationRecord,
  AdminRoleDef,
  AdminRoleSlug,
  AuditLogEntry,
  CosmeticCategory,
  CurrencyTransaction,
  GameHistoryRecord,
  GameMode,
  InventoryItemRecord,
  ModerationReport,
  ModulePermissionSet,
  OrderRecord,
  PaymentEventRecord,
  PaymentProvider,
  PaymentRecord,
  PhaseTimers,
  ProductCategory,
  PromoCampaign,
  PromoRedemptionRecord,
  RoleConfigOverride,
  RoleId,
  ShopProduct,
  SubscriptionRecord,
  SystemEventRecord,
  Tournament,
  TournamentFormat,
  UserProfile,
  VipPlan,
  WebsiteSettings,
} from '../shared/types';

export { ACHIEVEMENTS, TITLES };

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  history: GameHistoryRecord[];
  reports: ModerationReport[];
  transactions: CurrencyTransaction[];
  tournaments: Tournament[];
  auditLogs: AuditLogEntry[];
  vipPlans: VipPlan[];
  subscriptions: SubscriptionRecord[];
  productCategories: ProductCategory[];
  shopProducts: ShopProduct[];
  inventory: InventoryItemRecord[];
  orders: OrderRecord[];
  payments: PaymentRecord[];
  paymentEvents: PaymentEventRecord[];
  campaigns: PromoCampaign[];
  promoRedemptions: PromoRedemptionRecord[];
  notifications: AdminNotificationRecord[];
  roleConfigs: RoleConfigOverride[];
  websiteSettings: WebsiteSettings;
  adminRoles: AdminRoleDef[];
  systemEvents: SystemEventRecord[];
  serverConfig: {
    maintenanceMode: boolean;
    defaultTimers: PhaseTimers;
    enabledModes: GameMode[];
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'mafia-pro-dev-secret-key-change-in-prod';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.userId || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

function hydrateUser(u: Partial<StoredUser>): StoredUser {
  const now = Date.now();
  return {
    id: u.id || `usr_${crypto.randomBytes(6).toString('hex')}`,
    username: u.username || 'Player',
    email: u.email || 'player@mafiapro.uz',
    passwordHash: u.passwordHash || '',
    avatar: u.avatar || 'crimson',
    country: u.country || 'UZ',
    role: u.role || 'USER',
    adminRole: u.adminRole || (u.role === 'ADMIN' ? 'SUPER_ADMIN' : undefined),
    isBanned: Boolean(u.isBanned),
    banReason: u.banReason,
    suspendedUntil: u.suspendedUntil,
    isFlagged: Boolean(u.isFlagged),
    flagReason: u.flagReason,
    warningsCount: u.warningsCount ?? 0,
    lastWarningReason: u.lastWarningReason,
    notifications: u.notifications || [],
    level: u.level ?? 1,
    xp: u.xp ?? 0,
    weeklyXp: u.weeklyXp ?? 0,
    monthlyXp: u.monthlyXp ?? 0,
    rating: u.rating ?? 1000,
    tournamentPoints: u.tournamentPoints ?? 0,
    gold: u.gold ?? 150,
    diamonds: u.diamonds ?? 5,
    totalGames: u.totalGames ?? 0,
    wins: u.wins ?? 0,
    losses: u.losses ?? 0,
    weeklyWins: u.weeklyWins ?? 0,
    monthlyWins: u.monthlyWins ?? 0,
    winStreak: u.winStreak ?? 0,
    bestWinStreak: u.bestWinStreak ?? 0,
    favoriteRole: u.favoriteRole,
    favoriteMode: u.favoriteMode,
    rolePlayCounts: u.rolePlayCounts || {},
    modePlayCounts: u.modePlayCounts || {},
    achievements: u.achievements || [],
    activeTitle: u.activeTitle,
    unlockedTitles: u.unlockedTitles || [],
    ownedCosmetics: u.ownedCosmetics || [],
    equippedCosmetics: u.equippedCosmetics || {},
    subscription: u.subscription || { tier: 'FREE', status: 'NONE', verified: false },
    dailyReward: u.dailyReward || { streak: 0, lastClaimAt: 0, totalClaims: 0 },
    missionProgress: u.missionProgress || {},
    friends: u.friends || [],
    friendRequestsIn: u.friendRequestsIn || [],
    friendRequestsOut: u.friendRequestsOut || [],
    blockedUsers: u.blockedUsers || [],
    recentPlayers: u.recentPlayers || [],
    createdAt: u.createdAt ?? now,
    lastSeenAt: u.lastSeenAt ?? now,
  };
}

function createDefaultVipPlans(now = Date.now()): VipPlan[] {
  return [
    {
      id: 'vip_monthly',
      code: 'VIP_MONTHLY',
      name: { uz: 'VIP Oylik', ru: 'VIP Месячный' },
      description: {
        uz: '30 kunlik to‘liq VIP imtiyozlar: nishon, ramkalar, avatarlar va kengaytirilgan statistika.',
        ru: '30 дней полных VIP-привилегий: значок, рамки, аватары и расширенная статистика.',
      },
      priceUzs: 15000,
      durationDays: 30,
      isActive: true,
      features: {
        uz: ['VIP nishoni', 'Eksklyuziv ramkalar va avatarlar', 'VIP xona mavzulari', 'Reklamasiz tajriba'],
        ru: ['VIP значок', 'Эксклюзивные рамки и аватары', 'VIP темы комнат', 'Без рекламы'],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'vip_quarterly',
      code: 'VIP_QUARTERLY',
      name: { uz: 'VIP Choraklik', ru: 'VIP Квартальный' },
      description: {
        uz: '90 kunlik VIP obuna (13% tejash). Barcha eksklyuziv kosmetika va statistika.',
        ru: '90 дней VIP-подписки (выгода 13%). Вся эксклюзивная косметика и статистика.',
      },
      priceUzs: 39000,
      durationDays: 90,
      isActive: true,
      features: {
        uz: ['VIP nishoni', 'Eksklyuziv ramkalar va avatarlar', 'VIP xona mavzulari', '13% chegirma'],
        ru: ['VIP значок', 'Эксклюзивные рамки и аватары', 'VIP темы комнат', 'Скидка 13%'],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'vip_yearly',
      code: 'VIP_YEARLY',
      name: { uz: 'VIP Yillik', ru: 'VIP Годовой' },
      description: {
        uz: '365 kunlik ELITE VIP maqomi (28% tejash). Yil bo‘yi maksimal darajadagi profil bezagi.',
        ru: '365 дней статуса ELITE VIP (выгода 28%). Максимальное оформление профиля на целый год.',
      },
      priceUzs: 129000,
      durationDays: 365,
      isActive: true,
      features: {
        uz: ['ELITE VIP nishoni', 'Barcha VIP to‘plamlar', 'Kengaytirilgan 30-kunlik tahlil', '28% chegirma'],
        ru: ['Значок ELITE VIP', 'Все VIP наборы', 'Расширенная аналитика', 'Скидка 28%'],
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createDefaultCategories(): ProductCategory[] {
  return [
    { id: 'cat_avatar', slug: 'AVATAR', name: { uz: 'Avatarlar', ru: 'Аватары' }, sortOrder: 1, isActive: true },
    { id: 'cat_frame', slug: 'FRAME', name: { uz: 'Profil ramkalari', ru: 'Рамки профиля' }, sortOrder: 2, isActive: true },
    { id: 'cat_name_effect', slug: 'NAME_EFFECT', name: { uz: 'Ism effektlari', ru: 'Эффекты имени' }, sortOrder: 3, isActive: true },
    { id: 'cat_chat_dec', slug: 'CHAT_DECORATION', name: { uz: 'Chat bezaklari', ru: 'Украшения чата' }, sortOrder: 4, isActive: true },
    { id: 'cat_profile_bg', slug: 'PROFILE_BG', name: { uz: 'Profil fonlari', ru: 'Фоны профиля' }, sortOrder: 5, isActive: true },
    { id: 'cat_badge', slug: 'BADGE', name: { uz: 'Maxsus nishonlar', ru: 'Особые значки' }, sortOrder: 6, isActive: true },
    { id: 'cat_lobby_theme', slug: 'LOBBY_THEME', name: { uz: 'Xona mavzulari', ru: 'Темы комнат' }, sortOrder: 7, isActive: true },
    { id: 'cat_card_skin', slug: 'CARD_SKIN', name: { uz: 'Karta terilari', ru: 'Скины карт' }, sortOrder: 8, isActive: true },
    { id: 'cat_victory_anim', slug: 'VICTORY_ANIM', name: { uz: 'G‘alaba animatsiyasi', ru: 'Анимации победы' }, sortOrder: 9, isActive: true },
  ];
}

function createDefaultShopProducts(now = Date.now()): ShopProduct[] {
  const mapped: ShopProduct[] = COSMETICS.map((c) => {
    const baseUzs = c.priceGold ? c.priceGold * 25 : (c.priceDiamonds || 10) * 800;
    return {
      id: c.id,
      category: c.category,
      name: c.name,
      description: c.description,
      imageUrl: '',
      priceUzs: Math.max(3000, Math.round(baseUzs / 500) * 500),
      priceGold: c.priceGold,
      priceDiamonds: c.priceDiamonds,
      rarity: c.rarity,
      previewColor: c.previewColor,
      isUnique: true,
      vipOnly: Boolean(c.premiumOnly),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  });

  const extraProducts: ShopProduct[] = [
    {
      id: 'cd_crimson_cipher',
      category: 'CHAT_DECORATION',
      name: { uz: 'Qizil Shifr', ru: 'Алый шифр' },
      description: { uz: 'Chat xabarlaringiz uchun qizil chiziqli bezak', ru: 'Алая декоративная рамка для сообщений в чате' },
      imageUrl: '',
      priceUzs: 7500,
      priceGold: 280,
      rarity: 'RARE',
      previewColor: '#E63946',
      isUnique: true,
      vipOnly: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cd_gold_seal',
      category: 'CHAT_DECORATION',
      name: { uz: 'Oltin Muhr', ru: 'Золотая печать' },
      description: { uz: 'VIP chat xabarlari uchun oltin muhr bezagi', ru: 'Золотая печать для сообщений VIP-игроков' },
      imageUrl: '',
      priceUzs: 14000,
      priceDiamonds: 18,
      rarity: 'LEGENDARY',
      previewColor: '#E7B65B',
      isUnique: true,
      vipOnly: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pb_noir_penthouse',
      category: 'PROFILE_BG',
      name: { uz: 'Noir Penthaus', ru: 'Нуар Пентхаус' },
      description: { uz: 'Tungi shahar manzarali premium profil foni', ru: 'Премиальный фон профиля с видом на ночной город' },
      imageUrl: '',
      priceUzs: 12000,
      priceGold: 450,
      rarity: 'EPIC',
      previewColor: '#38BDF8',
      isUnique: true,
      vipOnly: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pb_imperial_vault',
      category: 'PROFILE_BG',
      name: { uz: 'Imperator Xazinasi', ru: 'Императорский зал' },
      description: { uz: 'Oltin va qora baxmal VIP profil foni', ru: 'Роскошный чёрно-золотой VIP фон профиля' },
      imageUrl: '',
      priceUzs: 19000,
      priceDiamonds: 25,
      rarity: 'LEGENDARY',
      previewColor: '#FCD34D',
      isUnique: true,
      vipOnly: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return [...mapped, ...extraProducts];
}

function createDefaultAdminRoles(): AdminRoleDef[] {
  const allModules: AdminModuleId[] = [
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
  const makePerms = (
    overrides: Partial<Record<AdminModuleId, Partial<ModulePermissionSet>>>,
    fallback: ModulePermissionSet = { read: false, create: false, edit: false, delete: false }
  ): Record<AdminModuleId, ModulePermissionSet> => {
    const out = {} as Record<AdminModuleId, ModulePermissionSet>;
    for (const m of allModules) {
      out[m] = { ...fallback, ...(overrides[m] || {}) };
    }
    return out;
  };
  const full: ModulePermissionSet = { read: true, create: true, edit: true, delete: true };

  return [
    {
      slug: 'SUPER_ADMIN',
      name: { uz: 'Super Administrator', ru: 'Супер Администратор' },
      description: { uz: 'Barcha 15 modulga to‘liq ruxsat', ru: 'Полный доступ ко всем 15 модулям' },
      permissions: makePerms({}, full),
    },
    {
      slug: 'ADMIN',
      name: { uz: 'Administrator', ru: 'Администратор' },
      description: { uz: 'Platforma umumiy boshqaruvi', ru: 'Общее управление платформой' },
      permissions: makePerms({ admins: { read: true, create: false, edit: false, delete: false } }, full),
    },
    {
      slug: 'MODERATOR',
      name: { uz: 'Moderator', ru: 'Модератор' },
      description: { uz: 'Shikoyatlar, foydalanuvchilar va xonalar nazorati', ru: 'Жалобы, пользователи и контроль комнат' },
      permissions: makePerms({
        dashboard: { read: true },
        users: { read: true, edit: true },
        rooms: { read: true, edit: true, delete: true },
        moderation: { read: true, create: true, edit: true },
        notifications: { read: true, create: true },
      }),
    },
    {
      slug: 'SHOP_MANAGER',
      name: { uz: 'Do‘kon Menejeri', ru: 'Менеджер магазина' },
      description: { uz: 'Mahsulotlar, rollar va promokodlar', ru: 'Товары, роли и промокоды' },
      permissions: makePerms({
        dashboard: { read: true },
        shop: full,
        roles: { read: true, create: true, edit: true },
        promos: full,
      }),
    },
    {
      slug: 'FINANCE_MANAGER',
      name: { uz: 'Moliya Menejeri', ru: 'Финансовый менеджер' },
      description: { uz: 'To‘lovlar, VIP va moliyaviy tahlil', ru: 'Платежи, VIP и финансовая аналитика' },
      permissions: makePerms({
        dashboard: { read: true },
        vip: full,
        payments: { read: true, edit: true },
        promos: { read: true, create: true, edit: true },
        analytics: { read: true },
      }),
    },
    {
      slug: 'TOURNAMENT_MANAGER',
      name: { uz: 'Turnir Menejeri', ru: 'Менеджер турниров' },
      description: { uz: 'Turnirlar va e’lonlar boshqaruvi', ru: 'Управление турнирами и объявлениями' },
      permissions: makePerms({
        dashboard: { read: true },
        tournaments: full,
        notifications: { read: true, create: true },
      }),
    },
  ];
}

function createDefaultWebsiteSettings(now = Date.now()): WebsiteSettings {
  return {
    siteTitle: 'MAFIA PRO',
    logoUrl: '',
    faviconUrl: '/icon.svg',
    heroTitle: {
      uz: 'Hech kimga ishonma. Tundan omon chiq.',
      ru: 'Никому не доверяй. Переживи ночь.',
    },
    bannerText: {
      uz: 'MAFIA PRO 2.0 — 30 ta noyob rol, jonli ovozli chat va VIP turnirlar!',
      ru: 'MAFIA PRO 2.0 — 30 уникальных ролей, голосовой чат и VIP-турниры!',
    },
    socialLinks: {
      telegram: 'https://t.me/mafiapro_uz',
      discord: 'https://discord.gg/mafiapro',
      instagram: 'https://instagram.com/mafiapro.uz',
      youtube: 'https://youtube.com/@mafiapro',
    },
    adsEnabled: true,
    privacyPolicy: 'MAFIA PRO respects player privacy and never sells personal data.',
    termsOfService: 'Fair play is mandatory. Cheating, harassment, and abuse result in suspension.',
    updatedAt: now,
  };
}

function createInitialDb(): DatabaseSchema {
  const now = Date.now();
  return {
    users: [
      hydrateUser({
        id: 'usr_admin',
        username: 'DonCorleone',
        email: 'admin@mafiapro.uz',
        passwordHash: hashPassword('Admin123!'),
        avatar: 'crimson',
        country: 'UZ',
        role: 'ADMIN',
        level: 12,
        xp: 2850,
        weeklyXp: 640,
        monthlyXp: 1920,
        rating: 1620,
        tournamentPoints: 180,
        gold: 1450,
        diamonds: 45,
        totalGames: 28,
        wins: 20,
        losses: 8,
        weeklyWins: 5,
        monthlyWins: 14,
        winStreak: 3,
        bestWinStreak: 6,
        favoriteRole: 'don',
        favoriteMode: 'CLASSIC',
        rolePlayCounts: { don: 12, sheriff: 8, consigliere: 8 },
        modePlayCounts: { CLASSIC: 18, ADVANCED: 10 },
        achievements: ['first_blood', 'first_win', 'winner_3', 'winner_10', 'veteran_10', 'mafia_master', 'town_hero'],
        activeTitle: 'mafia_legend',
        unlockedTitles: ['novice', 'mafia_legend'],
        createdAt: now - 86400000 * 30,
        lastSeenAt: now,
      }),
      hydrateUser({
        id: 'usr_sheriff_uz',
        username: 'SherifTemur',
        email: 'temur@mafiapro.uz',
        passwordHash: hashPassword('Player123!'),
        avatar: 'gold',
        country: 'UZ',
        level: 9,
        xp: 1920,
        weeklyXp: 480,
        monthlyXp: 1350,
        rating: 1440,
        tournamentPoints: 110,
        gold: 820,
        diamonds: 18,
        totalGames: 19,
        wins: 13,
        losses: 6,
        weeklyWins: 4,
        monthlyWins: 9,
        winStreak: 2,
        bestWinStreak: 4,
        favoriteRole: 'sheriff',
        favoriteMode: 'CLASSIC',
        rolePlayCounts: { sheriff: 11, doctor: 5, citizen: 3 },
        modePlayCounts: { CLASSIC: 14, ADVANCED: 5 },
        achievements: ['first_blood', 'first_win', 'winner_3', 'veteran_10', 'town_hero'],
        activeTitle: 'master_detective',
        unlockedTitles: ['novice', 'master_detective'],
        createdAt: now - 86400000 * 20,
        lastSeenAt: now - 3600000,
      }),
      hydrateUser({
        id: 'usr_violet_ru',
        username: 'ShadowElena',
        email: 'elena@mafiapro.uz',
        passwordHash: hashPassword('Player123!'),
        avatar: 'violet',
        country: 'RU',
        level: 8,
        xp: 1640,
        weeklyXp: 390,
        monthlyXp: 1120,
        rating: 1380,
        tournamentPoints: 90,
        gold: 640,
        diamonds: 12,
        totalGames: 16,
        wins: 10,
        losses: 6,
        weeklyWins: 3,
        monthlyWins: 7,
        winStreak: 1,
        bestWinStreak: 3,
        favoriteRole: 'consigliere',
        favoriteMode: 'ADVANCED',
        rolePlayCounts: { consigliere: 7, witch: 5, doctor: 4 },
        modePlayCounts: { ADVANCED: 11, CHAOS: 5 },
        achievements: ['first_blood', 'first_win', 'winner_3', 'mafia_master'],
        activeTitle: 'night_hunter',
        unlockedTitles: ['novice', 'night_hunter'],
        createdAt: now - 86400000 * 14,
        lastSeenAt: now - 7200000,
      }),
    ],
    history: [],
    reports: [],
    transactions: [],
    tournaments: [
      {
        id: 'trn_grand_opening',
        name: 'MAFIA PRO — Elite Grand Cup',
        format: 'SINGLE_ELIMINATION',
        mode: 'CLASSIC',
        maxPlayers: 16,
        prizeGold: 2000,
        prizeDiamonds: 50,
        entryFeeGold: 0,
        status: 'REGISTRATION',
        createdBy: 'usr_admin',
        participants: ['usr_admin', 'usr_sheriff_uz', 'usr_violet_ru'],
        matches: [],
        podiumIds: [],
        createdAt: now - 3600000,
        startsAt: now + 86400000,
      },
    ],
    auditLogs: [],
    vipPlans: createDefaultVipPlans(now),
    subscriptions: [],
    productCategories: createDefaultCategories(),
    shopProducts: createDefaultShopProducts(now),
    inventory: [],
    orders: [],
    payments: [],
    paymentEvents: [],
    campaigns: [
      {
        id: 'cmp_launch20',
        code: 'MAFIA20',
        title: { uz: '2.0 Ochilish Chegirmasi', ru: 'Скидка запуска 2.0' },
        discountType: 'PERCENT',
        discountPercent: 20,
        appliesTo: 'ALL',
        maxUses: 1000,
        perUserLimit: 3,
        usedCount: 0,
        isActive: true,
        createdAt: now,
      },
    ],
    promoRedemptions: [],
    notifications: [],
    roleConfigs: [],
    websiteSettings: createDefaultWebsiteSettings(now),
    adminRoles: createDefaultAdminRoles(),
    systemEvents: [
      {
        id: 'sys_boot',
        eventType: 'SYSTEM',
        severity: 'INFO',
        source: 'Store',
        message: 'MAFIA PRO Admin Control Center initialized',
        createdAt: now,
      },
    ],
    serverConfig: {
      maintenanceMode: false,
      defaultTimers: {
        roleAssignment: 6,
        night: 30,
        day: 10,
        discussion: 45,
        voting: 25,
        execution: 6,
      },
      enabledModes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    },
  };
}

class PersistentStore {
  private data: DatabaseSchema;

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        const defaults = createInitialDb();
        const needsEconomyMigration = !parsed.vipPlans || !parsed.shopProducts;
        if (needsEconomyMigration) {
          this.createBackupSnapshot(raw);
        }
        this.data = {
          users: (parsed.users || []).map((u) => hydrateUser(u)),
          history: parsed.history || [],
          reports: parsed.reports || [],
          transactions: parsed.transactions || [],
          tournaments: parsed.tournaments || [],
          auditLogs: parsed.auditLogs || [],
          vipPlans: parsed.vipPlans && parsed.vipPlans.length > 0 ? parsed.vipPlans : defaults.vipPlans,
          subscriptions: parsed.subscriptions || [],
          productCategories:
            parsed.productCategories && parsed.productCategories.length > 0
              ? parsed.productCategories
              : defaults.productCategories,
          shopProducts:
            parsed.shopProducts && parsed.shopProducts.length > 0
              ? parsed.shopProducts
              : defaults.shopProducts,
          inventory: parsed.inventory || [],
          orders: parsed.orders || [],
          payments: parsed.payments || [],
          paymentEvents: parsed.paymentEvents || [],
          campaigns: parsed.campaigns || defaults.campaigns,
          promoRedemptions: parsed.promoRedemptions || [],
          notifications: parsed.notifications || [],
          roleConfigs: parsed.roleConfigs || [],
          websiteSettings: parsed.websiteSettings || defaults.websiteSettings,
          adminRoles: parsed.adminRoles && parsed.adminRoles.length > 0 ? parsed.adminRoles : defaults.adminRoles,
          systemEvents: parsed.systemEvents || defaults.systemEvents,
          serverConfig: parsed.serverConfig || defaults.serverConfig,
        };
        if (needsEconomyMigration) {
          this.save();
        }
      } catch {
        this.data = createInitialDb();
        this.save();
      }
    } else {
      this.data = createInitialDb();
      this.save();
    }
  }

  public createBackupSnapshot(rawOverride?: string): string {
    const backupDir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `db-backup-${Date.now()}.json`);
    const content = rawOverride ?? JSON.stringify(this.data, null, 2);
    fs.writeFileSync(file, content, 'utf8');
    return file;
  }

  private save() {
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
  }

  private recordTransaction(
    user: StoredUser,
    currency: 'GOLD' | 'DIAMONDS',
    amount: number,
    type: CurrencyTransaction['type'],
    description: string
  ) {
    const tx: CurrencyTransaction = {
      id: `tx_${crypto.randomBytes(5).toString('hex')}`,
      userId: user.id,
      username: user.username,
      currency,
      amount,
      type,
      description,
      createdAt: Date.now(),
    };
    this.data.transactions.unshift(tx);
    if (this.data.transactions.length > 500) {
      this.data.transactions = this.data.transactions.slice(0, 500);
    }
  }

  public addAuditLog(
    actorId: string,
    actorName: string,
    action: string,
    details: string,
    severity: AuditLogEntry['severity'] = 'INFO'
  ) {
    this.data.auditLogs.unshift({
      id: `aud_${crypto.randomBytes(5).toString('hex')}`,
      actorId,
      actorName,
      action,
      details,
      severity,
      createdAt: Date.now(),
    });
    if (this.data.auditLogs.length > 400) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 400);
    }
  }

  public sanitizeUser(u: StoredUser): UserProfile {
    const { passwordHash: _pw, ...safe } = u;
    return safe;
  }

  public findUserByEmail(email: string): StoredUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public registerUser(username: string, email: string, password: string, avatar = 'crimson', country = 'UZ'): UserProfile {
    const existingEmail = this.findUserByEmail(email);
    if (existingEmail) throw new Error('Email already registered');
    const existingName = this.data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (existingName) throw new Error('Username already taken');

    const now = Date.now();
    const user = hydrateUser({
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      avatar,
      country: country || 'UZ',
      gold: 150,
      diamonds: 5,
      createdAt: now,
      lastSeenAt: now,
    });
    this.data.users.push(user);
    this.addAuditLog(user.id, user.username, 'USER_REGISTERED', `Registered from ${user.country}`);
    this.save();
    return this.sanitizeUser(user);
  }

  public authenticate(email: string, password: string): UserProfile {
    const user = this.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      this.recordSystemEvent('FAILED_LOGIN', 'WARN', 'Auth', `Failed login attempt for ${email}`);
      throw new Error('Invalid email or password');
    }
    if (user.isBanned) {
      throw new Error(`Account banned: ${user.banReason || 'Violation of rules'}`);
    }
    if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
      throw new Error(`Account suspended until ${new Date(user.suspendedUntil).toLocaleString()}`);
    }
    user.lastSeenAt = Date.now();
    this.save();
    return this.sanitizeUser(user);
  }

  public updateProfile(
    userId: string,
    updates: { username?: string; avatar?: string; country?: string; activeTitle?: string }
  ): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (updates.username && updates.username.trim().length >= 3) {
      const conflict = this.data.users.find(
        (u) => u.id !== userId && u.username.toLowerCase() === updates.username!.trim().toLowerCase()
      );
      if (conflict) throw new Error('Username already taken');
      user.username = updates.username.trim();
    }
    if (updates.avatar) user.avatar = updates.avatar;
    if (updates.country) user.country = updates.country.toUpperCase().slice(0, 6);
    if (updates.activeTitle !== undefined) {
      if (updates.activeTitle === '' || user.unlockedTitles.includes(updates.activeTitle)) {
        user.activeTitle = updates.activeTitle || undefined;
      }
    }
    this.save();
    return this.sanitizeUser(user);
  }

  public getLeaderboard(opts?: {
    period?: 'global' | 'weekly' | 'monthly';
    country?: string;
    userId?: string;
    friendsOnly?: boolean;
    search?: string;
  }): UserProfile[] {
    let list = this.data.users.filter((u) => !u.isBanned);

    if (opts?.country && opts.country !== 'ALL') {
      list = list.filter((u) => u.country === opts.country);
    }

    if (opts?.friendsOnly && opts.userId) {
      const me = this.findUserById(opts.userId);
      const friendSet = new Set([opts.userId, ...(me?.friends || [])]);
      list = list.filter((u) => friendSet.has(u.id));
    }

    if (opts?.search?.trim()) {
      const q = opts.search.trim().toLowerCase();
      list = list.filter((u) => u.username.toLowerCase().includes(q));
    }

    const period = opts?.period || 'global';
    list.sort((a, b) => {
      if (period === 'weekly') return b.weeklyXp - a.weeklyXp || b.weeklyWins - a.weeklyWins;
      if (period === 'monthly') return b.monthlyXp - a.monthlyXp || b.monthlyWins - a.monthlyWins;
      return b.rating - a.rating || b.xp - a.xp || b.wins - a.wins;
    });

    return list.slice(0, 100).map((u) => this.sanitizeUser(u));
  }

  private unlockAchievement(user: StoredUser, achId: string) {
    if (user.achievements.includes(achId)) return;
    const def = ACHIEVEMENTS.find((a) => a.id === achId);
    if (!def) return;
    user.achievements.push(achId);
    user.xp += def.xpReward;
    user.weeklyXp += def.xpReward;
    user.monthlyXp += def.xpReward;
    if (def.goldReward > 0) {
      user.gold += def.goldReward;
      this.recordTransaction(user, 'GOLD', def.goldReward, 'ACHIEVEMENT', `Achievement: ${def.id}`);
    }
    if (def.diamondReward && def.diamondReward > 0) {
      user.diamonds += def.diamondReward;
      this.recordTransaction(user, 'DIAMONDS', def.diamondReward, 'ACHIEVEMENT', `Achievement: ${def.id}`);
    }
    if (def.titleId && !user.unlockedTitles.includes(def.titleId)) {
      user.unlockedTitles.push(def.titleId);
    }
  }

  private incrementMission(user: StoredUser, metric: 'GAMES_PLAYED' | 'WINS' | 'SURVIVED' | 'TOURNAMENT_JOIN', amount = 1) {
    const dayKey = getUtcDayKey();
    const weekKey = getUtcWeekKey();
    for (const m of MISSIONS) {
      if (m.metric !== metric) continue;
      const pKey = m.period === 'DAILY' ? dayKey : weekKey;
      const cur = user.missionProgress[m.id];
      if (!cur || cur.periodKey !== pKey) {
        user.missionProgress[m.id] = { progress: Math.min(m.target, amount), claimed: false, periodKey: pKey };
      } else {
        cur.progress = Math.min(m.target, cur.progress + amount);
      }
    }
  }

  public recordGameResult(record: GameHistoryRecord): void {
    // Prevent duplicate game result recording
    if (this.data.history.some((h) => h.id === record.id)) return;

    this.data.history.unshift(record);
    if (this.data.history.length > 300) {
      this.data.history = this.data.history.slice(0, 300);
    }

    const humanPlayers = record.players.filter((p) => Boolean(this.findUserById(p.userId)));

    for (const p of record.players) {
      const user = this.findUserById(p.userId);
      if (!user) continue;

      const xpGain = calculateXpReward(p.won, p.survived, record.mode);
      const goldGain = calculateGoldReward(p.won, p.survived, record.mode);
      const ratingDelta = calculateRatingDelta(p.won, user.rating, record.playerCount);

      user.totalGames += 1;
      user.xp += xpGain;
      user.weeklyXp += xpGain;
      user.monthlyXp += xpGain;
      user.gold += goldGain;
      user.rating = Math.max(100, user.rating + ratingDelta);
      this.recordTransaction(user, 'GOLD', goldGain, 'GAME_REWARD', `Match ${record.roomCode} (${record.mode})`);

      if (p.won) {
        user.wins += 1;
        user.weeklyWins += 1;
        user.monthlyWins += 1;
        user.winStreak += 1;
        if (user.winStreak > user.bestWinStreak) user.bestWinStreak = user.winStreak;
      } else {
        user.losses += 1;
        user.winStreak = 0;
      }

      user.rolePlayCounts[p.roleId] = (user.rolePlayCounts[p.roleId] ?? 0) + 1;
      user.modePlayCounts[record.mode] = (user.modePlayCounts[record.mode] ?? 0) + 1;

      // Favorite Role & Mode
      let topRole: RoleId = p.roleId;
      let topRoleCnt = 0;
      for (const [rId, cnt] of Object.entries(user.rolePlayCounts)) {
        if (cnt > topRoleCnt) {
          topRoleCnt = cnt;
          topRole = rId as RoleId;
        }
      }
      user.favoriteRole = topRole;

      let topMode: GameMode = record.mode;
      let topModeCnt = 0;
      for (const [mId, cnt] of Object.entries(user.modePlayCounts)) {
        if (cnt > topModeCnt) {
          topModeCnt = cnt;
          topMode = mId as GameMode;
        }
      }
      user.favoriteMode = topMode;

      // Missions
      this.incrementMission(user, 'GAMES_PLAYED', 1);
      if (p.won) this.incrementMission(user, 'WINS', 1);
      if (p.survived) this.incrementMission(user, 'SURVIVED', 1);

      // Recent players
      for (const other of humanPlayers) {
        if (other.userId === user.id) continue;
        user.recentPlayers = [
          { userId: other.userId, username: other.username, lastPlayedAt: record.endedAt },
          ...user.recentPlayers.filter((rp) => rp.userId !== other.userId),
        ].slice(0, 15);
      }

      // Evaluate 42 Achievements
      if (user.totalGames >= 1) this.unlockAchievement(user, 'first_blood');
      if (user.totalGames >= 5) this.unlockAchievement(user, 'games_5');
      if (user.totalGames >= 10) this.unlockAchievement(user, 'veteran_10');
      if (user.totalGames >= 25) this.unlockAchievement(user, 'games_25');
      if (user.totalGames >= 50) this.unlockAchievement(user, 'games_50');
      if (user.totalGames >= 100) this.unlockAchievement(user, 'games_100');
      if (user.totalGames >= 250) this.unlockAchievement(user, 'games_250');

      if (user.wins >= 1) this.unlockAchievement(user, 'first_win');
      if (user.wins >= 3) this.unlockAchievement(user, 'winner_3');
      if (user.wins >= 10) this.unlockAchievement(user, 'winner_10');
      if (user.wins >= 25) this.unlockAchievement(user, 'winner_25');
      if (user.wins >= 50) this.unlockAchievement(user, 'winner_50');
      if (user.wins >= 100) this.unlockAchievement(user, 'winner_100');
      if (user.wins >= 500) this.unlockAchievement(user, 'winner_500');

      if (user.winStreak >= 3) this.unlockAchievement(user, 'streak_3');
      if (user.winStreak >= 5) this.unlockAchievement(user, 'streak_5');

      if (p.won && p.survived && record.rounds <= 3) this.unlockAchievement(user, 'perfect_victory');
      if (p.won && p.team === 'MAFIA') this.unlockAchievement(user, 'mafia_master');
      if (p.won && p.team === 'TOWN') this.unlockAchievement(user, 'town_hero');
      if (p.won && p.team === 'NEUTRAL') this.unlockAchievement(user, 'neutral_agent');
      if (p.won && p.survived && (p.team === 'MAFIA' || p.roleId === 'serial_killer')) {
        this.unlockAchievement(user, 'silent_assassin');
      }
      if (p.won && (p.roleId === 'sheriff' || p.roleId === 'detective')) {
        this.unlockAchievement(user, 'master_detective');
      }
      if (p.won && (p.roleId === 'doctor' || p.roleId === 'bodyguard')) {
        this.unlockAchievement(user, 'life_saver');
      }
      if (p.won && (p.roleId === 'don' || p.roleId === 'godfather')) {
        this.unlockAchievement(user, 'don_shadow');
      }
      if (p.won && record.mode === 'CHAOS') this.unlockAchievement(user, 'chaos_survivor');
      if (p.won && record.mode === 'ADVANCED') this.unlockAchievement(user, 'advanced_mind');
      if (Object.keys(user.rolePlayCounts).length >= 5) this.unlockAchievement(user, 'role_explorer');
      if (p.won && p.survived) this.unlockAchievement(user, 'survivor_badge');
      if (record.rounds >= 4) this.unlockAchievement(user, 'long_game');
      if (p.won && record.playerCount >= 10) this.unlockAchievement(user, 'clutch_win');

      user.level = Math.max(1, Math.floor(user.xp / 250) + 1);
      if (user.level >= 5) this.unlockAchievement(user, 'level_5');
      if (user.level >= 15) this.unlockAchievement(user, 'level_15');
      if (user.level >= 30) this.unlockAchievement(user, 'level_30');

      user.lastSeenAt = Date.now();
    }

    this.save();
  }

  public claimDailyReward(userId: string, now = Date.now()): {
    user: UserProfile;
    reward: (typeof DAILY_REWARD_CALENDAR)[number];
  } {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const todayKey = getUtcDayKey(now);
    const lastKey = user.dailyReward.lastClaimAt ? getUtcDayKey(user.dailyReward.lastClaimAt) : '';

    if (lastKey === todayKey) {
      throw new Error('Daily reward already claimed today');
    }

    const yesterdayKey = getUtcDayKey(now - 86400000);
    const nextStreak = lastKey === yesterdayKey ? (user.dailyReward.streak % 7) + 1 : 1;
    const reward = DAILY_REWARD_CALENDAR[nextStreak - 1];

    user.dailyReward.streak = nextStreak;
    user.dailyReward.lastClaimAt = now;
    user.dailyReward.totalClaims += 1;

    user.gold += reward.gold;
    user.xp += reward.xp;
    user.weeklyXp += reward.xp;
    user.monthlyXp += reward.xp;
    user.level = Math.max(1, Math.floor(user.xp / 250) + 1);
    this.recordTransaction(user, 'GOLD', reward.gold, 'DAILY_REWARD', `Day ${reward.day} Login Reward`);

    if (reward.diamonds > 0) {
      user.diamonds += reward.diamonds;
      this.recordTransaction(user, 'DIAMONDS', reward.diamonds, 'DAILY_REWARD', `Day ${reward.day} Login Reward`);
    }

    if (nextStreak === 7) {
      this.unlockAchievement(user, 'daily_regular');
    }

    this.save();
    return { user: this.sanitizeUser(user), reward };
  }

  public claimMissionReward(userId: string, missionId: string, now = Date.now()): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) throw new Error('Mission not found');

    const expectedKey = def.period === 'DAILY' ? getUtcDayKey(now) : getUtcWeekKey(now);
    const state = user.missionProgress[missionId];
    if (!state || state.periodKey !== expectedKey || state.progress < def.target) {
      throw new Error('Mission not yet completed');
    }
    if (state.claimed) {
      throw new Error('Mission reward already claimed');
    }

    state.claimed = true;
    user.xp += def.xpReward;
    user.weeklyXp += def.xpReward;
    user.monthlyXp += def.xpReward;
    user.gold += def.goldReward;
    user.level = Math.max(1, Math.floor(user.xp / 250) + 1);
    this.recordTransaction(user, 'GOLD', def.goldReward, 'MISSION_REWARD', `Mission: ${def.id}`);

    if (def.diamondReward && def.diamondReward > 0) {
      user.diamonds += def.diamondReward;
      this.recordTransaction(user, 'DIAMONDS', def.diamondReward, 'MISSION_REWARD', `Mission: ${def.id}`);
    }

    this.save();
    return this.sanitizeUser(user);
  }

  public expireVipIfNeeded(user: StoredUser): boolean {
    if (
      user.subscription.status === 'ACTIVE' &&
      user.subscription.expiresAt &&
      user.subscription.expiresAt <= Date.now()
    ) {
      user.subscription.status = 'EXPIRED';
      user.subscription.tier = 'FREE';
      for (const sub of this.data.subscriptions) {
        if (sub.userId === user.id && sub.status === 'ACTIVE' && sub.expiresAt <= Date.now()) {
          sub.status = 'EXPIRED';
        }
      }
      return true;
    }
    return false;
  }

  public purchaseCosmetic(userId: string, itemId: string): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    this.expireVipIfNeeded(user);

    const product = this.data.shopProducts.find((p) => p.id === itemId && p.isActive);
    const legacy = COSMETICS.find((c) => c.id === itemId);
    const item = product || (legacy ? {
      id: legacy.id,
      category: legacy.category,
      priceGold: legacy.priceGold,
      priceDiamonds: legacy.priceDiamonds,
      vipOnly: Boolean(legacy.premiumOnly),
      isUnique: true,
    } : null);

    if (!item) throw new Error('Cosmetic item not found');
    if (item.isUnique && user.ownedCosmetics.includes(itemId)) throw new Error('Item already owned');

    if (item.vipOnly && (user.subscription.tier !== 'ELITE' || user.subscription.status !== 'ACTIVE')) {
      throw new Error('Active ELITE membership required for this item');
    }

    if (item.priceGold && item.priceGold > 0) {
      if (user.gold < item.priceGold) throw new Error('Insufficient Gold');
      user.gold -= item.priceGold;
      this.recordTransaction(user, 'GOLD', -item.priceGold, 'PURCHASE', `Purchased ${item.id}`);
    } else if (item.priceDiamonds && item.priceDiamonds > 0) {
      if (user.diamonds < item.priceDiamonds) throw new Error('Insufficient Diamonds');
      user.diamonds -= item.priceDiamonds;
      this.recordTransaction(user, 'DIAMONDS', -item.priceDiamonds, 'PURCHASE', `Purchased ${item.id}`);
    }

    if (!user.ownedCosmetics.includes(itemId)) {
      user.ownedCosmetics.push(itemId);
    }
    user.equippedCosmetics[item.category] = itemId;
    if (!this.data.inventory.some((inv) => inv.userId === user.id && inv.productId === itemId)) {
      this.data.inventory.unshift({
        id: `inv_${crypto.randomBytes(5).toString('hex')}`,
        userId: user.id,
        productId: itemId,
        category: item.category,
        acquiredAt: Date.now(),
      });
    }
    if (user.ownedCosmetics.length >= 3) {
      this.unlockAchievement(user, 'fashion_collector');
    }
    this.addAuditLog(user.id, user.username, 'COSMETIC_PURCHASE', `Bought ${item.id}`);
    this.save();
    return this.sanitizeUser(user);
  }

  public equipCosmetic(userId: string, itemId: string): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const product = this.data.shopProducts.find((c) => c.id === itemId);
    const legacy = COSMETICS.find((c) => c.id === itemId);
    const category = product?.category || legacy?.category;
    if (!category) throw new Error('Cosmetic item not found');
    if (!user.ownedCosmetics.includes(itemId)) throw new Error('You do not own this item');

    const cat: CosmeticCategory = category;
    if (user.equippedCosmetics[cat] === itemId) {
      delete user.equippedCosmetics[cat];
    } else {
      user.equippedCosmetics[cat] = itemId;
    }
    this.save();
    return this.sanitizeUser(user);
  }

  public verifyExternalSubscription(
    userId: string,
    provider: string,
    verificationToken: string
  ): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const providerSecret = process.env.PAYMENT_PROVIDER_SECRET;
    if (!providerSecret) {
      throw new Error('Payment provider integration is not configured on this server.');
    }

    const expected = crypto
      .createHmac('sha256', providerSecret)
      .update(`${userId}:${provider}`)
      .digest('hex');

    if (verificationToken.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(verificationToken), Buffer.from(expected))) {
      this.addAuditLog(user.id, user.username, 'SUBSCRIPTION_VERIFY_FAILED', `Invalid token for ${provider}`, 'WARN');
      this.save();
      throw new Error('Payment verification failed');
    }

    user.subscription = {
      tier: 'ELITE',
      status: 'ACTIVE',
      provider,
      verified: true,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    };
    this.addAuditLog(user.id, user.username, 'SUBSCRIPTION_ACTIVATED', `Verified via ${provider}`);
    this.save();
    return this.sanitizeUser(user);
  }

  public cancelSubscription(userId: string): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.subscription.status === 'ACTIVE') {
      user.subscription.status = 'CANCELLED';
      this.addAuditLog(user.id, user.username, 'SUBSCRIPTION_CANCELLED', 'Cancelled by user');
      this.save();
    }
    return this.sanitizeUser(user);
  }

  // ======================== SOCIAL SYSTEM ========================

  public searchPlayers(query: string, excludeId: string): UserProfile[] {
    const q = query.trim().toLowerCase();
    return this.data.users
      .filter((u) => u.id !== excludeId && !u.isBanned && (!q || u.username.toLowerCase().includes(q)))
      .slice(0, 20)
      .map((u) => this.sanitizeUser(u));
  }

  public getSocialOverview(userId: string) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const now = Date.now();
    const mapUser = (id: string) => {
      const u = this.findUserById(id);
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        level: u.level,
        rating: u.rating,
        country: u.country,
        isOnline: now - u.lastSeenAt < 1000 * 60 * 10,
      };
    };

    return {
      friends: user.friends.map(mapUser).filter(Boolean),
      requestsIn: user.friendRequestsIn.map(mapUser).filter(Boolean),
      requestsOut: user.friendRequestsOut.map(mapUser).filter(Boolean),
      blocked: user.blockedUsers.map(mapUser).filter(Boolean),
      recentPlayers: user.recentPlayers,
    };
  }

  public sendFriendRequest(fromId: string, targetId: string): void {
    if (fromId === targetId) throw new Error('Cannot add yourself');
    const from = this.findUserById(fromId);
    const target = this.findUserById(targetId);
    if (!from || !target) throw new Error('Player not found');
    if (target.blockedUsers.includes(fromId) || from.blockedUsers.includes(targetId)) {
      throw new Error('Action blocked');
    }
    if (from.friends.includes(targetId)) throw new Error('Already friends');
    if (from.friendRequestsOut.includes(targetId)) throw new Error('Request already sent');

    // Auto-accept if mutual request
    if (from.friendRequestsIn.includes(targetId)) {
      this.acceptFriendRequest(fromId, targetId);
      return;
    }

    from.friendRequestsOut.push(targetId);
    target.friendRequestsIn.push(fromId);
    this.save();
  }

  public acceptFriendRequest(userId: string, requesterId: string): void {
    const user = this.findUserById(userId);
    const req = this.findUserById(requesterId);
    if (!user || !req) throw new Error('Player not found');
    user.friendRequestsIn = user.friendRequestsIn.filter((id) => id !== requesterId);
    req.friendRequestsOut = req.friendRequestsOut.filter((id) => id !== userId);

    if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
    if (!req.friends.includes(userId)) req.friends.push(userId);

    if (user.friends.length >= 1) this.unlockAchievement(user, 'first_friend');
    if (user.friends.length >= 5) this.unlockAchievement(user, 'squad_5');
    if (req.friends.length >= 1) this.unlockAchievement(req, 'first_friend');
    if (req.friends.length >= 5) this.unlockAchievement(req, 'squad_5');

    this.save();
  }

  public declineFriendRequest(userId: string, requesterId: string): void {
    const user = this.findUserById(userId);
    const req = this.findUserById(requesterId);
    if (!user || !req) return;
    user.friendRequestsIn = user.friendRequestsIn.filter((id) => id !== requesterId);
    req.friendRequestsOut = req.friendRequestsOut.filter((id) => id !== userId);
    this.save();
  }

  public removeFriend(userId: string, friendId: string): void {
    const user = this.findUserById(userId);
    const friend = this.findUserById(friendId);
    if (user) user.friends = user.friends.filter((id) => id !== friendId);
    if (friend) friend.friends = friend.friends.filter((id) => id !== userId);
    this.save();
  }

  public blockUser(userId: string, targetId: string): void {
    const user = this.findUserById(userId);
    if (!user || userId === targetId) return;
    if (!user.blockedUsers.includes(targetId)) user.blockedUsers.push(targetId);
    this.removeFriend(userId, targetId);
    this.declineFriendRequest(userId, targetId);
    this.save();
  }

  public unblockUser(userId: string, targetId: string): void {
    const user = this.findUserById(userId);
    if (!user) return;
    user.blockedUsers = user.blockedUsers.filter((id) => id !== targetId);
    this.save();
  }

  // ======================== TOURNAMENTS ========================

  public getTournaments(): Tournament[] {
    return this.data.tournaments;
  }

  public createTournament(
    creatorId: string,
    input: {
      name: string;
      format: TournamentFormat;
      mode: GameMode;
      maxPlayers: number;
      prizeGold: number;
      prizeDiamonds: number;
      entryFeeGold: number;
    }
  ): Tournament {
    const creator = this.findUserById(creatorId);
    if (!creator) throw new Error('User not found');

    const trn: Tournament = {
      id: `trn_${crypto.randomBytes(5).toString('hex')}`,
      name: String(input.name || 'MAFIA PRO Cup').slice(0, 50),
      format: input.format,
      mode: input.mode,
      maxPlayers: Math.max(4, Math.min(32, Number(input.maxPlayers) || 8)),
      prizeGold: Math.max(0, Math.min(10000, Number(input.prizeGold) || 500)),
      prizeDiamonds: Math.max(0, Math.min(500, Number(input.prizeDiamonds) || 10)),
      entryFeeGold: Math.max(0, Math.min(1000, Number(input.entryFeeGold) || 0)),
      status: 'REGISTRATION',
      createdBy: creatorId,
      participants: [creatorId],
      matches: [],
      podiumIds: [],
      createdAt: Date.now(),
      startsAt: Date.now() + 3600000,
    };

    this.data.tournaments.unshift(trn);
    this.addAuditLog(creatorId, creator.username, 'TOURNAMENT_CREATED', trn.name);
    this.save();
    return trn;
  }

  public joinTournament(userId: string, tournamentId: string): Tournament {
    const user = this.findUserById(userId);
    const trn = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!user || !trn) throw new Error('Tournament or user not found');
    if (trn.status !== 'REGISTRATION') throw new Error('Registration closed');
    if (trn.participants.includes(userId)) throw new Error('Already registered');
    if (trn.participants.length >= trn.maxPlayers) throw new Error('Tournament is full');

    if (trn.entryFeeGold > 0) {
      if (user.gold < trn.entryFeeGold) throw new Error('Insufficient Gold for entry fee');
      user.gold -= trn.entryFeeGold;
      this.recordTransaction(user, 'GOLD', -trn.entryFeeGold, 'PURCHASE', `Tournament entry: ${trn.name}`);
    }

    trn.participants.push(userId);
    this.incrementMission(user, 'TOURNAMENT_JOIN', 1);
    this.unlockAchievement(user, 'tournament_contender');
    this.save();
    return trn;
  }

  public startTournament(actorId: string, tournamentId: string): Tournament {
    const actor = this.findUserById(actorId);
    const trn = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!actor || !trn) throw new Error('Tournament not found');
    if (actor.role !== 'ADMIN' && trn.createdBy !== actorId) {
      throw new Error('Only tournament creator or admin can start');
    }
    if (trn.status !== 'REGISTRATION') throw new Error('Tournament already started');
    if (trn.participants.length < 2) throw new Error('Need at least 2 participants');

    trn.status = 'IN_PROGRESS';
    trn.matches = generateTournamentBracket(trn.participants, trn.format, Date.now());
    this.addAuditLog(actorId, actor.username, 'TOURNAMENT_STARTED', trn.name);
    this.save();
    return trn;
  }

  public reportTournamentMatchResult(
    actorId: string,
    tournamentId: string,
    matchId: string,
    winnerId: string
  ): Tournament {
    const actor = this.findUserById(actorId);
    const trn = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!actor || !trn) throw new Error('Tournament not found');
    if (actor.role !== 'ADMIN' && trn.createdBy !== actorId) {
      throw new Error('Only tournament creator or admin can report results');
    }
    if (trn.status !== 'IN_PROGRESS') throw new Error('Tournament is not active');

    const match = trn.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');
    if (match.status === 'COMPLETED') throw new Error('Match already completed');
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      throw new Error('Winner must be a match participant');
    }

    match.winnerId = winnerId;
    match.status = 'COMPLETED';

    // Advance winner in elimination formats
    if (trn.format !== 'ROUND_ROBIN') {
      const nextRound = match.round + 1;
      const nextMatchNum = Math.ceil(match.matchNumber / 2);
      const nextMatch = trn.matches.find((m) => m.round === nextRound && m.matchNumber === nextMatchNum);
      if (nextMatch) {
        if (match.matchNumber % 2 === 1) nextMatch.player1Id = winnerId;
        else nextMatch.player2Id = winnerId;
      }
    }

    // Check if all matches completed
    if (trn.matches.every((m) => m.status === 'COMPLETED')) {
      trn.status = 'COMPLETED';
      let champId = winnerId;
      if (trn.format === 'ROUND_ROBIN') {
        const winCounts: Record<string, number> = {};
        for (const m of trn.matches) {
          if (m.winnerId) winCounts[m.winnerId] = (winCounts[m.winnerId] ?? 0) + 1;
        }
        const sorted = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
        champId = sorted[0]?.[0] || winnerId;
        trn.podiumIds = sorted.slice(0, 3).map((s) => s[0]);
      } else {
        const runnerUp = match.player1Id === champId ? match.player2Id : match.player1Id;
        trn.podiumIds = [champId, ...(runnerUp ? [runnerUp] : [])];
      }
      trn.winnerId = champId;

      const champ = this.findUserById(champId);
      if (champ) {
        champ.gold += trn.prizeGold;
        champ.diamonds += trn.prizeDiamonds;
        champ.tournamentPoints += 100;
        this.recordTransaction(champ, 'GOLD', trn.prizeGold, 'TOURNAMENT_PRIZE', `1st Place: ${trn.name}`);
        if (trn.prizeDiamonds > 0) {
          this.recordTransaction(champ, 'DIAMONDS', trn.prizeDiamonds, 'TOURNAMENT_PRIZE', `1st Place: ${trn.name}`);
        }
        this.unlockAchievement(champ, 'tournament_champion');
      }
    }

    this.addAuditLog(actorId, actor.username, 'TOURNAMENT_MATCH_RESULT', `${trn.name} ${match.id} -> ${winnerId}`);
    this.save();
    return trn;
  }

  public cancelTournament(actorId: string, tournamentId: string): Tournament {
    const actor = this.findUserById(actorId);
    const trn = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!actor || !trn) throw new Error('Tournament not found');
    if (actor.role !== 'ADMIN') throw new Error('Admin access required');
    trn.status = 'CANCELLED';
    this.addAuditLog(actorId, actor.username, 'TOURNAMENT_CANCELLED', trn.name, 'WARN');
    this.save();
    return trn;
  }

  // ======================== EXISTING & ADMIN METHODS ========================

  public getHistory(userId?: string): GameHistoryRecord[] {
    if (!userId) return this.data.history.slice(0, 50);
    return this.data.history.filter((h) => h.players.some((p) => p.userId === userId)).slice(0, 50);
  }

  public getTransactions(userId?: string): CurrencyTransaction[] {
    if (!userId) return this.data.transactions.slice(0, 100);
    return this.data.transactions.filter((t) => t.userId === userId).slice(0, 50);
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.data.auditLogs.slice(0, 100);
  }

  public addReport(report: Omit<ModerationReport, 'id' | 'status' | 'createdAt'>): ModerationReport {
    const item: ModerationReport = {
      ...report,
      id: `rep_${crypto.randomBytes(5).toString('hex')}`,
      status: 'OPEN',
      createdAt: Date.now(),
    };
    this.data.reports.unshift(item);
    this.save();
    return item;
  }

  public getAllUsers(): UserProfile[] {
    return this.data.users.map((u) => this.sanitizeUser(u));
  }

  public banUser(userId: string, reason: string, actor?: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'ADMIN') throw new Error('Cannot ban an administrator');
    user.isBanned = true;
    user.banReason = reason || 'Rule violation';
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'USER_BANNED',
      `User ${user.username} banned by ${actorName}: ${user.banReason}`,
      'CRITICAL'
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public unbanUser(userId: string, actor?: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.isBanned = false;
    user.banReason = undefined;
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'USER_UNBANNED',
      `User ${user.username} unbanned by ${actorName}`
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public flagUser(userId: string, reason: string, actor?: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'ADMIN') throw new Error('Cannot flag an administrator');
    user.isFlagged = true;
    user.flagReason = reason || 'Reported misconduct';
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'USER_FLAGGED',
      `User ${user.username} flagged by ${actorName}: ${user.flagReason}`,
      'WARN'
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public unflagUser(userId: string, actor?: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.isFlagged = false;
    user.flagReason = undefined;
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'USER_UNFLAGGED',
      `User ${user.username} unflagged by ${actorName}`
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public warnUser(userId: string, reason: string, actor?: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'ADMIN') throw new Error('Cannot warn an administrator');
    user.warningsCount = (user.warningsCount ?? 0) + 1;
    user.lastWarningReason = reason || 'Misconduct warning';
    const actorName = actor?.username || 'Admin';
    const notif = {
      id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
      title: `Official Warning (Strike #${user.warningsCount})`,
      message: `You received a strike for misconduct: ${user.lastWarningReason}`,
      createdAt: Date.now(),
      read: false,
    };
    user.notifications = [notif, ...(user.notifications || [])].slice(0, 20);
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'USER_WARNED',
      `User ${user.username} warned (#${user.warningsCount}) by ${actorName}: ${user.lastWarningReason}`,
      'WARN'
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public markNotificationsRead(userId: string): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.notifications = (user.notifications || []).map((n) => ({ ...n, read: true }));
    this.save();
    return this.sanitizeUser(user);
  }

  public updateReportStatus(
    reportId: string,
    status: ModerationReport['status'],
    actor?: { id: string; username: string }
  ): ModerationReport {
    const rep = this.data.reports.find((r) => r.id === reportId);
    if (!rep) throw new Error('Report not found');
    rep.status = status;
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'REPORT_UPDATED',
      `Report against ${rep.targetUsername} marked ${status} by ${actorName}`
    );
    this.save();
    return rep;
  }

  public getReports(): ModerationReport[] {
    return this.data.reports;
  }

  public getServerConfig() {
    return this.data.serverConfig;
  }

  public updateServerConfig(
    partial: Partial<DatabaseSchema['serverConfig']>,
    actor?: { id: string; username: string }
  ) {
    this.data.serverConfig = { ...this.data.serverConfig, ...partial };
    const actorName = actor?.username || 'Admin';
    this.addAuditLog(
      actor?.id || 'ADMIN',
      actorName,
      'SERVER_CONFIG_UPDATED',
      `Server config updated by ${actorName} (maintenance: ${this.data.serverConfig.maintenanceMode})`,
      'WARN'
    );
    this.save();
    return this.serverConfigWrap(this.data.serverConfig);
  }

  private serverConfigWrap(cfg: DatabaseSchema['serverConfig']) {
    return cfg;
  }

  // ======================== MAFIA PRO 2.0 ECONOMY, VIP & PAYMENTS ========================

  public getVipPlans(includeInactive = false): VipPlan[] {
    return includeInactive ? this.data.vipPlans : this.data.vipPlans.filter((p) => p.isActive);
  }

  public saveVipPlan(
    input: Partial<VipPlan> & { id?: string },
    actor: { id: string; username: string }
  ): VipPlan {
    const now = Date.now();
    const existing = input.id ? this.data.vipPlans.find((p) => p.id === input.id) : undefined;
    if (existing) {
      existing.name = input.name || existing.name;
      existing.description = input.description || existing.description;
      existing.priceUzs = typeof input.priceUzs === 'number' ? Math.max(0, input.priceUzs) : existing.priceUzs;
      existing.durationDays = typeof input.durationDays === 'number' ? Math.max(1, input.durationDays) : existing.durationDays;
      existing.isActive = typeof input.isActive === 'boolean' ? input.isActive : existing.isActive;
      existing.features = input.features || existing.features;
      existing.updatedAt = now;
      this.addAuditLog(actor.id, actor.username, 'VIP_PLAN_UPDATED', `Updated plan ${existing.id} (${existing.priceUzs} UZS / ${existing.durationDays}d)`);
      this.save();
      return existing;
    }
    const created: VipPlan = {
      id: `vip_${crypto.randomBytes(4).toString('hex')}`,
      code: String(input.code || `VIP_${Date.now()}`).toUpperCase(),
      name: input.name || { uz: 'Yangi VIP Reja', ru: 'Новый VIP План' },
      description: input.description || { uz: 'VIP obuna rejasi', ru: 'План VIP подписки' },
      priceUzs: Math.max(0, Number(input.priceUzs) || 15000),
      durationDays: Math.max(1, Number(input.durationDays) || 30),
      isActive: input.isActive ?? true,
      features: input.features || { uz: ['VIP nishoni'], ru: ['VIP значок'] },
      createdAt: now,
      updatedAt: now,
    };
    this.data.vipPlans.push(created);
    this.addAuditLog(actor.id, actor.username, 'VIP_PLAN_CREATED', `Created plan ${created.id} (${created.priceUzs} UZS)`);
    this.save();
    return created;
  }

  public deleteVipPlan(planId: string, actor: { id: string; username: string }): void {
    this.data.vipPlans = this.data.vipPlans.filter((p) => p.id !== planId);
    this.addAuditLog(actor.id, actor.username, 'VIP_PLAN_DELETED', `Deleted VIP plan ${planId}`, 'WARN');
    this.save();
  }

  public getCategories(includeInactive = false): ProductCategory[] {
    const list = includeInactive ? this.data.productCategories : this.data.productCategories.filter((c) => c.isActive);
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public saveCategory(
    input: Partial<ProductCategory> & { id?: string },
    actor: { id: string; username: string }
  ): ProductCategory {
    const existing = input.id ? this.data.productCategories.find((c) => c.id === input.id) : undefined;
    if (existing) {
      if (input.name) existing.name = input.name;
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      if (typeof input.sortOrder === 'number') existing.sortOrder = input.sortOrder;
      this.addAuditLog(actor.id, actor.username, 'CATEGORY_UPDATED', `Updated category ${existing.id}`);
      this.save();
      return existing;
    }
    const created: ProductCategory = {
      id: `cat_${crypto.randomBytes(4).toString('hex')}`,
      slug: (input.slug || 'AVATAR') as CosmeticCategory,
      name: input.name || { uz: 'Yangi toifa', ru: 'Новая категория' },
      sortOrder: Number(input.sortOrder) || this.data.productCategories.length + 1,
      isActive: input.isActive ?? true,
    };
    this.data.productCategories.push(created);
    this.addAuditLog(actor.id, actor.username, 'CATEGORY_CREATED', `Created category ${created.slug}`);
    this.save();
    return created;
  }

  public getShopProducts(includeInactive = false): ShopProduct[] {
    return includeInactive ? this.data.shopProducts : this.data.shopProducts.filter((p) => p.isActive);
  }

  public saveShopProduct(
    input: Partial<ShopProduct> & { id?: string },
    actor: { id: string; username: string }
  ): ShopProduct {
    const now = Date.now();
    const existing = input.id ? this.data.shopProducts.find((p) => p.id === input.id) : undefined;
    if (existing) {
      if (input.category) existing.category = input.category;
      if (input.name) existing.name = input.name;
      if (input.description) existing.description = input.description;
      if (typeof input.imageUrl === 'string') existing.imageUrl = input.imageUrl;
      if (typeof input.priceUzs === 'number') existing.priceUzs = Math.max(0, input.priceUzs);
      if (typeof input.priceGold === 'number') existing.priceGold = input.priceGold;
      if (typeof input.priceDiamonds === 'number') existing.priceDiamonds = input.priceDiamonds;
      if (input.rarity) existing.rarity = input.rarity;
      if (input.previewColor) existing.previewColor = input.previewColor;
      if (typeof input.vipOnly === 'boolean') existing.vipOnly = input.vipOnly;
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      existing.updatedAt = now;
      this.addAuditLog(actor.id, actor.username, 'PRODUCT_UPDATED', `Updated product ${existing.id} (${existing.priceUzs} UZS)`);
      this.save();
      return existing;
    }
    const created: ShopProduct = {
      id: `prd_${crypto.randomBytes(5).toString('hex')}`,
      category: input.category || 'AVATAR',
      name: input.name || { uz: 'Yangi buyum', ru: 'Новый предмет' },
      description: input.description || { uz: 'Maxsus kosmetik buyum', ru: 'Особый косметический предмет' },
      imageUrl: input.imageUrl || '',
      priceUzs: Math.max(1000, Number(input.priceUzs) || 10000),
      priceGold: input.priceGold,
      priceDiamonds: input.priceDiamonds,
      rarity: input.rarity || 'RARE',
      previewColor: input.previewColor || '#E7B65B',
      isUnique: input.isUnique ?? true,
      vipOnly: Boolean(input.vipOnly),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.data.shopProducts.unshift(created);
    this.addAuditLog(actor.id, actor.username, 'PRODUCT_CREATED', `Created product ${created.id} (${created.priceUzs} UZS)`);
    this.save();
    return created;
  }

  public deleteShopProduct(productId: string, actor: { id: string; username: string }): void {
    this.data.shopProducts = this.data.shopProducts.filter((p) => p.id !== productId);
    this.addAuditLog(actor.id, actor.username, 'PRODUCT_DELETED', `Deleted product ${productId}`, 'WARN');
    this.save();
  }

  public getCampaigns(includeInactive = false): PromoCampaign[] {
    return includeInactive ? this.data.campaigns : this.data.campaigns.filter((c) => c.isActive);
  }

  public saveCampaign(
    input: Partial<PromoCampaign> & { id?: string },
    actor: { id: string; username: string }
  ): PromoCampaign {
    const existing = input.id ? this.data.campaigns.find((c) => c.id === input.id) : undefined;
    if (existing) {
      if (input.code) existing.code = input.code.toUpperCase();
      if (input.title) existing.title = input.title;
      if (typeof input.discountPercent === 'number') {
        existing.discountPercent = Math.min(80, Math.max(1, input.discountPercent));
      }
      if (input.appliesTo) existing.appliesTo = input.appliesTo;
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      this.addAuditLog(actor.id, actor.username, 'CAMPAIGN_UPDATED', `Updated promo ${existing.code}`);
      this.save();
      return existing;
    }
    const created: PromoCampaign = {
      id: `cmp_${crypto.randomBytes(4).toString('hex')}`,
      code: String(input.code || 'PROMO10').trim().toUpperCase(),
      title: input.title || { uz: 'Aksiya', ru: 'Акция' },
      discountPercent: Math.min(80, Math.max(1, Number(input.discountPercent) || 10)),
      appliesTo: input.appliesTo || 'ALL',
      isActive: input.isActive ?? true,
      createdAt: Date.now(),
    };
    this.data.campaigns.unshift(created);
    this.addAuditLog(actor.id, actor.username, 'CAMPAIGN_CREATED', `Created promo ${created.code} (-${created.discountPercent}%)`);
    this.save();
    return created;
  }

  public getUserInventory(userId: string) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    this.expireVipIfNeeded(user);
    const items = user.ownedCosmetics
      .map((pid) => this.data.shopProducts.find((p) => p.id === pid))
      .filter((p): p is ShopProduct => Boolean(p));
    const records = this.data.inventory.filter((inv) => inv.userId === userId);
    return {
      items,
      records,
      equippedCosmetics: user.equippedCosmetics,
      orders: this.data.orders.filter((o) => o.userId === userId),
      subscriptions: this.data.subscriptions.filter((s) => s.userId === userId),
    };
  }

  public createPaymentOrder(
    userId: string,
    params: {
      orderType: 'VIP_PLAN' | 'SHOP_PRODUCT';
      referenceId: string;
      provider: PaymentProvider;
      promoCode?: string;
    }
  ): { order: OrderRecord; payment: PaymentRecord; checkoutUrl: string } {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    this.expireVipIfNeeded(user);

    let baseAmount = 0;
    let itemName = '';

    if (params.orderType === 'VIP_PLAN') {
      const plan = this.data.vipPlans.find((p) => p.id === params.referenceId && p.isActive);
      if (!plan) throw new Error('VIP plan not found');
      baseAmount = plan.priceUzs;
      itemName = plan.name.uz;
    } else {
      const product = this.data.shopProducts.find((p) => p.id === params.referenceId && p.isActive);
      if (!product) throw new Error('Product not found');
      if (product.isUnique && user.ownedCosmetics.includes(product.id)) {
        throw new Error('You already own this unique item');
      }
      baseAmount = product.priceUzs;
      itemName = product.name.uz;
    }

    let discountUzs = 0;
    let appliedPromo: string | undefined;
    if (params.promoCode) {
      const code = params.promoCode.trim().toUpperCase();
      const cmp = this.data.campaigns.find(
        (c) =>
          c.isActive &&
          c.code === code &&
          (c.appliesTo === 'ALL' || c.appliesTo === params.orderType) &&
          (!c.expiresAt || c.expiresAt > Date.now())
      );
      if (cmp) {
        discountUzs = Math.round((baseAmount * cmp.discountPercent) / 100);
        appliedPromo = cmp.code;
      }
    }

    const amountUzs = Math.max(1000, baseAmount - discountUzs);
    const now = Date.now();
    const order: OrderRecord = {
      id: `ord_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      username: user.username,
      orderType: params.orderType,
      referenceId: params.referenceId,
      itemName,
      amountUzs,
      discountUzs,
      promoCode: appliedPromo,
      provider: params.provider,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    const payment: PaymentRecord = {
      id: `pay_${crypto.randomBytes(6).toString('hex')}`,
      orderId: order.id,
      userId: user.id,
      provider: params.provider,
      providerTxId: `${params.provider.toLowerCase()}_${crypto.randomBytes(6).toString('hex')}`,
      amountUzs,
      status: 'PENDING',
      idempotencyKey: `idem_${order.id}`,
      createdAt: now,
    };

    this.data.orders.unshift(order);
    this.data.payments.unshift(payment);
    this.save();

    const checkoutUrl =
      params.provider === 'PAYME'
        ? `${process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz'}?order=${order.id}`
        : params.provider === 'CLICK'
          ? `${process.env.CLICK_CHECKOUT_URL || 'https://my.click.uz/services/pay'}?transaction_param=${order.id}`
          : `/sandbox-checkout?order=${order.id}`;

    return { order, payment, checkoutUrl };
  }

  public processPaymentCallback(params: {
    provider: PaymentProvider;
    orderId: string;
    providerTxId: string;
    status: 'PAID' | 'FAILED' | 'CANCELLED';
    signatureValid: boolean;
    payloadSummary: string;
  }): { order: OrderRecord; payment: PaymentRecord; user: UserProfile } {
    const now = Date.now();
    this.data.paymentEvents.unshift({
      id: `pe_${crypto.randomBytes(5).toString('hex')}`,
      provider: params.provider,
      eventType: `CALLBACK_${params.status}`,
      orderId: params.orderId,
      providerTxId: params.providerTxId,
      signatureValid: params.signatureValid,
      payloadSummary: params.payloadSummary.slice(0, 300),
      createdAt: now,
    });
    if (this.data.paymentEvents.length > 300) {
      this.data.paymentEvents = this.data.paymentEvents.slice(0, 300);
    }

    if (!params.signatureValid) {
      this.save();
      throw new Error('Invalid payment callback signature');
    }

    const order = this.data.orders.find((o) => o.id === params.orderId);
    if (!order) throw new Error('Order not found');
    const payment = this.data.payments.find((p) => p.orderId === order.id);
    if (!payment) throw new Error('Payment record not found');
    const user = this.findUserById(order.userId);
    if (!user) throw new Error('User not found');

    // Idempotent guard: if already PAID, return cleanly without double-granting
    if (order.status === 'PAID') {
      return { order, payment, user: this.sanitizeUser(user) };
    }

    if (params.status === 'FAILED' || params.status === 'CANCELLED') {
      order.status = params.status;
      order.updatedAt = now;
      payment.status = params.status;
      payment.providerTxId = params.providerTxId || payment.providerTxId;
      this.addAuditLog(user.id, user.username, `PAYMENT_${params.status}`, `Order ${order.id} (${order.amountUzs} UZS)`, 'WARN');
      this.save();
      return { order, payment, user: this.sanitizeUser(user) };
    }

    // Atomic fulfillment for PAID order
    order.status = 'PAID';
    order.updatedAt = now;
    payment.status = 'PAID';
    payment.providerTxId = params.providerTxId || payment.providerTxId;
    payment.paidAt = now;

    if (order.orderType === 'VIP_PLAN') {
      const plan = this.data.vipPlans.find((p) => p.id === order.referenceId);
      const durationDays = plan?.durationDays ?? 30;
      const baseTime =
        user.subscription.status === 'ACTIVE' && user.subscription.expiresAt && user.subscription.expiresAt > now
          ? user.subscription.expiresAt
          : now;
      const expiresAt = baseTime + durationDays * 24 * 60 * 60 * 1000;
      user.subscription = {
        tier: 'ELITE',
        status: 'ACTIVE',
        provider: params.provider,
        verified: true,
        expiresAt,
      };
      this.data.subscriptions.unshift({
        id: `sub_${crypto.randomBytes(5).toString('hex')}`,
        userId: user.id,
        planId: order.referenceId,
        planName: plan?.name.uz || order.itemName,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        orderId: order.id,
        provider: params.provider,
        createdAt: now,
      });
    } else {
      const product = this.data.shopProducts.find((p) => p.id === order.referenceId);
      if (product) {
        if (!user.ownedCosmetics.includes(product.id)) {
          user.ownedCosmetics.push(product.id);
        }
        user.equippedCosmetics[product.category] = product.id;
        if (!this.data.inventory.some((inv) => inv.userId === user.id && inv.productId === product.id)) {
          this.data.inventory.unshift({
            id: `inv_${crypto.randomBytes(5).toString('hex')}`,
            userId: user.id,
            productId: product.id,
            category: product.category,
            orderId: order.id,
            acquiredAt: now,
          });
        }
        if (user.ownedCosmetics.length >= 3) {
          this.unlockAchievement(user, 'fashion_collector');
        }
      }
    }

    this.addAuditLog(
      user.id,
      user.username,
      'PAYMENT_PAID',
      `Order ${order.id} paid via ${params.provider} (${order.amountUzs} UZS)`
    );
    this.save();
    return { order, payment, user: this.sanitizeUser(user) };
  }

  public requestOrderRefund(userId: string, orderId: string, reason: string): OrderRecord {
    const order = this.data.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!order) throw new Error('Order not found');
    if (order.status !== 'PAID') throw new Error('Only paid orders can be refunded');
    order.status = 'REFUND_REQUESTED';
    order.refundReason = reason.slice(0, 240);
    order.updatedAt = Date.now();
    this.addAuditLog(userId, order.username, 'REFUND_REQUESTED', `Order ${order.id}: ${order.refundReason}`, 'WARN');
    this.save();
    return order;
  }

  public adminResolveRefund(
    orderId: string,
    approve: boolean,
    actor: { id: string; username: string }
  ): OrderRecord {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const payment = this.data.payments.find((p) => p.orderId === order.id);
    const user = this.findUserById(order.userId);
    const now = Date.now();

    if (approve) {
      order.status = 'REFUNDED';
      order.updatedAt = now;
      if (payment) payment.status = 'REFUNDED';
      if (user) {
        if (order.orderType === 'VIP_PLAN') {
          user.subscription = { tier: 'FREE', status: 'CANCELLED', verified: false };
          for (const sub of this.data.subscriptions) {
            if (sub.orderId === order.id) sub.status = 'REFUNDED';
          }
        } else {
          user.ownedCosmetics = user.ownedCosmetics.filter((id) => id !== order.referenceId);
          for (const [cat, pid] of Object.entries(user.equippedCosmetics)) {
            if (pid === order.referenceId) delete user.equippedCosmetics[cat as CosmeticCategory];
          }
          this.data.inventory = this.data.inventory.filter(
            (inv) => !(inv.userId === user.id && inv.productId === order.referenceId)
          );
        }
      }
      this.addAuditLog(actor.id, actor.username, 'REFUND_APPROVED', `Refunded order ${order.id} (${order.amountUzs} UZS)`, 'CRITICAL');
    } else {
      order.status = 'PAID';
      order.updatedAt = now;
      this.addAuditLog(actor.id, actor.username, 'REFUND_REJECTED', `Rejected refund for order ${order.id}`, 'INFO');
    }

    this.save();
    return order;
  }

  public getOrders(userId?: string): OrderRecord[] {
    if (!userId) return this.data.orders.slice(0, 200);
    return this.data.orders.filter((o) => o.userId === userId).slice(0, 100);
  }

  public getPayments(userId?: string): PaymentRecord[] {
    if (!userId) return this.data.payments.slice(0, 200);
    return this.data.payments.filter((p) => p.userId === userId).slice(0, 100);
  }

  public getPaymentEvents(): PaymentEventRecord[] {
    return this.data.paymentEvents.slice(0, 100);
  }

  public getSubscriptions(userId?: string): SubscriptionRecord[] {
    if (!userId) return this.data.subscriptions.slice(0, 200);
    return this.data.subscriptions.filter((s) => s.userId === userId).slice(0, 50);
  }

  // ======================== 15-MODULE ADMIN CONTROL CENTER ========================

  public recordSystemEvent(
    eventType: SystemEventRecord['eventType'],
    severity: SystemEventRecord['severity'],
    source: string,
    message: string
  ) {
    this.data.systemEvents.unshift({
      id: `sys_${crypto.randomBytes(5).toString('hex')}`,
      eventType,
      severity,
      source,
      message: message.slice(0, 300),
      createdAt: Date.now(),
    });
    if (this.data.systemEvents.length > 300) {
      this.data.systemEvents = this.data.systemEvents.slice(0, 300);
    }
    this.save();
  }

  public getSystemEvents(): SystemEventRecord[] {
    return this.data.systemEvents;
  }

  public getAdminRoles(): AdminRoleDef[] {
    return this.data.adminRoles;
  }

  public hasAdminPermission(
    user: UserProfile,
    moduleId: AdminModuleId,
    action: keyof ModulePermissionSet
  ): boolean {
    if (user.role !== 'ADMIN') return false;
    const roleSlug: AdminRoleSlug = user.adminRole || 'SUPER_ADMIN';
    if (roleSlug === 'SUPER_ADMIN') return true;
    const roleDef = this.data.adminRoles.find((r) => r.slug === roleSlug);
    if (!roleDef) return false;
    return Boolean(roleDef.permissions[moduleId]?.[action]);
  }

  public updateAdminRolePermissions(
    slug: AdminRoleSlug,
    moduleId: AdminModuleId,
    perms: Partial<ModulePermissionSet>,
    actor: { id: string; username: string }
  ): AdminRoleDef {
    const roleDef = this.data.adminRoles.find((r) => r.slug === slug);
    if (!roleDef) throw new Error('Admin role not found');
    roleDef.permissions[moduleId] = { ...roleDef.permissions[moduleId], ...perms };
    this.addAuditLog(actor.id, actor.username, 'ADMIN_PERMISSIONS_UPDATED', `${slug} -> ${moduleId}`, 'WARN');
    this.save();
    return roleDef;
  }

  public assignAdminRole(
    targetUserId: string,
    role: 'USER' | 'ADMIN',
    adminRole: AdminRoleSlug | undefined,
    actor: { id: string; username: string }
  ): UserProfile {
    const user = this.findUserById(targetUserId);
    if (!user) throw new Error('User not found');
    user.role = role;
    user.adminRole = role === 'ADMIN' ? adminRole || 'MODERATOR' : undefined;
    this.addAuditLog(
      actor.id,
      actor.username,
      'ADMIN_ROLE_ASSIGNED',
      `Set ${user.username} to ${role}${user.adminRole ? ` (${user.adminRole})` : ''}`,
      'CRITICAL'
    );
    this.save();
    return this.sanitizeUser(user);
  }

  public suspendUser(
    userId: string,
    hours: number,
    reason: string,
    actor: { id: string; username: string }
  ): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'ADMIN') throw new Error('Cannot suspend an administrator');
    user.suspendedUntil = Date.now() + Math.max(1, hours) * 3600000;
    user.banReason = reason || 'Temporary suspension';
    this.addAuditLog(actor.id, actor.username, 'USER_SUSPENDED', `Suspended ${user.username} for ${hours}h`, 'WARN');
    this.save();
    return this.sanitizeUser(user);
  }

  public restoreUser(userId: string, actor: { id: string; username: string }): UserProfile {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.isBanned = false;
    user.banReason = undefined;
    user.suspendedUntil = undefined;
    user.isFlagged = false;
    user.flagReason = undefined;
    this.addAuditLog(actor.id, actor.username, 'USER_RESTORED', `Restored account ${user.username}`, 'INFO');
    this.save();
    return this.sanitizeUser(user);
  }

  public getNotifications(): AdminNotificationRecord[] {
    return this.data.notifications;
  }

  public sendAdminNotification(
    input: {
      title: string;
      content: string;
      audience: AdminNotificationRecord['audience'];
      targetUserIds?: string[];
      scheduledAt?: number;
    },
    actor: { id: string; username: string }
  ): AdminNotificationRecord {
    const now = Date.now();
    // Prevent accidental duplicate announcement within 60 seconds
    const duplicate = this.data.notifications.find(
      (n) => n.title === input.title && n.content === input.content && now - n.createdAt < 60000
    );
    if (duplicate) throw new Error('Duplicate announcement blocked (sent within last 60s)');

    let targets = this.data.users.filter((u) => !u.isBanned);
    if (input.audience === 'VIP') {
      targets = targets.filter((u) => u.subscription.status === 'ACTIVE');
    } else if (input.audience === 'SELECTED' && input.targetUserIds?.length) {
      const set = new Set(input.targetUserIds);
      targets = targets.filter((u) => set.has(u.id));
    }

    const isScheduled = Boolean(input.scheduledAt && input.scheduledAt > now);
    const record: AdminNotificationRecord = {
      id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
      title: input.title.slice(0, 120),
      content: input.content.slice(0, 500),
      audience: input.audience,
      targetUserIds: input.targetUserIds || [],
      status: isScheduled ? 'SCHEDULED' : 'SENT',
      recipientCount: targets.length,
      createdBy: actor.username,
      scheduledAt: input.scheduledAt,
      createdAt: now,
    };

    if (!isScheduled) {
      for (const u of targets) {
        u.notifications = u.notifications || [];
        u.notifications.unshift({
          id: `${record.id}_${u.id}`,
          title: record.title,
          message: record.content,
          createdAt: now,
          read: false,
        });
        if (u.notifications.length > 30) u.notifications = u.notifications.slice(0, 30);
      }
    }

    this.data.notifications.unshift(record);
    this.addAuditLog(actor.id, actor.username, 'NOTIFICATION_SENT', `${record.audience}: ${record.title} (${record.recipientCount} users)`);
    this.save();
    return record;
  }

  public getRoleConfigs(): RoleConfigOverride[] {
    return this.data.roleConfigs;
  }

  public saveRoleConfig(
    input: Partial<RoleConfigOverride> & { roleId: RoleId },
    actor: { id: string; username: string }
  ): RoleConfigOverride {
    const existing = this.data.roleConfigs.find((r) => r.roleId === input.roleId);
    const now = Date.now();
    if (existing) {
      if (input.name) existing.name = input.name;
      if (input.description) existing.description = input.description;
      if (input.abilityName) existing.abilityName = input.abilityName;
      if (input.team) existing.team = input.team;
      if (input.rarity) existing.rarity = input.rarity;
      if (typeof input.imageUrl === 'string') existing.imageUrl = input.imageUrl;
      if (typeof input.isActive === 'boolean') existing.isActive = input.isActive;
      existing.updatedAt = now;
      this.addAuditLog(actor.id, actor.username, 'ROLE_CONFIG_UPDATED', `Updated role ${existing.roleId}`);
      this.save();
      return existing;
    }
    const created: RoleConfigOverride = {
      roleId: input.roleId,
      name: input.name,
      description: input.description,
      abilityName: input.abilityName,
      team: input.team,
      rarity: input.rarity,
      imageUrl: input.imageUrl,
      isActive: input.isActive ?? true,
      updatedAt: now,
    };
    this.data.roleConfigs.push(created);
    this.addAuditLog(actor.id, actor.username, 'ROLE_CONFIG_CREATED', `Configured role ${created.roleId}`);
    this.save();
    return created;
  }

  public getWebsiteSettings(): WebsiteSettings {
    return this.data.websiteSettings;
  }

  public saveWebsiteSettings(
    partial: Partial<WebsiteSettings>,
    actor: { id: string; username: string }
  ): WebsiteSettings {
    this.data.websiteSettings = {
      ...this.data.websiteSettings,
      ...partial,
      socialLinks: {
        ...this.data.websiteSettings.socialLinks,
        ...(partial.socialLinks || {}),
      },
      updatedAt: Date.now(),
    };
    this.addAuditLog(actor.id, actor.username, 'WEBSITE_SETTINGS_UPDATED', 'Updated website settings & translations', 'WARN');
    this.save();
    return this.data.websiteSettings;
  }

  public getPromoRedemptions(): PromoRedemptionRecord[] {
    return this.data.promoRedemptions;
  }

  public deleteCampaign(id: string, actor: { id: string; username: string }): void {
    this.data.campaigns = this.data.campaigns.filter((c) => c.id !== id);
    this.addAuditLog(actor.id, actor.username, 'CAMPAIGN_DELETED', `Deleted promo ${id}`, 'WARN');
    this.save();
  }

  public listBackups(): { file: string; sizeBytes: number; createdAt: number }[] {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) return [];
    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { file: f, sizeBytes: stat.size, createdAt: stat.mtimeMs };
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  }

  public getAnalytics(rangeDays = 30) {
    const now = Date.now();
    const cutoff = now - rangeDays * 86400000;
    const dayMs = 86400000;
    const dau = this.data.users.filter((u) => u.lastSeenAt >= now - dayMs).length;
    const wau = this.data.users.filter((u) => u.lastSeenAt >= now - 7 * dayMs).length;
    const mau = this.data.users.filter((u) => u.lastSeenAt >= now - 30 * dayMs).length;

    const paidOrders = this.data.orders.filter((o) => o.createdAt >= cutoff && (o.status === 'PAID' || o.status === 'REFUND_REQUESTED'));
    const refundedOrders = this.data.orders.filter((o) => o.createdAt >= cutoff && o.status === 'REFUNDED');
    const grossRevenueUzs = paidOrders.reduce((s, o) => s + o.amountUzs, 0);
    const refundedUzs = refundedOrders.reduce((s, o) => s + o.amountUzs, 0);
    const estimatedGatewayFeeUzs = Math.round(grossRevenueUzs * 0.02);
    const netRevenueUzs = Math.max(0, grossRevenueUzs - refundedUzs - estimatedGatewayFeeUzs);

    const modeCounts: Record<string, number> = { CLASSIC: 0, ADVANCED: 0, CHAOS: 0 };
    const roleCounts: Record<string, number> = {};
    let totalDurationSec = 0;
    const recentGames = this.data.history.filter((h) => h.endedAt >= cutoff);
    for (const g of recentGames) {
      modeCounts[g.mode] = (modeCounts[g.mode] || 0) + 1;
      totalDurationSec += g.durationSec;
      for (const p of g.players) {
        roleCounts[p.roleId] = (roleCounts[p.roleId] || 0) + 1;
      }
    }

    const dailyBuckets: { day: string; registrations: number; revenueUzs: number; orders: number }[] = [];
    for (let i = Math.min(rangeDays, 30) - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      const end = start + dayMs;
      const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const regs = this.data.users.filter((u) => u.createdAt >= start && u.createdAt < end).length;
      const dayPaid = this.data.orders.filter(
        (o) => o.createdAt >= start && o.createdAt < end && (o.status === 'PAID' || o.status === 'REFUND_REQUESTED')
      );
      dailyBuckets.push({
        day: label,
        registrations: regs,
        revenueUzs: dayPaid.reduce((s, o) => s + o.amountUzs, 0),
        orders: dayPaid.length,
      });
    }

    return {
      rangeDays,
      dau,
      wau,
      mau,
      grossRevenueUzs,
      refundedUzs,
      estimatedGatewayFeeUzs,
      netRevenueUzs,
      avgGameDurationSec: recentGames.length > 0 ? Math.round(totalDurationSec / recentGames.length) : 0,
      modePopularity: Object.entries(modeCounts).map(([mode, count]) => ({ mode, count })),
      topRoles: Object.entries(roleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([roleId, count]) => ({ roleId, count })),
      dailySeries: dailyBuckets,
    };
  }
}

export const store = new PersistentStore();

