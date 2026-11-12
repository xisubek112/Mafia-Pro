import {
  CosmeticItem,
  GameMode,
  MissionDef,
  TournamentFormat,
  TournamentMatch,
} from './types';

export const COUNTRIES = [
  { code: 'UZ', name: { uz: 'O‘zbekiston', ru: 'Узбекистан' } },
  { code: 'RU', name: { uz: 'Rossiya', ru: 'Россия' } },
  { code: 'KZ', name: { uz: 'Qozog‘iston', ru: 'Казахстан' } },
  { code: 'KG', name: { uz: 'Qirg‘iziston', ru: 'Киргизия' } },
  { code: 'TR', name: { uz: 'Turkiya', ru: 'Турция' } },
  { code: 'US', name: { uz: 'AQSH', ru: 'США' } },
  { code: 'GLOBAL', name: { uz: 'Boshqa', ru: 'Другая' } },
];

export const DAILY_REWARD_CALENDAR = [
  { day: 1, gold: 50, diamonds: 0, xp: 40, special: false },
  { day: 2, gold: 80, diamonds: 0, xp: 60, special: false },
  { day: 3, gold: 120, diamonds: 2, xp: 80, special: false },
  { day: 4, gold: 160, diamonds: 0, xp: 100, special: false },
  { day: 5, gold: 220, diamonds: 3, xp: 140, special: false },
  { day: 6, gold: 300, diamonds: 5, xp: 180, special: false },
  { day: 7, gold: 500, diamonds: 15, xp: 350, special: true },
];

export const MISSIONS: MissionDef[] = [
  {
    id: 'daily_play_2',
    period: 'DAILY',
    name: { uz: 'Kunlik Jangchi', ru: 'Боец дня' },
    description: { uz: 'Bugun 2 ta o‘yin o‘tkazing', ru: 'Сыграйте 2 матча сегодня' },
    metric: 'GAMES_PLAYED',
    target: 2,
    xpReward: 120,
    goldReward: 80,
  },
  {
    id: 'daily_win_1',
    period: 'DAILY',
    name: { uz: 'Kunlik G‘alaba', ru: 'Победа дня' },
    description: { uz: 'Bugun kamida 1 ta o‘yinda g‘alaba qozoning', ru: 'Одержите минимум 1 победу сегодня' },
    metric: 'WINS',
    target: 1,
    xpReward: 180,
    goldReward: 120,
    diamondReward: 2,
  },
  {
    id: 'daily_survive_1',
    period: 'DAILY',
    name: { uz: 'Tundan Omon', ru: 'Пережить ночь' },
    description: { uz: '1 ta o‘yinda oxirigacha tirik qoling', ru: 'Выживите до конца в 1 матче' },
    metric: 'SURVIVED',
    target: 1,
    xpReward: 140,
    goldReward: 90,
  },
  {
    id: 'weekly_play_7',
    period: 'WEEKLY',
    name: { uz: 'Haftalik Faollik', ru: 'Недельная активность' },
    description: { uz: 'Hafta davomida 7 ta o‘yin o‘tkazing', ru: 'Сыграйте 7 матчей за неделю' },
    metric: 'GAMES_PLAYED',
    target: 7,
    xpReward: 450,
    goldReward: 350,
    diamondReward: 5,
  },
  {
    id: 'weekly_win_4',
    period: 'WEEKLY',
    name: { uz: 'Hafta Chempioni', ru: 'Чемпион недели' },
    description: { uz: 'Hafta davomida 4 ta g‘alaba qozoning', ru: 'Одержите 4 победы за неделю' },
    metric: 'WINS',
    target: 4,
    xpReward: 600,
    goldReward: 500,
    diamondReward: 10,
  },
  {
    id: 'weekly_tournament',
    period: 'WEEKLY',
    name: { uz: 'Turnir Ruhi', ru: 'Турнирный дух' },
    description: { uz: 'Turnirga ro‘yxatdan o‘ting', ru: 'Зарегистрируйтесь на турнир' },
    metric: 'TOURNAMENT_JOIN',
    target: 1,
    xpReward: 300,
    goldReward: 250,
    diamondReward: 5,
  },
];

