import { AiKnowledgeArticle, BattlePassLevel, SeasonRecord } from './types';

export function createDefaultSeason1(now = Date.now()): SeasonRecord {
  const levels: BattlePassLevel[] = [];
  for (let i = 1; i <= 30; i++) {
    levels.push({
      level: i,
      xpRequired: i * 350,
      freeReward:
        i % 5 === 0
          ? {
              type: 'AVATAR',
              itemId: i === 30 ? 'av_cyber_detective' : 'av_crimson_don',
              label: {
                uz: i === 30 ? 'Eksklyuziv Kiber Detektiv Avatari' : 'Qizil Don Avatari',
                ru: i === 30 ? 'Эксклюзивный аватар Кибер-детектив' : 'Аватар Алый Дон',
              },
            }
          : {
              type: 'GOLD',
              amount: 100 + i * 20,
              label: { uz: `${100 + i * 20} Oltin`, ru: `${100 + i * 20} Золота` },
            },
      vipReward:
        i % 10 === 0
          ? {
              type: 'FRAME',
              itemId: i === 30 ? 'fr_imperial_gold' : 'fr_amethyst_aura',
              label: {
                uz: i === 30 ? 'Afsonaviy Imperator Oltin Ramkasi' : 'Ametist Aura Ramkasi',
                ru: i === 30 ? 'Легендарная рамка Императорское золото' : 'Рамка Аметистовая аура',
              },
            }
          : i % 3 === 0
            ? {
                type: 'DIAMONDS',
                amount: 5 + Math.floor(i / 5) * 2,
                label: {
                  uz: `${5 + Math.floor(i / 5) * 2} Olmos`,
                  ru: `${5 + Math.floor(i / 5) * 2} Алмазов`,
                },
              }
            : {
                type: 'GOLD',
                amount: 250 + i * 35,
                label: { uz: `${250 + i * 35} Oltin`, ru: `${250 + i * 35} Золота` },
              },
    });
  }

  return {
    id: 'season_1',
    number: 1,
    title: {
      uz: '1-Mavsum: Qonli Tutilish',
      ru: 'Сезон 1: Кровавое Затмение',
    },
    description: {
      uz: '30 bosqichli Battle Pass, eksklyuziv avatarlar, oltin va VIP olmos mukofotlari!',
      ru: '30 уровней Battle Pass, эксклюзивные аватары, золото и VIP-награды с алмазами!',
    },
    startsAt: now - 86400000 * 5,
    endsAt: now + 86400000 * 55, // 60 days season
    isActive: true,
    levels,
    totalXpPerLevel: 350,
  };
}

