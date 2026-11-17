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
    question: "12 Parite, 1.000 Mum Tarihçesi ve Vadeli Verisi engelli ülkelerde de çalışıyor mu?",
    answer:
      "Evet. Sunucu tarafında çalışan çoklu borsa proxy'si (/api/market); birincil olarak Binance Vision (1.000 gerçek OHLCV mum), yedek olarak Binance Spot ve Bybit Linear Perpetual API'lerini paralel sorgular. Binance Futures Funding, Open Interest ve Balina L/S verisi de aynı şekilde Bybit yedeğiyle desteklenir.",
  },
  {
    question: "Kör Walk-Forward OOS (%70/%30) nasıl sıfır sızıntıyla çalışıyor?",
    answer:
      "Auto-Optimizer 36 strateji + SL/TP ayarını YALNIZCA ilk %70 Eğitim (In-Sample) mumlarında yarıştırıp kilitler; son %30'a (görünmemiş gelecek dilime) hiç bakmaz. Ardından kazanan ayarı tam seride çalıştırıp son %30 Kör OOS getirisini, işlem başı Expectancy ve Half-Kelly kasa riskini gösterir.",
  },
  {
    question: "Komisyon, kayma (slippage), fonlama ve likidasyon hesaba katılıyor mu?",
    answer:
      "Evet. Her işlemde gidiş-dönüş %0.06/taraf borsa komisyonu, %0.04/taraf piyasa kayması (slippage) ve pozisyonun açık kaldığı 8 saatlik fonlama maliyetleri net getiriden düşülür; seçtiğiniz kaldıraca göre tahmini likidasyon fiyatı hesaplanır.",
  },
  {
    question: "Tarayıcı veya bilgisayar kapansa da Telegram / Discord alarmı gelir mi?",
    answer:
      "Evet. Hesabınıza giriş yaptığınızda Telegram Bot Token'ınız sunucuda AES-256-GCM ile şifrelenir. İzlemek istediğiniz coinleri ve kanalınızı buluta kaydedip kişisel imzalı 7/24 Cron URL'nizi (/api/cron/sentinel) veya günlük bulut tarayıcısını aktif edebilirsiniz.",
  },
  {
    question: "Ücretsiz sürüm ile $12 / $29 Pro lisans arasındaki fark nedir?",
    answer:
      "BTC, ETH, SOL, BNB ve PAXG (Altın) üzerinde 1.000 mumluk Long+Short Sıfır-Sızıntılı OOS backtest, MTF 4 zaman dilimi uyumu, canlı Futures Squeeze barı ve 1 adet ücretsiz 36-test taraması ücretsizdir. $12 7 Günlük Paket ve $29/yıl Pro lisans ise tüm 12 coini (XRP, DOGE, AVAX, SUI, LINK, ADA, ARB), 15m/1D dilimleri, sınırsız tarama, bulut watchlist ve CSV ihracını açar.",
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
                  ? "VaultSheet Quant · 1.000 Mum · Sıfır-Sızıntılı Kör OOS · 7/24 Bulut Cron"
                  : "VaultSheet Quant · 1,000 Bars · Zero-Leakage Blind OOS · 24/7 Cloud Sentinel"}
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                {lang === "tr"
                  ? "Ezberi Boz — 1.000 Mum Kör OOS, MTF Uyum & 7/24 Bulut Bot Nöbetçisi"
                  : "Zero-Leakage Quant — 1,000-Bar Blind OOS, Multi-Exchange Perps & 24/7 Cloud Alerts"}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base leading-relaxed">
                {lang === "tr"
                  ? "Binance Vision + Bybit yedeğiyle 12 paritede 1.000 gerçek mum, komisyon+kayma+fonlama kesintisi, Half-Kelly kasa riski, MTF uyumu ve sekmeyi kapatsan bile çalışan AES-256 şifreli Telegram/Discord nöbetçisi."
                  : "Multi-exchange 1,000 OHLCV bars (Binance Vision + Bybit fallback) with strict first-70% training / blind-30% OOS, fees+slippage+funding drag, MTF confluence & encrypted 24/7 Discord/Telegram cloud webhooks."}
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
                {lang === "tr" ? "Kurumsal Nicel Mimari" : "Quantitative Architecture"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {lang === "tr"
                  ? "TradingView'da Bedava Olmayan Gerçek Vadeli & OOS İstihbaratı"
                  : "Walk-Forward OOS Verification, Perp Derivatives & Webhook Dispatch"}
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-emerald-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "1. Long+Short & %70/%30 OOS Turnuvası"
                    : "1. Bi-Directional & 70/30 OOS Tournament"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "Sadece Long değil Long+Short çift yönlü mum içi SL/TP + komisyon simülasyonu çalıştırır; stratejiyi ilk %70 Eğitim ve son %30 görünmemiş veri (OOS) üzerinde doğrulayarak overfit tuzaklarını eler."
                    : "Runs full Long+Short intrabar SL/TP simulations with fees, splitting 70% Train vs 30% Unseen Out-of-Sample bars to expose curve-fitted strategies immediately."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-blue-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "2. Canlı Futures Squeeze & Balina Radar"
                    : "2. Live Futures Funding, OI & Whale Squeeze"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "Binance Futures fapi üzerinden 12 coinin gerçek Fonlama Oranı, Open Interest, Top Trader Balina Long/Short oranı ve Taker hacim dengesini okuyarak Short/Long Squeeze riskini yakalar."
                    : "Reads real Binance Futures Funding Rates, Open Interest, Whale Long/Short ratios, and Taker flow across all 12 assets to surface squeeze conditions in real time."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition hover:border-indigo-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">
                  {lang === "tr"
                    ? "3. Discord / Telegram / JSON Bot Köprüsü"
                    : "3. Discord, Telegram & 60s Sentinel Bridge"}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {lang === "tr"
                    ? "60sn Canlı Nöbetçi yeni kırılımı tespit ettiğinde sesli alarm çalar; Giriş, SL, TP ve Tahmini Likidasyon fiyatını Discord, Telegram veya kendi bot webhook'una anında fırlatır."
                    : "Activate the 60s Live Sentinel for audible alerts and auto-dispatch structured Entry, SL, TP, and Liquidation plans directly to Discord, Telegram, or custom bots."}
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
                  {lang === "tr" ? "Borsa API Şifresi Yok · Anti-Overfit OOS" : "Zero API Keys · Anti-Overfit OOS"}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {lang === "tr"
                    ? "Çift Yönlü Mum İçi İcra, Likidasyon & OOS Doğrulama"
                    : "Strict Intrabar Long/Short Execution & 30% Unseen OOS Audit"}
                </h3>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {lang === "tr"
                    ? "Stratejiler geçmişe dönük yeniden boyama (repainting) yapmaz; mum açıldıktan sonra Long veya Short Stop/TP seviyelerini kontrol eder, kaldıraca göre tahmini likidasyon fiyatını çıkarır ve borsa API şifrenizi asla istemez."
                    : "Non-repainting bar rules check intrabar SL/TP hits chronologically for both Long and Short sides, estimate leveraged liquidation levels, and verify unseen 30% OOS performance without ever touching exchange credentials."}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
                    70% Train / 30% Unseen OOS
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    Live Funding · OI · Whale L/S
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                    Discord · Telegram · Bot Hooks
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#050811] p-4 font-mono text-xs text-slate-300 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>marketData.ts + quantBacktester.ts &rarr; Institutional Audit</span>
                  <span className="text-emerald-400 font-semibold">1,000 Bars · Zero Leak</span>
                </div>
                <pre className="mt-3 overflow-x-auto leading-relaxed text-[11px] text-slate-300">
{`GET  /api/market  -> Binance Vision (1000B) / Bybit Linear Fallback
OPT  Optimize strictly inside [0..70%] Train -> Test [70%..100%] Blind OOS
COST Deduct 0.06% fee + 0.04% slippage/side + 8h funding drag * lev
CRON GET /api/cron/sentinel -> Encrypted AES-256 Telegram / Discord Push`}
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
                        ? "Long+Short OOS doğrulama, Futures Squeeze & Discord/Telegram test gönderimi"
                        : "Long+Short OOS audit, Perp Squeeze & Webhook alert dispatch"}
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
                      ? "12 gerçek Binance varlığı, 15m/1D dilimler, canlı Futures Funding & sınırsız OOS taraması."
                      : "Full access to all 12 real pairs, 15m scalping / 1D bars & unlimited OOS sweeps."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "12 gerçek parite + canlı Funding / OI / Balina Squeeze"
                        : "All 12 live pairs + Futures Funding / OI / Whale Squeeze"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      {lang === "tr"
                        ? "15m, 1H, 4H, 1D tüm zaman dilimleri & 60sn Nöbetçi"
                        : "Unlock 15m scalping, 1D swing & 60s Live Sentinel"}
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
                        ? "Bulut Webhook Senkronu (Discord · Telegram · Bot)"
                        : "Cloud Webhook Sync (Discord · Telegram · Bot URL)"}
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