export const COSMETICS: CosmeticItem[] = [
  // AVATARS
  {
    id: 'av_crimson_don',
    category: 'AVATAR',
    name: { uz: 'Qizil Don', ru: 'Алый Дон' },
    description: { uz: 'Klassik qizil va oltin niqob', ru: 'Классическая ало-золотая маска' },
    priceGold: 150,
    rarity: 'COMMON',
    previewColor: '#E63946',
  },
  {
    id: 'av_cyber_detective',
    category: 'AVATAR',
    name: { uz: 'Kiber Detektiv', ru: 'Кибер-детектив' },
    description: { uz: 'Neon ko‘zoynakli izquvar', ru: 'Сыщик в неоновых очках' },
    priceGold: 350,
    rarity: 'RARE',
    previewColor: '#38BDF8',
  },
  {
    id: 'av_obsidian_king',
    category: 'AVATAR',
    name: { uz: 'Obsidian Qirol', ru: 'Обсидиановый Король' },
    description: { uz: 'Elita a’zolari uchun maxsus tojli avatar', ru: 'Эксклюзивный аватар с короной для Элиты' },
    priceDiamonds: 25,
    rarity: 'LEGENDARY',
    premiumOnly: true,
    previewColor: '#E7B65B',
  },

  // PROFILE FRAMES
  {
    id: 'fr_crimson_edge',
    category: 'FRAME',
    name: { uz: 'Qonli Chegara', ru: 'Алая рамка' },
    description: { uz: 'Profil atrofidagi yorqin qizil nur', ru: 'Яркое алое свечение вокруг профиля' },
    priceGold: 200,
    rarity: 'COMMON',
    previewColor: '#E63946',
  },
  {
    id: 'fr_amethyst_aura',
    category: 'FRAME',
    name: { uz: 'Ametist Aura', ru: 'Аметистовая аура' },
    description: { uz: 'Sirli binafsha neon ramka', ru: 'Мистическая фиолетовая неоновая рамка' },
    priceGold: 450,
    rarity: 'EPIC',
    previewColor: '#A855F7',
  },
  {
    id: 'fr_imperial_gold',
    category: 'FRAME',
    name: { uz: 'Imperator Oltini', ru: 'Императорское золото' },
    description: { uz: 'ELITE a’zolar uchun oltin naqshli ramka', ru: 'Золотая узорчатая рамка для ELITE' },
    priceDiamonds: 30,
    rarity: 'LEGENDARY',
    premiumOnly: true,
    previewColor: '#FCD34D',
  },

  // CARD SKINS
  {
    id: 'cs_midnight_velvet',
    category: 'CARD_SKIN',
    name: { uz: 'Tungi Baxmal', ru: 'Полуночный бархат' },
    description: { uz: 'To‘q ko‘k va kumush karta orqasi', ru: 'Тёмно-синяя и серебряная рубашка карт' },
    priceGold: 250,
    rarity: 'RARE',
    previewColor: '#6366F1',
  },
  {
    id: 'cs_blood_eclipse',
    category: 'CARD_SKIN',
    name: { uz: 'Qonli Tutilish', ru: 'Кровавое затмение' },
    description: { uz: 'Qizil oy tasvirli maxfiy karta dizayni', ru: 'Дизайн карт с кровавой луной' },
    priceGold: 600,
    rarity: 'EPIC',
    previewColor: '#DC2626',
  },
  {
    id: 'cs_royal_obsidian',
    category: 'CARD_SKIN',
    name: { uz: 'Qirollik Obsidiani', ru: 'Королевский обсидиан' },
    description: { uz: 'Oltin folgali premium karta terisi', ru: 'Премиальный скин карт с золотой фольгой' },
    priceDiamonds: 40,
    rarity: 'LEGENDARY',
    previewColor: '#E7B65B',
  },

  // NAME EFFECTS
  {
    id: 'ne_gold_shine',
    category: 'NAME_EFFECT',
    name: { uz: 'Oltin Jilo', ru: 'Золотое сияние' },
    description: { uz: 'Ismingiz oltin rangda porlaydi', ru: 'Ваше имя сияет золотым оттенком' },
    priceGold: 300,
    rarity: 'RARE',
    previewColor: '#E7B65B',
  },
  {
    id: 'ne_crimson_flame',
    category: 'NAME_EFFECT',
    name: { uz: 'Qizil Alanga', ru: 'Алое пламя' },
    description: { uz: 'Lobbida va reytingda yorqin qizil effekt', ru: 'Огненный эффект имени в лобби и рейтинге' },
    priceDiamonds: 15,
    rarity: 'EPIC',
    previewColor: '#E63946',
  },

  // ANIMATED BADGES
  {
    id: 'bg_wolf_eye',
    category: 'BADGE',
    name: { uz: 'Bo‘ri Ko‘zi', ru: 'Волчий глаз' },
    description: { uz: 'Yirtqich intuitsiya nishoni', ru: 'Значок хищной интуиции' },
    priceGold: 220,
    rarity: 'RARE',
    previewColor: '#F59E0B',
  },
  {
    id: 'bg_phantom_crown',
    category: 'BADGE',
    name: { uz: 'Arvoh Toji', ru: 'Призрачная корона' },
    description: { uz: 'Harakatlanuvchi afsonaviy nishon', ru: 'Анимированный легендарный значок' },
    priceDiamonds: 20,
    rarity: 'LEGENDARY',
    previewColor: '#C084FC',
  },

  // VICTORY ANIMATIONS
  {
    id: 'va_golden_confetti',
    category: 'VICTORY_ANIM',
    name: { uz: 'Oltin Salut', ru: 'Золотой салют' },
    description: { uz: 'G‘alaba vaqtida oltin uchqunlar yog‘iladi', ru: 'Золотой салют при победе' },
    priceGold: 400,
    rarity: 'EPIC',
    previewColor: '#FCD34D',
  },
  {
    id: 'va_crimson_eclipse',
    category: 'VICTORY_ANIM',
    name: { uz: 'Mafiya Tantana', ru: 'Триумф Мафии' },
    description: { uz: 'Qizil va binafsha tantana effekti', ru: 'Эффект триумфа с алым и фиолетовым сиянием' },
    priceDiamonds: 35,
    rarity: 'LEGENDARY',
    premiumOnly: true,
    previewColor: '#E63946',
  },

  // LOBBY THEMES
  {
    id: 'lt_neon_noir',
    category: 'LOBBY_THEME',
    name: { uz: 'Neon Noir', ru: 'Неоновый нуар' },
    description: { uz: 'Kechki shahar chiroqlari lobbisi', ru: 'Тема лобби в стиле ночного неона' },
    priceGold: 350,
    rarity: 'RARE',
    previewColor: '#8B5CF6',
  },
  {
    id: 'lt_vip_mansion',
    category: 'LOBBY_THEME',
    name: { uz: 'VIP Qasr', ru: 'VIP Особняк' },
    description: { uz: 'ELITE a’zolar uchun hashamatli xona mavzusi', ru: 'Роскошная тема лобби для ELITE' },
    priceDiamonds: 30,
    rarity: 'LEGENDARY',
    premiumOnly: true,
    previewColor: '#E7B65B',
  },
];