export const DEFAULT_KNOWLEDGE_ARTICLES: AiKnowledgeArticle[] = [
  {
    id: 'kb_rules_overview',
    category: 'RULES',
    title: {
      uz: 'MAFIA PRO o‘yin qoidalari va fazalari',
      ru: 'Правила игры и фазы в MAFIA PRO',
    },
    content: {
      uz: 'MAFIA PRO o‘yini navbatma-navbat kechadigan 4 ta asosiy fazadan iborat:\n1. Tanishuv (Day 1 / Discussion): O‘yinchilar bir-birlari bilan tanishadi, o‘z taxminlarini aytadi.\n2. Kecha (Night): Maxfiy rollar (Mafiya, Sherif, Shifokor, Soqchi, Jodugar va h.k.) o‘z qobiliyatlarini amalga oshiradi.\n3. Munozara (Discussion / Day): Kechasi kim o‘ldirilgani, tergov natijalari va gumonlar muhokama qilinadi.\n4. Ovoz berish (Voting): Shahar fuqarolari eng ko‘p ovoz to‘plagan gumondorni qatl qilish (yoki o‘tkazib yuborish - Skip) uchun ovoz beradi.',
      ru: 'Игра MAFIA PRO состоит из 4 основных фаз:\n1. Знакомство (День 1 / Дискуссия): Игроки общаются и делятся подозрениями.\n2. Ночь (Night): Тайные роли (Мафия, Шериф, Доктор, Телохранитель и т.д.) применяют свои ночные способности.\n3. Обсуждение (Day): Город узнает о ночных событиях, обсуждает улики и делится версиями.\n4. Голосование (Voting): Горожане выбирают подозреваемого для казни или пропускают голосование (Skip).',
    },
    tags: ['qoidalar', 'fazalar', 'kecha', 'kunduz', 'ovoz berish', 'правила', 'фазы'],
  },
  {
    id: 'kb_sheriff_guide',
    category: 'ROLES',
    title: {
      uz: 'Sherif roli va Tergov tizimi qo‘llanmasi',
      ru: 'Гайд по роли Шерифа и системе расследований',
    },
    content: {
      uz: 'Sherif — Shahar jamoasining eng muhim tergovchisi. Kechasi istalgan tirik o‘yinchining kartasidagi "🔍 Tekshirish" tugmasini bosib uni tekshiradi.\nTekshiruv natijasi:\n- 🚨 SHUBHALI: O‘yinchi Mafiya yoki Yovuz qotil (Serial Killer).\n- 🛡️ TOZA: O‘yinchi Begunoh shahar fuqarosi.\nBarcha natijalar chap paneldagi "Tergov Daftarchasi"da avtomatik saqlanadi. Eslatma: Mafiya Doni tergovda "Toza" ko‘rinadi, Framer esa begunohni "Shubhali" qilib qo‘yishi mumkin!',
      ru: 'Шериф — ключевой следователь Города. Ночью он нажимает кнопку "🔍 Проверить" на карточке игрока.\nРезультат проверки:\n- 🚨 ПОДОЗРИТЕЛЬНЫЙ: Игрок принадлежит к Мафии или является Маньяком.\n- 🛡️ НЕВИНЕН: Игрок мирный житель Города.\nВсе результаты сохраняются в "Досье расследований". Внимание: Дон мафии при проверке выглядит "Невинным", а Фреймер может подставить мирного!',
    },
    tags: ['sherif', 'tergov', 'daftarcha', 'mafiya', 'шериф', 'дознание'],
  },
  {
    id: 'kb_vip_benefits',
    category: 'VIP',
    title: {
      uz: 'VIP obuna imtiyozlari va obuna rejalari',
      ru: 'Привилегии VIP-подписки и тарифные планы',
    },
    content: {
      uz: 'VIP obunachilar quyidagi afzalliklarga ega:\n- Ism yonida nufuzli oltin VIP nishoni.\n- Eksklyuziv profil ramkalari va animatsion avatarlar.\n- VIP xona mavzulari va Battle Pass VIP yo‘lagidagi barcha mukofotlarni ochish huquqi.\n- Kengaytirilgan o‘yin statistikasi va 0 reklama.\nRejalar: Oylik (15,000 UZS), Choraklik (39,000 UZS) va Yillik (129,000 UZS). To‘lovlar Payme, Click va Sandbox orqali amalga oshiriladi.',
      ru: 'Владельцы VIP получают:\n- Престижный золотой VIP значок рядом с именем.\n- Эксклюзивные рамки профиля и анимированные аватары.\n- VIP темы комнат и доступ к премиальной ветке Battle Pass.\n- Расширенная статистика и полное отсутствие рекламы.\nТарифы: Месяц (15,000 UZS), Квартал (39,000 UZS) и Год (129,000 UZS). Оплата через Payme, Click и Sandbox.',
    },
    tags: ['vip', 'obuna', 'tariflar', 'click', 'payme', 'подписка', 'вип'],
  },
  {
    id: 'kb_clans_guide',
    category: 'CLANS',
    title: {
      uz: 'Klanlar (Gildiyalar) tizimi va boshqaruv',
      ru: 'Система Кланов (Гильдий) и управление',
    },
    content: {
      uz: 'Klan tizimi o‘yinchilarni jamoalarga birlashtiradi:\n- Har bir klan o‘z nomi, noyob tegi (masalan: [DON], [UZB]), logotipi va darajasiga ega.\n- Klan a’zolari o‘yinlarda qatnashib klanga reyting va tajriba ballari olib keladi.\n- Klanlar ro‘yxati va Klan Reytingi Social sahifasida mavjud.\n- Klan rahbari va ofitserlari yangi a’zolarni taklif qilishi yoki arizalarni qabul qilishi mumkin.',
      ru: 'Клановая система объединяет игроков:\n- Каждый клан имеет название, уникальный тег (например: [DON]), эмблему и уровень.\n- Участники зарабатывают очки рейтинга и опыт для клана в матчах.\n- Список и лидерборд кланов доступны в разделе Сообщество.\n- Лидер и офицеры могут приглашать игроков и одобрять заявки.',
    },
    tags: ['klan', 'gildiya', 'teg', 'reyting', 'клан', 'гильдии'],
  },
  {
    id: 'kb_elo_rankings',
    category: 'RULES',
    title: {
      uz: 'Elo Reyting tizimi va darajalar (Tiers)',
      ru: 'Рейтинговая система Elo и ранговые дивизионы',
    },
    content: {
      uz: 'MAFIA PRO da Elo reytingi rasmiy matematik model asosida hisoblanadi (boshlang‘ich 1000 ball):\n- Bronza (Bronze): 0 - 1049\n- Kumush (Silver): 1050 - 1199\n- Oltin (Gold): 1200 - 1399\n- Olmos (Diamond): 1400 - 1649\n- Master / Grandmaster: 1650 - 1999\n- Afsona (Legend): 2000+\nReyting har bir rasmiy o‘yindagi g‘alaba, mag‘lubiyat va omon qolishga qarab adolatli yangilanadi.',
      ru: 'Рейтинг Elo в MAFIA PRO рассчитывается на сервере по официальной формуле (старт с 1000):\n- Бронза: 0 - 1049\n- Серебро: 1050 - 1199\n- Золото: 1200 - 1399\n- Алмаз: 1400 - 1649\n- Мастер / Грандмастер: 1650 - 1999\n- Легенда: 2000+\nРейтинг обновляется справедливо по результатам каждого рейтингового матча.',
    },
    tags: ['elo', 'reyting', 'daraja', 'olmos', 'oltin', 'рейтинг'],
  },
  {
    id: 'kb_voice_troubleshooting',
    category: 'TROUBLESHOOTING',
    title: {
      uz: 'Ovozli chat va mikrofon sozlamalari',
      ru: 'Настройка голосового чата и микрофона',
    },
    content: {
      uz: 'Ovozli chatda muammo bo‘lsa:\n1. Brauzer sozlamalarida mikrofon ruxsati berilganligini tekshiring.\n2. O‘yinda Ovoz paneli (Mute/Unmute) orqali mikrofon holatini tekshiring.\n3. Esda tuting: Tunda faqat Mafiya a’zolari o‘zaro gaplasha oladi, boshqa rollar uchun ovoz vaqtincha jim qilinadi.\n4. Qamoqqa olingan yoki Jim qilingan (Silenced) o‘yinchilar ovoz chiqara olmaydi.',
      ru: 'Если возникли трудности с голосовым чатом:\n1. Проверьте разрешение на микрофон в настройках браузера.\n2. Проверьте статус микрофона в панели голоса.\n3. Помните: Ночью общаться голосом могут только члены Мафии, остальные заглушаются.\n4. Игроки под арестом или в молчанке не могут говорить в фазу дня.',
    },
    tags: ['ovoz', 'mikrofon', 'chat', 'muammo', 'голос', 'микрофон'],
  },
];
