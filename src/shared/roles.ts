import { GameMode, RoleDefinition, RoleId } from './types';

export const ROLES: Record<RoleId, RoleDefinition> = {
  // ======================== MAFIA TEAM (7) ========================
  don: {
    id: 'don',
    team: 'MAFIA',
    name: { uz: 'Don', ru: 'Дон' },
    shortDesc: {
      uz: 'Mafiya oilasining rahbari. Tunda qurbonni tanlaydi va Sherifga fuqarodek ko‘rinishi mumkin.',
      ru: 'Глава семьи мафии. Выбирает жертву ночью и может казаться шерифу мирным жителем.',
    },
    abilityName: { uz: 'Qatl buyrug‘i', ru: 'Приказ на казнь' },
    abilityDesc: {
      uz: 'Har tunda mafiya nomidan bitta o‘yinchini yo‘q qilishga buyruq beradi. Sherif tekshiruvida Mafiya emasdek ko‘rinadi.',
      ru: 'Каждую ночь отдаёт приказ на устранение игрока от имени мафии. При проверке шерифом выглядит невиновным.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 40,
    winCondition: {
      uz: 'Mafiya a’zolari soni shaharliklar va neytrallarga tenglashganda yoki ulardan oshganda g‘alaba qozonadi.',
      ru: 'Побеждает, когда численность мафии сравняется с городом или превысит его.',
    },
    limitations: {
      uz: 'Doktor, Tansoqchi yoki Qo‘riqchi farishta tomonidan himoyalangan nishonni o‘ldira olmaydi.',
      ru: 'Не может убить цель, защищённую Доктором, Телохранителем или Ангелом-хранителем.',
    },
    modes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    minPlayers: 5,
    imageUrl: '/assets/roles/don.jpg',
  },
  mafia: {
    id: 'mafia',
    team: 'MAFIA',
    name: { uz: 'Mafiya', ru: 'Мафия' },
    shortDesc: {
      uz: 'Mafiya jamoasining asosiy a’zosi. Tunda jamoadoshlari bilan kelishib hujum qiladi.',
      ru: 'Основной член мафии. Ночью действует сообща с командой для устранения горожан.',
    },
    abilityName: { uz: 'Tungi hujum', ru: 'Ночное нападение' },
    abilityDesc: {
      uz: 'Don yo‘q bo‘lganda yoki u bilan birga tunda nishonga hujum qiladi.',
      ru: 'Атакует выбранную цель ночью вместе с Доном или вместо него.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 42,
    winCondition: {
      uz: 'Mafiya jamoasi shahar ustidan nazorat o‘rnatganda g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии при захвате контроля над городом.',
    },
    limitations: {
      uz: 'Sherif va Detektiv tekshiruvlarida Mafiya sifatida aniqlanadi.',
      ru: 'Обнаруживается Шерифом и Детективом как мафия.',
    },
    modes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    minPlayers: 5,
    imageUrl: '/assets/roles/mafia.jpg',
  },
  consigliere: {
    id: 'consigliere',
    team: 'MAFIA',
    name: { uz: 'Konsilyeri', ru: 'Консильери' },
    shortDesc: {
      uz: 'Mafiyaning maxfiy maslahatchisi. O‘yinchilarning aniq rolini aniqlaydi.',
      ru: 'Тайный советник мафии. Способен узнать точную роль любого игрока.',
    },
    abilityName: { uz: 'Maxfiy razvedka', ru: 'Тайная разведка' },
    abilityDesc: {
      uz: 'Har tunda bitta o‘yinchining aniq rolini bilib oladi.',
      ru: 'Каждую ночь узнаёт точную роль выбранного игрока.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 25,
    winCondition: {
      uz: 'Mafiya jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии.',
    },
    limitations: {
      uz: 'O‘zi yakka tartibda o‘ldira olmaydi (faqat mafiya qotili bo‘lmaganda).',
      ru: 'Не совершает убийств напрямую, пока живы другие бойцы мафии.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/consigliere.jpg',
  },
  silencer: {
    id: 'silencer',
    team: 'MAFIA',
    name: { uz: 'Shantajchi', ru: 'Шантажист' },
    shortDesc: {
      uz: 'Tunda tanlangan o‘yinchining ovozini o‘chiradi — u kunduzi gapira olmaydi.',
      ru: 'Лишает выбранного игрока права голоса и речи на следующий день.',
    },
    abilityName: { uz: 'Ovozni o‘chirish', ru: 'Запугивание' },
    abilityDesc: {
      uz: 'Tunda bir o‘yinchini qo‘rqitib, keyingi kunduzi chatda yozishini va ovoz berishini cheklaydi.',
      ru: 'Запрещает выбранной цели писать в дневном чате на следующий день.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 1,
    maxUses: -1,
    priority: 18,
    winCondition: {
      uz: 'Mafiya jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии.',
    },
    limitations: {
      uz: '1 tun sovish vaqti (cooldown) mavjud. Ketma-ket bir xil o‘yinchini o‘chira olmaydi.',
      ru: 'Имеет перезарядку в 1 ночь.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/silencer.jpg',
  },
  framer: {
    id: 'framer',
    team: 'MAFIA',
    name: { uz: 'Soxtalashtiruvchi', ru: 'Фальсификатор' },
    shortDesc: {
      uz: 'Tinch aholini Mafiya a’zosidek ko‘rsatish uchun soxta dalillar yaratadi.',
      ru: 'Подбрасывает улики, делая мирного игрока подозрительным для проверок.',
    },
    abilityName: { uz: 'Dalil soxtalashtirish', ru: 'Подлог улик' },
    abilityDesc: {
      uz: 'Tanlangan nishon shu tunda Sherif yoki Detektivga Mafiya bo‘lib ko‘rinadi.',
      ru: 'В эту ночь выбранная цель определяется проверками как член мафии.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 15,
    winCondition: {
      uz: 'Mafiya jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии.',
    },
    limitations: {
      uz: 'Ta’siri faqat o‘sha tungi tekshiruvlar uchun amal qiladi.',
      ru: 'Эффект действует только в течение текущей ночи.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/framer.jpg',
  },
  janitor: {
    id: 'janitor',
    team: 'MAFIA',
    name: { uz: 'Tozalovchi', ru: 'Уборщик' },
    shortDesc: {
      uz: 'Mafiya qurbonining rolini yashiradi, shaharliklar kim o‘lganini bilmay qoladi.',
      ru: 'Скрывает роль убитой цели от всего города.',
    },
    abilityName: { uz: 'Izlarni yo‘qotish', ru: 'Зачистка следов' },
    abilityDesc: {
      uz: 'Tunda tanlangan o‘yinchi o‘lsa, uning roli sir saqlanadi. Maksimal 2 marta ishlatiladi.',
      ru: 'Если выбранная цель погибает ночью, её роль остаётся скрытой. До 2 использований.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: 2,
    priority: 55,
    winCondition: {
      uz: 'Mafiya jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии.',
    },
    limitations: {
      uz: 'O‘yin davomida faqat 2 marta foydalanish mumkin.',
      ru: 'Ограничено 2 применениями за игру.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/janitor.jpg',
  },
  godfather: {
    id: 'godfather',
    team: 'MAFIA',
    name: { uz: 'Cho‘qintirgan Ota', ru: 'Крёстный отец' },
    shortDesc: {
      uz: 'Birinchi tungi hujumga chidamli yuqori martabali mafiya boshlig‘i.',
      ru: 'Неприкасаемый босс мафии с защитой от первой ночной атаки.',
    },
    abilityName: { uz: 'Po‘lat himoya va buyruq', ru: 'Железный авторитет' },
    abilityDesc: {
      uz: 'Tunda nishonni yo‘q qiladi va Sherif tekshiruvida begunoh ko‘rinadi.',
      ru: 'Отдаёт приказ об устранении и не определяется как мафия при проверке.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 39,
    winCondition: {
      uz: 'Mafiya jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой мафии.',
    },
    limitations: {
      uz: 'Kunduzgi ovoz berishda oddiy fuqarodek chiqarib yuborilishi mumkin.',
      ru: 'Уязвим к дневному голосованию города.',
    },
    modes: ['CHAOS'],
    minPlayers: 10,
    imageUrl: '/assets/roles/godfather.jpg',
  },

  // ======================== TOWN TEAM (13) ========================
  citizen: {
    id: 'citizen',
    team: 'TOWN',
    name: { uz: 'Fuqaro', ru: 'Мирный житель' },
    shortDesc: {
      uz: 'Oddiy shaharlik. Mantiq, muhokama va ovoz berish orqali mafiyani topadi.',
      ru: 'Обычный горожанин. Ищет мафию с помощью логики, дебатов и голосования.',
    },
    abilityName: { uz: 'Fuqarolik ovozi', ru: 'Голос гражданина' },
    abilityDesc: {
      uz: 'Maxsus tungi qobiliyatga ega emas, ammo kunduzgi ovoz berishda hal qiluvchi rol o‘ynaydi.',
      ru: 'Не имеет ночных способностей, но его голос днём решает судьбу города.',
    },
    actionPhase: 'PASSIVE',
    targetType: 'NONE',
    cooldown: 0,
    maxUses: 0,
    priority: 99,
    winCondition: {
      uz: 'Barcha mafiya va xavfli neytral rollar yo‘q qilinganda g‘alaba qozonadi.',
      ru: 'Побеждает после устранения всей мафии и враждебных нейтралов.',
    },
    limitations: {
      uz: 'Tunda himoyasiz.',
      ru: 'Беззащитен ночью.',
    },
    modes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    minPlayers: 5,
    imageUrl: '/assets/roles/citizen.jpg',
  },
  sheriff: {
    id: 'sheriff',
    team: 'TOWN',
    name: { uz: 'Sherif', ru: 'Шериф' },
    shortDesc: {
      uz: 'Shahar qonun posboni. Tunda o‘yinchining mafiya yoki begunoh ekanini tekshiradi.',
      ru: 'Страж закона. Проверяет игроков ночью на причастность к мафии.',
    },
    abilityName: { uz: 'Tungi tekshiruv', ru: 'Ночная проверка' },
    abilityDesc: {
      uz: 'Har tunda bitta o‘yinchini tekshirib, uning shubhali (Mafiya/Qotil) yoki tinch ekanini aniqlaydi.',
      ru: 'Каждую ночь проверяет одного игрока и узнаёт, подозрителен ли он.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 26,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Don, Cho‘qintirgan Ota va Soxtalashtiruvchi natijani chalg‘itishi mumkin.',
      ru: 'Дон, Крёстный отец и Фальсификатор могут исказить результат проверки.',
    },
    modes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    minPlayers: 5,
    imageUrl: '/assets/roles/sheriff.jpg',
  },
  doctor: {
    id: 'doctor',
    team: 'TOWN',
    name: { uz: 'Doktor', ru: 'Доктор' },
    shortDesc: {
      uz: 'Shahar shifokori. Tungi hujumlardan bir o‘yinchining hayotini saqlab qoladi.',
      ru: 'Городской врач. Спасает одного игрока от ночного покушения.',
    },
    abilityName: { uz: 'Shoshilinch davolash', ru: 'Экстренное лечение' },
    abilityDesc: {
      uz: 'Tunda bir o‘yinchini (o‘zini ham bir marta) o‘limdan saqlab qoladi.',
      ru: 'Защищает выбранного игрока от смерти в эту ночь.',
    },
    actionPhase: 'NIGHT',
    targetType: 'ANY_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 20,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Ketma-ket ikki tun bir xil o‘yinchini davolay olmaydi.',
      ru: 'Не может лечить одного и того же игрока две ночи подряд.',
    },
    modes: ['CLASSIC', 'ADVANCED', 'CHAOS'],
    minPlayers: 5,
    imageUrl: '/assets/roles/doctor.jpg',
  },
  bodyguard: {
    id: 'bodyguard',
    team: 'TOWN',
    name: { uz: 'Tansoqchi', ru: 'Телохранитель' },
    shortDesc: {
      uz: 'O‘z hayoti evaziga nishonni himoya qiladi va hujumchini ham olib ketadi.',
      ru: 'Защищает цель ценой собственной жизни и устраняет нападавшего.',
    },
    abilityName: { uz: 'Fidokorona qalqon', ru: 'Живой щит' },
    abilityDesc: {
      uz: 'Himoyalangan o‘yinchiga hujum bo‘lsa, Tansoqchi hujumchini o‘ldiradi va o‘zi ham halok bo‘ladi.',
      ru: 'Если на цель нападают, Телохранитель погибает вместо неё, забирая с собой убийцу.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 21,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'O‘zini himoya qila olmaydi.',
      ru: 'Не может защищать самого себя.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 6,
    imageUrl: '/assets/roles/bodyguard.jpg',
  },
  detective: {
    id: 'detective',
    team: 'TOWN',
    name: { uz: 'Detektiv', ru: 'Детектив' },
    shortDesc: {
      uz: 'Tergovchi. O‘yinchining jamoasini (Mafiya / Shahar / Neytral) aniq bilib oladi.',
      ru: 'Следователь. Определяет точную фракцию игрока.',
    },
    abilityName: { uz: 'Chuqur tergov', ru: 'Глубокое расследование' },
    abilityDesc: {
      uz: 'Tunda tanlangan o‘yinchining qaysi jamoaga mansubligini aniqlaydi.',
      ru: 'Узнаёт команду выбранного игрока (Мафия, Город или Нейтрал).',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 1,
    maxUses: -1,
    priority: 27,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: '1 tun sovish vaqti mavjud.',
      ru: 'Перезарядка 1 ночь.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 6,
    imageUrl: '/assets/roles/detective.jpg',
  },
  veteran: {
    id: 'veteran',
    team: 'TOWN',
    name: { uz: 'Veteran', ru: 'Ветеран' },
    shortDesc: {
      uz: 'Jangovar tayyorgarlik holatiga kirib, tunda uyiga kelgan har qanday mehmonni otadi.',
      ru: 'Переходит в боевую готовность и стреляет в любого, кто придёт к нему ночью.',
    },
    abilityName: { uz: 'Shay holat', ru: 'Боевая тревога' },
    abilityDesc: {
      uz: 'Tunda shay holatga kirsa, o‘zini himoya qiladi va unga tashrif buyurgan barcha rollarni o‘ldiradi.',
      ru: 'В ночь тревоги неуязвим и убивает всех посетителей. До 3 применений.',
    },
    actionPhase: 'NIGHT',
    targetType: 'SELF',
    cooldown: 0,
    maxUses: 3,
    priority: 10,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Shaharliklar (Doktor, Sherif) kelsa ham ularni otib qo‘yishi mumkin. 3 marta ishlatiladi.',
      ru: 'Может случайно убить союзников. Максимум 3 раза.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/veteran.jpg',
  },
  vigilante: {
    id: 'vigilante',
    team: 'TOWN',
    name: { uz: 'Qasoskor', ru: 'Мститель' },
    shortDesc: {
      uz: 'Adolatni o‘z qo‘liga olgan mergan. Tunda shubhali o‘yinchini otishi mumkin.',
      ru: 'Стрелок, вершащий правосудие ночью по собственному выбору.',
    },
    abilityName: { uz: 'Tungi o‘q', ru: 'Ночной выстрел' },
    abilityDesc: {
      uz: 'Tunda bitta o‘yinchini otadi. Agar begunoh fuqaroni otsa, vijdon azobida o‘ladi.',
      ru: 'Стреляет в выбранную цель. Если убивает мирного, выбывает из игры.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: 2,
    priority: 44,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Faqat 2 ta o‘q. Shaharlikni o‘ldirish halokatli.',
      ru: 'Всего 2 патрона. Выстрел по мирному смертелен для самого Мстителя.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/vigilante.jpg',
  },
  mayor: {
    id: 'mayor',
    team: 'TOWN',
    name: { uz: 'Shahar hokimi', ru: 'Мэр' },
    shortDesc: {
      uz: 'Kunduzi o‘z lavozimini oshkor qilib, ikki barobar ovoz kuchiga ega bo‘ladi.',
      ru: 'Может раскрыть свой статус днём, получив двойной вес голоса.',
    },
    abilityName: { uz: 'Ikki karra ovoz', ru: 'Двойной голос' },
    abilityDesc: {
      uz: 'Oshkor bo‘lgandan so‘ng kunduzgi ovoz berishda ovozi 2 ta hisoblanadi.',
      ru: 'После раскрытия его голос на суде считается за два.',
    },
    actionPhase: 'DAY',
    targetType: 'SELF',
    cooldown: 0,
    maxUses: 1,
    priority: 90,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Oshkor bo‘lgandan keyin Doktor himoyasi qiyinlashadi va Mafiya nishoniga aylanadi.',
      ru: 'После раскрытия становится главной мишенью мафии.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/mayor.jpg',
  },
  medium: {
    id: 'medium',
    team: 'TOWN',
    name: { uz: 'Medium', ru: 'Медиум' },
    shortDesc: {
      uz: 'O‘lgan o‘yinchilar bilan bog‘lanib, ularning so‘nggi ma’lumotlarini oladi.',
      ru: 'Общается с погибшими игроками, получая подсказки из загробного мира.',
    },
    abilityName: { uz: 'Ruhlar bilan aloqa', ru: 'Спиритический сеанс' },
    abilityDesc: {
      uz: 'Tunda o‘lgan o‘yinchilar chatini ko‘radi va bitta o‘lgan o‘yinchining rolini bilib oladi.',
      ru: 'Видит чат мёртвых и может узнать роль одного павшего игрока.',
    },
    actionPhase: 'NIGHT',
    targetType: 'DEAD',
    cooldown: 0,
    maxUses: 2,
    priority: 30,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Faqat o‘lgan o‘yinchilar mavjud bo‘lganda ishlaydi.',
      ru: 'Работает только после появления первых жертв.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/medium.jpg',
  },
  lookout: {
    id: 'lookout',
    team: 'TOWN',
    name: { uz: 'Kuzatuvchi', ru: 'Наблюдатель' },
    shortDesc: {
      uz: 'Tunda bir o‘yinchining uyini kuzatib, unga kimlar kelganini ko‘radi.',
      ru: 'Следит за домом игрока ночью и видит всех, кто его посетил.',
    },
    abilityName: { uz: 'Tungi kuzatuv', ru: 'Ночное наблюдение' },
    abilityDesc: {
      uz: 'Tanlangan nishonga tunda tashrif buyurgan barcha o‘yinchilarning ismini bilib oladi.',
      ru: 'Узнаёт имена всех игроков, посетивших цель этой ночью.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 50,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Tashrif buyuruvchilarning rolini emas, faqat ismini ko‘radi.',
      ru: 'Видит только имена посетителей, но не их роли.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/lookout.jpg',
  },
  tracker: {
    id: 'tracker',
    team: 'TOWN',
    name: { uz: 'Izquvar', ru: 'Следопыт' },
    shortDesc: {
      uz: 'Bir o‘yinchining izidan borib, u tunda kimning uyiga borganini aniqlaydi.',
      ru: 'Выслеживает выбранного игрока и узнаёт, к кому тот ходил ночью.',
    },
    abilityName: { uz: 'Izdan borish', ru: 'Выслеживание' },
    abilityDesc: {
      uz: 'Tanlangan o‘yinchi tunda kimga tashrif buyurganini ko‘rsatadi.',
      ru: 'Показывает, кого посетила выбранная цель ночью.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 51,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Agar nishon uyda qolsa, hech qayerga bormagani ko‘rinadi.',
      ru: 'Если цель осталась дома, следов не будет.',
    },
    modes: ['CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/tracker.jpg',
  },
  escort: {
    id: 'escort',
    team: 'TOWN',
    name: { uz: 'Chalg‘ituvchi', ru: 'Эскорт' },
    shortDesc: {
      uz: 'Tunda tanlangan o‘yinchining qobiliyatini bloklaydi.',
      ru: 'Блокирует ночную способность выбранного игрока.',
    },
    abilityName: { uz: 'Tungi bloklash', ru: 'Блокировка' },
    abilityDesc: {
      uz: 'Nishon bu tunda o‘z rol qobiliyatini ishlata olmaydi.',
      ru: 'Выбранный игрок не может применить свою способность этой ночью.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 12,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: 'Seriyali Qotilni bloklashga urinsa, Qotil uni o‘ldirishi mumkin.',
      ru: 'Попытка заблокировать Серийного убийцу может закончиться смертью.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/escort.jpg',
  },
  jailer: {
    id: 'jailer',
    team: 'TOWN',
    name: { uz: 'Qamoq boshlig‘i', ru: 'Тюремщик' },
    shortDesc: {
      uz: 'Tunda bir o‘yinchini qamoqqa olib, uni barcha harakatlardan izolyatsiya qiladi.',
      ru: 'Сажает игрока в тюрьму на ночь, изолируя от всех ночных действий.',
    },
    abilityName: { uz: 'Tungi hibs', ru: 'Ночной арест' },
    abilityDesc: {
      uz: 'Hibsga olingan o‘yinchi tunda harakat qila olmaydi va unga ham hujum qilib bo‘lmaydi.',
      ru: 'Арестованный не может действовать и защищён от нападений.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 1,
    maxUses: 3,
    priority: 5,
    winCondition: {
      uz: 'Shahar jamoasi bilan birga g‘alaba qozonadi.',
      ru: 'Побеждает вместе с командой города.',
    },
    limitations: {
      uz: '1 tun sovish vaqti, maksimal 3 marta.',
      ru: 'Перезарядка 1 ночь, до 3 арестов.',
    },
    modes: ['CHAOS'],
    minPlayers: 9,
    imageUrl: '/assets/roles/jailer.jpg',
  },

  // ======================== NEUTRAL TEAM (10) ========================
  serial_killer: {
    id: 'serial_killer',
    team: 'NEUTRAL',
    name: { uz: 'Seriyali Qotil', ru: 'Серийный убийца' },
    shortDesc: {
      uz: 'Yolg‘iz ovchi. Har tunda xohlagan o‘yinchini o‘ldiradi va oxirigacha tirik qolishga intiladi.',
      ru: 'Одинокий охотник. Убивает каждую ночь, стремясь остаться последним выжившим.',
    },
    abilityName: { uz: 'Yolg‘iz qatl', ru: 'Одиночная охота' },
    abilityDesc: {
      uz: 'Har tunda bitta nishonni o‘ldiradi. Chalg‘ituvchi bloklasa ham qarshi hujum qiladi.',
      ru: 'Убивает одну цель каждую ночь. Контратакует при блокировке.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 41,
    winCondition: {
      uz: 'O‘yin oxirida yakka o‘zi (yoki neytral omon qoluvchilar bilan) tirik qolsa g‘alaba qozonadi.',
      ru: 'Побеждает, оставшись последним выжившим против города и мафии.',
    },
    limitations: {
      uz: 'Sherifga shubhali bo‘lib ko‘rinadi.',
      ru: 'Определяется Шерифом как подозрительный.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/serial_killer.jpg',
  },
  jester: {
    id: 'jester',
    team: 'NEUTRAL',
    name: { uz: 'Masxaraboz', ru: 'Шут' },
    shortDesc: {
      uz: 'Maqsadi — kunduzgi ovoz berishda o‘zini osdirish. Agar shahar uni chiqarsa, u g‘olib!',
      ru: 'Его цель — добиться собственной казни на дневном голосовании.',
    },
    abilityName: { uz: 'Oxirgi kulgu', ru: 'Последний смех' },
    abilityDesc: {
      uz: 'Ovoz berishda chiqarib yuborilsa, darhol g‘alaba qozonadi.',
      ru: 'Если город казнит Шута днём, он немедленно одерживает победу.',
    },
    actionPhase: 'PASSIVE',
    targetType: 'NONE',
    cooldown: 0,
    maxUses: 0,
    priority: 99,
    winCondition: {
      uz: 'Kunduzgi ovoz berishda chiqarib yuborilish.',
      ru: 'Быть изгнанным на дневном голосовании.',
    },
    limitations: {
      uz: 'Tunda o‘lsa g‘alaba qozonmaydi.',
      ru: 'Смерть ночью не приносит победы.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 7,
    imageUrl: '/assets/roles/jester.jpg',
  },
  survivor: {
    id: 'survivor',
    team: 'NEUTRAL',
    name: { uz: 'Omon Qoluvchi', ru: 'Выживший' },
    shortDesc: {
      uz: 'Hech qaysi jamoaga qo‘shilmaydi. Maqsadi — o‘yin tugaguncha tirik qolish.',
      ru: 'Нейтрал, чья единственная цель — дожить до конца игры.',
    },
    abilityName: { uz: 'Bronjilet', ru: 'Бронежилет' },
    abilityDesc: {
      uz: 'Tunda himoya kiyimini kiyib, o‘zini hujumlardan asraydi. 3 marta ishlatiladi.',
      ru: 'Защищает себя от ночной атаки. До 3 использований.',
    },
    actionPhase: 'NIGHT',
    targetType: 'SELF',
    cooldown: 0,
    maxUses: 3,
    priority: 19,
    winCondition: {
      uz: 'Kim g‘alaba qozonishidan qat’i nazar, o‘yin oxirigacha tirik qolish.',
      ru: 'Дожить до финала игры независимо от победившей стороны.',
    },
    limitations: {
      uz: 'Faqat 3 ta bronjileti bor.',
      ru: 'Всего 3 бронежилета на игру.',
    },
    modes: ['ADVANCED', 'CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/survivor.jpg',
  },
  arsonist: {
    id: 'arsonist',
    team: 'NEUTRAL',
    name: { uz: 'O‘t Qo‘yuvchi', ru: 'Поджигатель' },
    shortDesc: {
      uz: 'O‘yinchilarga benzin sepadi va istalgan tunda barchasini birdaniga yoqib yuboradi.',
      ru: 'Обливает игроков бензином, чтобы в нужную ночь поджечь всех разом.',
    },
    abilityName: { uz: 'Benzin va Olov', ru: 'Бензин и поджог' },
    abilityDesc: {
      uz: 'Bir tunda nishonga benzin sepadi; o‘zini tanlasa, benzin sepilgan barcha tirik o‘yinchilarni yoqadi.',
      ru: 'Выбор другого игрока обливает его. Выбор себя поджигает всех облитых.',
    },
    actionPhase: 'NIGHT',
    targetType: 'ANY_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 45,
    winCondition: {
      uz: 'Barcha raqiblarni yoqib, oxirgi tirik qolgan kuch bo‘lish.',
      ru: 'Устранить всех остальных игроков и выжить.',
    },
    limitations: {
      uz: 'Yoqish harakati butun bir tunni egallaydi.',
      ru: 'Поджог занимает целую ночь.',
    },
    modes: ['CHAOS'],
    minPlayers: 9,
    imageUrl: '/assets/roles/arsonist.jpg',
  },
  witch: {
    id: 'witch',
    team: 'NEUTRAL',
    name: { uz: 'Jodugar', ru: 'Ведьма' },
    shortDesc: {
      uz: 'Boshqa o‘yinchilarning tungi harakatini o‘zgartirib, ularni boshqaradi.',
      ru: 'Управляет действиями других игроков ночью, перенаправляя их способности.',
    },
    abilityName: { uz: 'Ongni boshqarish', ru: 'Контроль разума' },
    abilityDesc: {
      uz: 'Bir o‘yinchining tungi nishonini boshqa o‘yinchiga yo‘naltiradi.',
      ru: 'Перенаправляет ночное действие первого выбранного игрока на другого.',
    },
    actionPhase: 'NIGHT',
    targetType: 'TWO_ALIVE',
    cooldown: 1,
    maxUses: -1,
    priority: 8,
    winCondition: {
      uz: 'Shahar yutqazgan va o‘zi tirik qolgan holatda g‘alaba qozonadi.',
      ru: 'Побеждает, если город проиграет, а Ведьма останется жива.',
    },
    limitations: {
      uz: '1 tun sovish vaqti.',
      ru: 'Перезарядка 1 ночь.',
    },
    modes: ['CHAOS'],
    minPlayers: 9,
    imageUrl: '/assets/roles/witch.jpg',
  },
  executioner: {
    id: 'executioner',
    team: 'NEUTRAL',
    name: { uz: 'Jallod', ru: 'Палач' },
    shortDesc: {
      uz: 'O‘yin boshida unga maxfiy nishon beriladi. O‘sha nishonni kunduzi osdirishi kerak.',
      ru: 'Получает секретную цель. Должен добиться её казни на дневном голосовании.',
    },
    abilityName: { uz: 'Shaxsiy adovat', ru: 'Личная вендетта' },
    abilityDesc: {
      uz: 'O‘z nishonini kunduzgi ovoz berishda chiqarib yuborishga erishsa, g‘alaba qozonadi.',
      ru: 'Если его цель казнена днём, Палач побеждает.',
    },
    actionPhase: 'PASSIVE',
    targetType: 'NONE',
    cooldown: 0,
    maxUses: 0,
    priority: 99,
    winCondition: {
      uz: 'Belgilangan nishonning kunduzgi ovoz berishda chiqarilishi.',
      ru: 'Казнь назначенной цели на голосовании.',
    },
    limitations: {
      uz: 'Agar nishon tunda o‘lsa, Jallod oddiy Omon Qoluvchiga aylanadi.',
      ru: 'Если цель гибнет ночью, становится Выжившим.',
    },
    modes: ['CHAOS'],
    minPlayers: 8,
    imageUrl: '/assets/roles/executioner.jpg',
  },
  amnesiac: {
    id: 'amnesiac',
    team: 'NEUTRAL',
    name: { uz: 'Xotirasiz', ru: 'Амнезиак' },
    shortDesc: {
      uz: 'O‘z rolini unutgan. O‘lgan o‘yinchilardan birining rolini o‘zlashtirishi mumkin.',
      ru: 'Забыл свою роль. Может перенять роль любого погибшего игрока.',
    },
    abilityName: { uz: 'Xotirani tiklash', ru: 'Вспомнить всё' },
    abilityDesc: {
      uz: 'Tunda o‘lgan o‘yinchini tanlab, uning roliga va jamoasiga o‘tadi.',
      ru: 'Выбирает погибшего игрока и полностью принимает его роль и команду.',
    },
    actionPhase: 'NIGHT',
    targetType: 'DEAD',
    cooldown: 0,
    maxUses: 1,
    priority: 14,
    winCondition: {
      uz: 'Tanlagan yangi rolning g‘alaba shartini bajarish.',
      ru: 'Побеждает по условиям новой выбранной роли.',
    },
    limitations: {
      uz: 'Rol tanlamaguncha g‘alaba qozona olmaydi.',
      ru: 'Не может победить, пока не выберет роль.',
    },
    modes: ['CHAOS'],
    minPlayers: 9,
    imageUrl: '/assets/roles/amnesiac.jpg',
  },
  guardian_angel: {
    id: 'guardian_angel',
    team: 'NEUTRAL',
    name: { uz: 'Qo‘riqchi Farishta', ru: 'Ангел-хранитель' },
    shortDesc: {
      uz: 'O‘yin boshida bir o‘yinchiga biriktiriladi va uni o‘limdan asrashi kerak.',
      ru: 'Привязан к одному игроку и должен сохранить ему жизнь до конца.',
    },
    abilityName: { uz: 'Ilohiy qalqon', ru: 'Божественный щит' },
    abilityDesc: {
      uz: 'O‘z himoyasidagi o‘yinchini tunda mutlaq o‘limdan saqlaydi. 2 marta ishlatiladi.',
      ru: 'Спасает своего подопечного от любой ночной атаки. До 2 раз.',
    },
    actionPhase: 'NIGHT',
    targetType: 'SELF',
    cooldown: 1,
    maxUses: 2,
    priority: 17,
    winCondition: {
      uz: 'O‘z himoyasidagi o‘yinchi o‘yin oxirigacha tirik qolishi.',
      ru: 'Его подопечный должен дожить до конца игры.',
    },
    limitations: {
      uz: 'Faqat belgilangan o‘yinchini himoya qila oladi.',
      ru: 'Защищает только назначенного игрока.',
    },
    modes: ['CHAOS'],
    minPlayers: 9,
    imageUrl: '/assets/roles/guardian_angel.jpg',
  },
  plaguebearer: {
    id: 'plaguebearer',
    team: 'NEUTRAL',
    name: { uz: 'Vabo Tarqatuvchi', ru: 'Чумной доктор' },
    shortDesc: {
      uz: 'Tunda o‘yinchilarga infeksiya yuqtiradi. Hamma yuqtirilganda kuchli tahdidga aylanadi.',
      ru: 'Заражает игроков ночью. Когда все заражены, получает смертоносную силу.',
    },
    abilityName: { uz: 'Vabo yuqtirish', ru: 'Распространение чумы' },
    abilityDesc: {
      uz: 'Tunda nishonni yuqtiradi. Barcha tirik o‘yinchilar yuqtirilganda tunda o‘ldira boshlaydi.',
      ru: 'Заражает цель. После заражения всех выживших начинает убивать каждую ночь.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 0,
    maxUses: -1,
    priority: 35,
    winCondition: {
      uz: 'Oxirgi tirik qolgan o‘yinchi bo‘lish.',
      ru: 'Остаться последним выжившим.',
    },
    limitations: {
      uz: 'Dastlabki turlarda sekin tarqaladi.',
      ru: 'Начинает убивать только после полного заражения.',
    },
    modes: ['CHAOS'],
    minPlayers: 10,
    imageUrl: '/assets/roles/plaguebearer.jpg',
  },
  vampire: {
    id: 'vampire',
    team: 'NEUTRAL',
    name: { uz: 'Vampir', ru: 'Вампир' },
    shortDesc: {
      uz: 'Tunda oddiy fuqarolarni Vampirga aylantiradi yoki kuchli rollarga hujum qiladi.',
      ru: 'Обращает мирных жителей в вампиров или атакует особые роли ночью.',
    },
    abilityName: { uz: 'Tungi tishlash', ru: 'Укус в ночи' },
    abilityDesc: {
      uz: 'Fuqaroni Vampirga aylantiradi; boshqa rollarga esa zarar yetkazadi.',
      ru: 'Обращает Мирного жителя в Вампира; другим ролям наносит смертельный урон.',
    },
    actionPhase: 'NIGHT',
    targetType: 'OTHER_ALIVE',
    cooldown: 1,
    maxUses: -1,
    priority: 43,
    winCondition: {
      uz: 'Barcha tirik o‘yinchilar Vampirga aylanganda yoki raqiblar yo‘q bo‘lganda.',
      ru: 'Побеждает, когда все выжившие станут вампирами или враги устранены.',
    },
    limitations: {
      uz: '1 tun sovish vaqti. Mafiyani aylantira olmaydi.',
      ru: 'Перезарядка 1 ночь. Не может обратить мафию.',
    },
    modes: ['CHAOS'],
    minPlayers: 10,
    imageUrl: '/assets/roles/vampire.jpg',
  },
};

export const ROLE_LIST: RoleDefinition[] = Object.values(ROLES);

export function generateRoleDistribution(playerCount: number, mode: GameMode): RoleId[] {
  const count = Math.max(5, Math.min(20, playerCount));
  const roles: RoleId[] = [];

  if (mode === 'CLASSIC') {
    const mafiaCount = count <= 6 ? 1 : count <= 10 ? 2 : count <= 14 ? 3 : 4;
    roles.push('don');
    for (let i = 1; i < mafiaCount; i++) roles.push('mafia');
    roles.push('sheriff');
    roles.push('doctor');
    while (roles.length < count) {
      roles.push('citizen');
    }
    return roles;
  }

  if (mode === 'ADVANCED') {
    const mafiaCount = count <= 6 ? 2 : count <= 10 ? 3 : count <= 14 ? 4 : 5;
    const mafiaPool: RoleId[] = ['don', 'consigliere', 'silencer', 'framer', 'janitor', 'mafia'];
    for (let i = 0; i < mafiaCount; i++) {
      roles.push(mafiaPool[i % mafiaPool.length]);
    }

    // Neutrals in Advanced
    if (count >= 7) roles.push('jester');
    if (count >= 9) roles.push('serial_killer');
    if (count >= 13) roles.push('survivor');

    const townSpecials: RoleId[] = [
      'sheriff',
      'doctor',
      'bodyguard',
      'detective',
      'mayor',
      'vigilante',
      'lookout',
      'escort',
      'veteran',
      'medium',
    ];
    let tIdx = 0;
    while (roles.length < count) {
      if (tIdx < townSpecials.length && roles.length < count - 1) {
        roles.push(townSpecials[tIdx++]);
      } else {
        roles.push('citizen');
      }
    }
    return roles;
  }

  // CHAOS mode
  const mafiaCount = count <= 6 ? 2 : count <= 10 ? 3 : count <= 15 ? 4 : 5;
  const chaosMafia: RoleId[] = ['godfather', 'consigliere', 'silencer', 'janitor', 'framer', 'don'];
  for (let i = 0; i < mafiaCount; i++) {
    roles.push(chaosMafia[i % chaosMafia.length]);
  }

  const chaosNeutrals: RoleId[] = [
    'serial_killer',
    'jester',
    'arsonist',
    'witch',
    'executioner',
    'amnesiac',
    'guardian_angel',
    'plaguebearer',
    'vampire',
    'survivor',
  ];
  const neutralCount = Math.min(chaosNeutrals.length, Math.max(2, Math.floor(count / 3)));
  const shuffledNeutrals = [...chaosNeutrals].sort(() => Math.random() - 0.5);
  for (let i = 0; i < neutralCount && roles.length < count - 2; i++) {
    roles.push(shuffledNeutrals[i]);
  }

  const chaosTown: RoleId[] = [
    'sheriff',
    'doctor',
    'jailer',
    'tracker',
    'veteran',
    'vigilante',
    'mayor',
    'bodyguard',
    'lookout',
    'detective',
    'escort',
    'medium',
  ];
  let ctIdx = 0;
  while (roles.length < count) {
    if (ctIdx < chaosTown.length) {
      roles.push(chaosTown[ctIdx++]);
    } else {
      roles.push('citizen');
    }
  }
  return roles;
}
