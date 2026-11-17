"use client";

import Link from "next/link";
import {
  Activity,
  Award,
  Check,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import MarketRiskTerminal from "@/components/MarketRiskTerminal";
import NavbarAuthButtons from "@/components/NavbarAuthButtons";
import { useAppLang } from "@/lib/useAppLang";

export interface FaqEntry {
  question: string;
  answer: string;
}

interface HomeLandingClientProps {
  passCheckout: string;
  proCheckout: string;
  faqsEn: FaqEntry[];
}

const FAQS_TR: FaqEntry[] = [
  {
    question: "Bu backtestler gerçek piyasa verisiyle mi çalışıyor?",
    answer:
      "Evet. Seçtiğin varlık ve zaman dilimi (15m, 1H, 4H, 1D) için doğrudan canlı Binance API'sinden son 300 gerçek OHLCV mumu çekilir. Ağ erişimi olmayan ortamlarda deterministik piyasa simülasyon verisi otomatik yedek olarak devreye girer.",
  },
  {
    question: "TradingView veya ChatGPT'den farkı nedir?",
    answer:
      "ChatGPT geçmiş mumları çekip mum içi High/Low Stop-Loss ve Take-Profit ihlallerini bar bazında test edemez. TradingView'da ise Pine Script yazmadan tek tıkla 6 algoritmayı aynı anda yarıştırıp 36 SL/TP kombinasyonunu tarayan bir turnuva motoru yoktur.",
  },
  {
    question: "Motor komisyon ve mum içi Stop-Loss (SL) ihlallerini hesaba katıyor mu?",
    answer:
      "Evet. Her işlemde gidiş-dönüş borsa komisyonu düşülür ve pozisyon açıldıktan sonraki her mumda önce mumun Low değerinin Stop-Loss'u, ardından High değerinin Take-Profit'i vurup vurmadığı kontrol edilir.",
  },
  {
    question: "Borsa API anahtarımı girmem gerekiyor mu?",
    answer:
      "Kesinlikle hayır. VaultSheet salt okunur piyasa verilerini tarayıcına çeker ve tüm hesaplamaları kendi cihazının belleğinde (RAM) çalıştırır. Hiçbir cüzdan bağlantısı veya borsa API anahtarı istenmez.",
  },
  {
    question: "Ücretsiz sürüm ile $12 / $29 Pro lisans arasındaki fark nedir?",
    answer:
      "BTC, ETH, SOL, BNB ve PAXG (Altın) üzerinde 1H ve 4H zaman dilimlerinde 6-strateji backtesti, tüm risk kaydırıcıları ve 1 adet ücretsiz 36-kombinasyon Auto-Optimize taraması ücretsizdir. $12 7 Günlük Paket ve $29/yıl Pro lisans ise 12 varlıklı canlı Alpha Radar'ın tamamını (XRP, DOGE, AVAX, SUI, LINK, ADA, ARB), 15m scalping / 1D makro dilimleri, sınırsız Auto-Optimize ve CSV işlem dökümünü açar.",
  },
  {
    question: "Otomatik Yenileme (Auto-Renewal) tuzağı var mı?",
    answer:
      "Hayır. $12 7 Günlük Paket ve $29 Yıllık Pro tamamen tek seferlik geçiştir. Süren bittiğinde kartından haberin olmadan para çekilmez.",
  },
];

export default function HomeLandingClient({
  passCheckout,
  proCheckout,
  faqsEn,
}: HomeLandingClientProps) {
  const [lang] = useAppLang();
  const faqs = lang === "tr" ? FAQS_TR : faqsEn;

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100">
      {/* Obsidian-Glass Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#050811]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-blue-600 text-slate-950 shadow-sm transition group-hover:scale-105">
              <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              VaultSheet <span className="text-emerald-400 font-semibold text-xs">Quant</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#workbench" className="hover:text-white transition-colors">
              {lang === "tr" ? "Backtest Terminali" : "Backtest Terminal"}
            </a>
            <a href="#engines" className="hover:text-white transition-colors">
              {lang === "tr" ? "6 Algoritma" : "6 Algorithms"}
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              {lang === "tr" ? "Deterministik Motor" : "Verification"}
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              {lang === "tr" ? "SSS" : "FAQ"}
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <NavbarAuthButtons dark />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Deep Obsidian Glow Hero + Quant Terminal */}
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-[#050811]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,rgba(16,185,129,0.20),rgba(37,99,235,0.14)_50%,transparent_80%)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 pt-9 pb-14 sm:px-6 lg:px-8 lg:pt-12">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {lang === "tr"
                  ? "VaultSheet Quant · 300 Canlı Mum · 6 Algoritma · 36 Otomatik Test"
                  : "VaultSheet Quant · 300 Live Candles · 6 Algorithms · 36-Setup Sweep"}
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                {lang === "tr"
                  ? "Tahmin Etmeyi Bırak — 6 Algoritmayı Gerçek Mumlarda Saniyede Backtest Et"
                  : "Stop Guessing — Backtest & Auto-Optimize 6 Quant Strategies on Live Candles in Seconds"}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base leading-relaxed">
                {lang === "tr"
                  ? "Canlı 300 OHLCV mum verisi üstünde Donchian, Dual EMA, Wilder RSI, Bollinger, MACD ve Hacim Kırılımı stratejilerini mum içi Stop-Loss / TP + komisyon dahil yarıştır. En kârlı SL/TP ayarını tek tıkla 25 ms'de bul."
                  : "Compete Donchian, Dual EMA, Wilder RSI, Bollinger, MACD & Volume Spike on 300 live OHLCV bars with intrabar SL/TP and exchange fees. Sweep 36 parameter combinations in 25ms."}
              </p>
            </div>

            {/* Embedded Standalone Quant Backtester & Alpha Radar */}
            <div id="workbench" className="mt-8 scroll-mt-20">
              <MarketRiskTerminal lang={lang} />
            </div>
          </div>
        </section>

        {/* 3 Quant Pillars Section */}
        <section id="engines" className="border-b border-slate-800/80 bg-[#070B14] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                {lang === "tr" ? "Nicel Motor Mimarisi" : "Quantitative Architecture"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {lang === "tr"
                  ? "Kod Yazmadan Kurumsal Seviye Backtest ve Sinyal Optimizasyonu"
                  : "Institutional Backtesting & Parameter Sweeps Without Writing Pine Script"}
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-emerald-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "1. 6-Strateji Performans Ligi"
                    : "1. 6-Strategy Quant Tournament"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "Donchian Kırılımı, Dual EMA, Wilder RSI, Bollinger Alt Bant, MACD İvme ve Balina Hacim algoritmaları aynı anda çalıştırılır; Net Kâr, Alpha, Profit Factor ve Max Drawdown'a göre sıralanır."
                    : "Runs Donchian, Dual EMA, Wilder RSI, Bollinger, MACD, and Volume Spike simultaneously on identical candles—ranking the true winner by risk-adjusted return and Profit Factor."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-blue-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "2. 36 Kombinasyon Auto-Optimizer"
                    : "2. 36-Setup Auto-Optimizer"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "Hangi Stop-Loss (%1.5–%4) ve Take-Profit (%4–%12) oranının o coinde en az erimeyle en yüksek getiriyi verdiğini tahmin etme — 36 senaryoyu saniyede tarat."
                    : "Stop guessing Stop-Loss or Take-Profit ratios. One click sweeps 36 strategy + SL/TP pairs in milliseconds to isolate the highest Sharpe and lowest Max Drawdown setup."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-indigo-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "3. Canlı AL/SAT Noktaları & Kasa Eğrisi"
                    : "3. Live Execution Markers & Equity Curve"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "300 mum grafiği üzerinde her giriş, kârlı TP çıkışı ve SL noktasını nokta atışı gör; strateji kasa eğrisini Al-Tut getirisi ve güncel stop/hedef seviyeleriyle kıyasla."
                    : "Inspect every Buy entry, TP win, and SL exit directly plotted on 300 real candles alongside live Strategy Equity vs. Buy & Hold trajectories and current SL/TP levels."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Deterministic Math & API Safety Proof */}
        <section id="security" className="border-b border-slate-800/80 bg-[#050811] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 rounded-2xl border border-slate-800 bg-[#0B1120] p-6 sm:p-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  {lang === "tr" ? "Borsa API Anahtarı Yok · Halüsinasyon Yok" : "Zero API Keys · Zero AI Hallucinations"}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {lang === "tr"
                    ? "Non-Repainting Bar Simülasyonu & Sıfır Borsa Riski"
                    : "Strict Intrabar SL/TP Execution in Your Browser"}
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {lang === "tr"
                    ? "Stratejiler geçmişe dönük yeniden boyama (repainting) yapmaz; mum açıldıktan sonra Low/High fitillerini sırayla kontrol eder, gidiş-dönüş komisyonu düşer ve borsa API anahtarını asla istemez."
                    : "Indicators read prior closed bars with zero repainting. Every trade deducts round-trip exchange fees, checks intrabar Low/High stop/target triggers chronologically, and never touches your exchange credentials."}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
                    0.08% Fee/Side Deducted
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    No API Keys or Wallet Needed
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                    Intrabar SL / TP Priority
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#050811] p-4 font-mono text-xs text-slate-300 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>quantBacktester.ts &rarr; Intrabar Audit</span>
                  <span className="text-emerald-400 font-semibold">36 Sweeps &lt; 25ms</span>
                </div>
                <pre className="mt-3 overflow-x-auto leading-relaxed text-[11px] text-slate-300">
{`GET  api.binance.com/api/v3/klines?limit=300
RULE Non-repainting prior-bar Donchian / EMA / RSI / BB
EXEC Check candle.low <= stopPrice  -> Exit SL (First)
EXEC Check candle.high >= targetPrice -> Exit TP
COST Deduct (0.08% x 2 x leverage) round-trip fee`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Quant Pricing Section */}
        <section id="pricing" className="border-b border-slate-800/80 bg-[#070B14] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {lang === "tr"
                  ? "Aylık Abonelik Tuzağı Yok — Tek Seferlik Net Erişim"
                  : "Zero Subscription Traps — One-Time Quant Passes"}
              </h2>
              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                {lang === "tr"
                  ? "İlk 36-kombinasyon taramanı ve temel pariteleri tamamen ücretsiz dene. 12 varlıklı Alpha Radar, 15m/1D dilimler ve sınırsız optimizasyon için tek seferde yükselt."
                  : "Test 6 strategies and your 1st 36-combination Auto-Optimize sweep completely free. Unlock all 12 pairs, 15m/1D timeframes, and CSV export with one-time passes."}
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {/* Free Tier */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0B1120] p-7">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {lang === "tr" ? "Ücretsiz Başlangıç" : "Free Starter"}
                    </h3>
                    <span className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                      {lang === "tr" ? "Her Zaman $0" : "$0 Forever"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white mono-nums">$0</span>
                    <span className="text-sm text-slate-400">
                      {lang === "tr" ? "/ süresiz" : "forever"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {lang === "tr"
                      ? "BTC, ETH, SOL, BNB ve Altın (PAXG) üzerinde canlı backtest + 1 adet ücretsiz Auto-Optimize taraması."
                      : "Full 6-strategy backtests on BTC, ETH, SOL, BNB & PAXG (1H/4H) + 1 free 36-setup Auto-Optimize run."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "5 ana varlıkta 300 mum canlı backtest"
                        : "300-bar live backtest across 5 core pairs"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>
                          {lang === "tr"
                            ? "1. 36-Kombinasyon Auto-Optimize ücretsiz"
                            : "1st 36-Setup Auto-Optimize free"}
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "Canlı AL/SAT noktaları & kasa eğrisi"
                        : "Buy/TP/SL plot markers & equity curve"}
                    </li>
                  </ul>
                </div>
                <a
                  href="#workbench"
                  className="mt-8 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  {lang === "tr" ? "Terminalde Ücretsiz Dene" : "Launch Free Terminal"}
                </a>
              </div>

              {/* 7-Day Quant Pass */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-400 bg-[#0B1120] p-7 shadow-xl shadow-emerald-950/30">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {lang === "tr" ? "7 Günlük Quant Pro Paket" : "7-Day Quant Pass"}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-0.5 text-xs font-bold text-slate-950">
                      <Sparkles className="h-3 w-3" />{" "}
                      {lang === "tr" ? "En Popüler" : "Most Popular"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white mono-nums">$12</span>
                    <span className="text-sm text-slate-400">
                      {lang === "tr" ? "tek seferlik" : "one-time pass"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {lang === "tr"
                      ? "12 varlıklı Alpha Radar, 15m/1D zaman dilimleri ve sınırsız 36-kombinasyon taraması."
                      : "Full access to all 12 coins, 15m scalping / 1D macro bars & unlimited optimizations."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "12 varlığın tamamı (XRP, DOGE, AVAX, SUI, LINK, ADA, ARB)"
                        : "All 12 assets including XRP, DOGE, AVAX, SUI, LINK, ADA & ARB"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "15m, 1H, 4H, 1D tüm zaman dilimleri açık"
                        : "Unlock 15m scalping & 1D swing timeframes"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "Sınırsız Auto-Optimize & İşlem Dökümü (.csv)"
                        : "Unlimited Auto-Optimize sweeps & CSV trade export"}
                    </li>
                  </ul>
                </div>
                <a
                  href={passCheckout}
                  target={passCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={passCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-xs hover:bg-emerald-300 transition-colors"
                >
                  {lang === "tr" ? "7 Günlük Quant Paketi Al ($12)" : "Get 7-Day Quant Pass ($12)"}
                </a>
              </div>

              {/* Annual Pro */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0B1120] p-7">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {lang === "tr" ? "Yıllık Quant Pro Lisans" : "Annual Quant Pro"}
                    </h3>
                    <span className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                      {lang === "tr" ? "365 Gün Tam Erişim" : "Full Year"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white mono-nums">$29</span>
                    <span className="text-sm text-slate-400">
                      {lang === "tr" ? "/ yıl" : "/ year"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {lang === "tr"
                      ? "12 ay tek seferlik ödeme — yıl boyu strateji optimizasyonu ve sınırsız kullanım."
                      : "One-time annual pass — zero auto-renewal. Ideal for year-round systematic trading."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "7 Günlük Paketteki tüm Pro özellikler 1 yıl açık"
                        : "Everything in 7-Day Pass unlocked for 365 days"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "Çoklu Zaman Dilimi Alpha Tarayıcı & Kopyalanabilir Emir Bileti"
                        : "Multi-Timeframe Alpha Scanner & Copyable Order Setup"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "Anında VS-... lisans anahtarı & e-posta aktivasyonu"
                        : "Instant Polar email activation & VS-... license key"}
                    </li>
                  </ul>
                </div>
                <a
                  href={proCheckout}
                  target={proCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={proCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-xs hover:bg-slate-200 transition-colors"
                >
                  {lang === "tr" ? "Yıllık Quant Pro Al ($29/yıl)" : "Get Annual Quant Pro ($29/yr)"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Quant FAQ Section */}
        <section id="faq" className="bg-[#050811] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                {lang === "tr" ? "Sık Sorulan Sorular" : "FAQ"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {lang === "tr" ? "Merak Edilenler" : "Frequently Asked Questions"}
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6"
                >
                  <h3 className="text-sm font-bold text-white">{faq.question}</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#050811] py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white">VaultSheet Quant</span>
            <span>
              &middot;{" "}
              {lang === "tr"
                ? "Tarayıcı İçi Nicel Backtest & Optimizasyon Terminali"
                : "Client-Side Quantitative Backtest & Auto-Optimizer"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">
              {lang === "tr" ? "Gizlilik" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {lang === "tr" ? "Koşullar & İade" : "Terms & Refunds"}
            </Link>
            <a href="/sitemap.xml" className="hover:text-white transition-colors">
              sitemap.xml
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
