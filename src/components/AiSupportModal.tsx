import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle,
  ChevronRight,
  FileQuestion,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AiKnowledgeArticle, SupportTicket } from '../shared/types';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export const AiSupportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { lang, token, user, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'CHAT' | 'KB' | 'TICKET'>('CHAT');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text:
        lang === 'uz'
          ? "Salom! Men MAFIA PRO sun'iy intellekt yordamchisiman. O‘yin qoidalari, 18+ rollar, VIP obuna, klanlar va do‘kon haqida istalgan savolingizga javob bera olaman."
          : 'Здравствуйте! Я официальный AI-ассистент MAFIA PRO. Отвечу на любые вопросы по правилам, ролям, VIP-подписке, кланам и магазину.',
      timestamp: Date.now(),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // KB state
  const [kbArticles, setKbArticles] = useState<AiKnowledgeArticle[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<AiKnowledgeArticle | null>(null);

  // Ticket state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('NORMAL');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/support/kb')
        .then((r) => r.json())
        .then((d) => setKbArticles(d.articles || []))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const quickQuestions =
    lang === 'uz'
      ? [
          'Sherif qanday tekshiradi?',
          'VIP obuna narxlari va imtiyozlari qanday?',
          'Klan qanday yaratiladi?',
          'Elo reyting darajalari qanday hisoblanadi?',
          'Ovozli chat ishlamayapti, nima qilish kerak?',
        ]
      : [
          'Как работает проверка Шерифа?',
          'Тарифы и привилегии VIP-подписки?',
          'Как создать или вступить в клан?',
          'Дивизионы и расчет рейтинга Elo?',
          'Не работает голосовой чат, что делать?',
        ];

  const handleSendChat = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMsg('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/support/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.reply || (lang === 'uz' ? 'Kechirasiz, javob olishda xatolik yuz berdi.' : 'Ошибка при получении ответа.'),
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text:
            lang === 'uz'
              ? 'Server bilan bog‘lanishda xatolik. Iltimos qaytadan urinib ko‘ring.'
              : 'Ошибка связи с сервером. Пожалуйста, повторите.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast(lang === 'uz' ? 'Chipta ochish uchun tizimga kiring' : 'Войдите для создания тикета', 'error');
      return;
    }
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setTicketSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          priority: ticketPriority,
        }),
      });
      if (res.ok) {
        showToast(
          lang === 'uz' ? 'Qo‘llab-quvvatlash chiptasi yaratildi!' : 'Тикет в поддержку создан!',
          'success'
        );
        setTicketSubject('');
        setTicketDescription('');
        setActiveTab('CHAT');
      } else {
        const d = await res.json();
        showToast(d.error || 'Error', 'error');
      }
    } catch {
      showToast('Error connecting', 'error');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const filteredArticles = kbArticles.filter((a) => {
    if (!kbSearch.trim()) return true;
    const q = kbSearch.toLowerCase();
    return (
      a.title[lang].toLowerCase().includes(q) ||
      a.content[lang].toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl h-[620px] max-h-[92vh] rounded-2xl bg-[#090B12] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#111522] via-[#090B12] to-[#111522]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E63946] to-[#991B1B] p-0.5 shadow-lg shadow-[#E63946]/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-[#F5F5F7]">MAFIA PRO AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7B65B]/20 text-[#E7B65B] border border-[#E7B65B]/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 2.0 Gemini
                </span>
              </div>
              <p className="text-xs text-[#F5F5F7]/60">
                {lang === 'uz' ? 'Qoidalar, rollar va yordam markazi' : 'Правила, роли и поддержка'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#F5F5F7]/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-white/10 bg-[#050711]/60 px-5 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'CHAT'
                ? 'border-[#E63946] text-[#E63946]'
                : 'border-transparent text-[#F5F5F7]/60 hover:text-[#F5F5F7]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'AI Savol-Javob' : 'AI Чат'}
          </button>
          <button
            onClick={() => setActiveTab('KB')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'KB'
                ? 'border-[#E63946] text-[#E63946]'
                : 'border-transparent text-[#F5F5F7]/60 hover:text-[#F5F5F7]'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'Qoidalar va Maqolalar' : 'База знаний'}
          </button>
          <button
            onClick={() => setActiveTab('TICKET')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TICKET'
                ? 'border-[#E63946] text-[#E63946]'
                : 'border-transparent text-[#F5F5F7]/60 hover:text-[#F5F5F7]'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            {lang === 'uz' ? 'Admin Chiptasi' : 'Тикет в поддержку'}
          </button>
        </div>

        {/* Tab Content: CHAT */}
        {activeTab === 'CHAT' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#070913]/60">
            {/* Quick Prompts */}
            <div className="p-3 border-b border-white/10 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2 bg-[#090B12]/80">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(q)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/[0.04] border border-white/10 hover:border-[#E7B65B]/60 hover:bg-[#E7B65B]/10 text-[#F5F5F7]/80 hover:text-[#E7B65B] transition-all shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Message Area */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                      m.sender === 'user'
                        ? 'bg-[#E63946] text-white'
                        : 'bg-gradient-to-br from-[#E7B65B] to-[#B45309] text-[#090B12]'
                    }`}
                  >
                    {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#E63946] text-white rounded-tr-none'
                        : 'bg-[#121626] border border-white/10 text-[#F5F5F7]/95 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2.5 max-w-[85%]">
                  <div className="w-7 h-7 rounded-lg bg-[#E7B65B]/20 border border-[#E7B65B]/40 flex items-center justify-center text-[#E7B65B]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-[#121626] border border-white/10 rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E7B65B] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E7B65B] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E7B65B] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/10 bg-[#090B12] flex items-center gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={
                  lang === 'uz'
                    ? "Savolingizni yozing (masalan: Sherif kechasi qanday tekshiradi?)..."
                    : 'Задайте вопрос (например: Как работает проверка Шерифа?)...'
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E63946]"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={!inputMsg.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-[#E63946] disabled:opacity-40 hover:bg-[#d62839] text-white flex items-center justify-center transition-all shrink-0 shadow-md shadow-[#E63946]/25"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: KNOWLEDGE BASE */}
        {activeTab === 'KB' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070913]/60">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder={lang === 'uz' ? 'Qoidalar yoki mavzu bo‘yicha qidirish...' : 'Поиск по статьям и правилам...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E63946]"
              />
            </div>

            {selectedArticle ? (
              <div className="p-5 rounded-2xl bg-[#121626] border border-white/10 space-y-3">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-[#E7B65B] hover:underline flex items-center gap-1 font-semibold"
                >
                  ← {lang === 'uz' ? 'Barcha maqolalar' : 'Назад к списку'}
                </button>
                <h4 className="font-display text-base font-bold text-white">
                  {selectedArticle.title[lang]}
                </h4>
                <div className="text-xs text-[#F5F5F7]/85 leading-relaxed whitespace-pre-line border-t border-white/10 pt-3">
                  {selectedArticle.content[lang]}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredArticles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className="p-3.5 rounded-xl bg-[#121626] hover:bg-[#1a2035] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E7B65B]">
                        {art.category}
                      </span>
                      <h4 className="font-semibold text-xs text-white group-hover:text-[#E7B65B] transition-colors mt-0.5">
                        {art.title[lang]}
                      </h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: SUPPORT TICKET */}
        {activeTab === 'TICKET' && (
          <div className="flex-1 overflow-y-auto p-5 bg-[#070913]/60">
            <form onSubmit={handleCreateTicket} className="max-w-lg mx-auto space-y-4">
              <div className="text-center space-y-1 mb-2">
                <h4 className="font-display text-base font-bold text-white">
                  {lang === 'uz' ? 'Admin Yordamiga Murojaat' : 'Обращение в поддержку'}
                </h4>
                <p className="text-xs text-[#F5F5F7]/60">
                  {lang === 'uz'
                    ? 'AI yechim bera olmagan hisob, to‘lov yoki qoidabuzarlik masalalarini adminga yuboring.'
                    : 'Отправьте вопрос администрации по поводу оплат, блокировок или тех. проблем.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F7]/70 mb-1">
                  {lang === 'uz' ? 'Mavzu' : 'Тема обращения'}
                </label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder={lang === 'uz' ? 'Masalan: To‘lov tasdiqlanmadi' : 'Например: Оплата не зачислилась'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F7]/70 mb-1">
                  {lang === 'uz' ? 'Muhimlik darajasi' : 'Приоритет'}
                </label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as SupportTicket['priority'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E63946]"
                >
                  <option value="LOW">{lang === 'uz' ? 'Past (Oddiy savol)' : 'Низкий'}</option>
                  <option value="NORMAL">{lang === 'uz' ? 'O‘rtacha' : 'Обычный'}</option>
                  <option value="HIGH">{lang === 'uz' ? 'Yuqori (To‘lov/Hisob)' : 'Высокий'}</option>
                  <option value="URGENT">{lang === 'uz' ? 'Favqulodda' : 'Срочный'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F7]/70 mb-1">
                  {lang === 'uz' ? 'Batafsil ma’lumot' : 'Подробное описание'}
                </label>
                <textarea
                  required
                  rows={5}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder={
                    lang === 'uz'
                      ? 'Muammoni iloji boricha batafsil yozing...'
                      : 'Опишите проблему максимально подробно...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white focus:outline-none focus:border-[#E63946] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={ticketSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E63946] to-[#991B1B] text-white text-xs font-bold shadow-lg shadow-[#E63946]/25 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {ticketSubmitting
                  ? lang === 'uz' ? 'Yuborilmoqda...' : 'Отправка...'
                  : lang === 'uz' ? 'Chiptani yuborish' : 'Отправить тикет'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