export function getUtcDayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getUtcWeekKey(ts = Date.now()): string {
  const d = new Date(ts);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function calculateXpReward(won: boolean, survived: boolean, mode: GameMode): number {
  const modeBonus = mode === 'CHAOS' ? 30 : mode === 'ADVANCED' ? 15 : 0;
  if (won) return 150 + (survived ? 50 : 0) + modeBonus;
  return 45 + Math.floor(modeBonus / 2);
}

export function calculateGoldReward(won: boolean, survived: boolean, mode: GameMode): number {
  const modeBonus = mode === 'CHAOS' ? 15 : mode === 'ADVANCED' ? 10 : 0;
  if (won) return 60 + (survived ? 20 : 0) + modeBonus;
  return 20;
}

export function calculateRatingDelta(won: boolean, currentRating: number, playerCount: number): number {
  const scale = playerCount >= 10 ? 1.2 : 1;
  if (won) {
    const gain = currentRating < 1200 ? 28 : currentRating < 1600 ? 22 : 16;
    return Math.round(gain * scale);
  }
  const loss = currentRating > 1400 ? -18 : -12;
  return Math.max(-currentRating + 100, loss);
}

export function getCompetitiveRankName(rating: number, lang: 'uz' | 'ru'): string {
  if (rating >= 2000) return lang === 'uz' ? 'Afsona' : 'Легенда';
  if (rating >= 1650) return lang === 'uz' ? 'Grandmaster' : 'Грандмастер';
  if (rating >= 1400) return lang === 'uz' ? 'Olmos' : 'Алмаз';
  if (rating >= 1200) return lang === 'uz' ? 'Oltin' : 'Золото';
  if (rating >= 1050) return lang === 'uz' ? 'Kumush' : 'Серебро';
  return lang === 'uz' ? 'Bronza' : 'Бронза';
}

export function generateTournamentBracket(
  participants: string[],
  format: TournamentFormat,
  startTime = Date.now()
): TournamentMatch[] {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const matches: TournamentMatch[] = [];
  let matchCounter = 1;

  if (format === 'ROUND_ROBIN') {
    let round = 1;
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        matches.push({
          id: `tm_${matchCounter++}`,
          round,
          matchNumber: matches.length + 1,
          bracket: 'ROUND_ROBIN',
          player1Id: shuffled[i],
          player2Id: shuffled[j],
          status: 'PENDING',
          scheduledAt: startTime + round * 300000,
        });
        if (matches.length % Math.max(1, Math.floor(shuffled.length / 2)) === 0) {
          round++;
        }
      }
    }
    return matches;
  }

  // Single or Double Elimination Round 1
  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
    matches.push({
      id: `tm_${matchCounter++}`,
      round: 1,
      matchNumber: Math.floor(i / 2) + 1,
      bracket: 'WINNERS',
      player1Id: p1,
      player2Id: p2,
      winnerId: p2 ? undefined : p1,
      status: p2 ? 'PENDING' : 'COMPLETED',
      scheduledAt: startTime + 300000,
    });
  }

  // Pre-seed placeholder final if 2+ matches
  const round1Count = matches.length;
  if (round1Count > 1) {
    let currentRoundCount = round1Count;
    let round = 2;
    while (currentRoundCount > 1) {
      const nextCount = Math.ceil(currentRoundCount / 2);
      for (let m = 1; m <= nextCount; m++) {
        matches.push({
          id: `tm_${matchCounter++}`,
          round,
          matchNumber: m,
          bracket: format === 'DOUBLE_ELIMINATION' && nextCount === 1 ? 'GRAND_FINAL' : 'WINNERS',
          status: 'PENDING',
          scheduledAt: startTime + round * 600000,
        });
      }
      currentRoundCount = nextCount;
      round++;
    }
  }

  return matches;
}
