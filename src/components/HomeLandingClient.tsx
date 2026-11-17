"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShieldCheck } from "lucide-react";
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
    question: "12 Parite, 1.000 Mum Tarihçesi ve Vadeli Verisi nasıl çalışıyor?",
    answer:
      "Sunucu proxy'miz (/api/market); birincil olarak Binance Vision (1.000 gerçek OHLCV mum), yedek olarak Binance Spot ve Bybit/Gate Perpetual borsalarını paralel sorgular. Canlı fonlama oranı, açık pozisyon (OI) ve balina L/S dengesi gerçek zamanlı gelir.",
  },
  {
    question: "Kör Walk-Forward OOS (%70 / %30) aşırı uyumu nasıl önler?",
    answer:
      "Auto-Optimizer 36 strateji + SL/TP ayarını YALNIZCA ilk %70 Eğitim penceresinde yarıştırıp kilitler; son %30'a (görünmemiş gelecek dilime) hiç bakmaz. Kazanan ayar tam seride test edilip son %30 Kör OOS getirisi ayrıca raporlanır.",
  },
  {
    question: "Komisyon, kayma (slippage), fonlama ve likidasyon hesaba katılıyor mu?",
    answer:
      "Evet. Her işlemde gidiş-dönüş taraf başı %0.06 borsa komisyonu, %0.04 piyasa kayması (slippage) ve pozisyonun açık kaldığı 8 saatlik fonlama maliyeti net getiriden düşülür; seçtiğiniz kaldıraca göre tahmini likidasyon fiyatı hesaplanır.",
  },
  {
    question: "Tarayıcı veya bilgisayar kapansa da Telegram / Discord alarmı gelir mi?",
    answer:
      "Evet. Hesabınıza giriş yaptığınızda Telegram Bot Token'ınız sunucuda AES-256-GCM ile şifrelenir. İzlemek istediğiniz pariteleri ve kanalınızı buluta kaydedip kişisel imzalı 7/24 Cron URL'nizi (/api/cron/sentinel) kullanabilirsiniz.",
  },
  {
    question: "Ücretsiz sürüm ile $12 Pass / $29 Pro lisans arasındaki fark nedir?",
    answer:
      "BTC, ETH, SOL, BNB ve PAXG (Altın) üzerinde 1.000 mumluk Long+Short Sıfır-Sızıntılı OOS backtest, canlı Futures verisi ve 1 adet ücretsiz 36-senaryo taraması ücretsizdir. $12 7 Günlük Pass ve $29 Yıllık Pro ise tüm 12 pariteyi, 15m/1D dilimleri, limitsiz taramayı, 7/24 bulut watchlist'i ve CSV ihracını açar.",
  },
  {
    question: "Otomatik Yenileme (Auto-Renewal) tuzağı var mı?",
    answer:
      "Hayır. $12 7 Günlük Pass ve $29 Yıllık Pro tamamen tek seferlik lisanslardır. Süren bittiğinde kartından haberin olmadan otomatik para çekilmez.",
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
    <div className="min-h-screen flex flex-col bg-[#080B10] text-slate-100">
      {/* Solid Institutional Terminal Header (48px, Zero Bleed, Zero Nav Collision) */}
      <header className="sticky top-0 z-40 h-12 border-b border-white/[0.08] bg-[#0B0F17]">
        <div className="mx-auto flex h-full max-w-[1680px] items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span className="flex h-7 w-7 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-bold tracking-tight text-white">
                VaultSheet{" "}
                <span className="font-semibold text-emerald-400">Quant</span>
              </span>
            </Link>

            <span className="hidden h-4 w-px bg-white/[0.1] md:inline-block" />

            <h1 className="hidden truncate text-[11px] font-medium text-slate-400 md:block">
              {lang === "tr"
                ? "Çift Yönlü OOS Backtester · 12 Parite Canlı Vadeli Tarayıcı"
                : "Bi-Directional OOS Backtester · 12-Pair Live Futures Terminal"}
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400">
              <a href="#workbench" className="hover:text-white transition-colors">
                {lang === "tr" ? "Terminal" : "Terminal"}
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                {lang === "tr" ? "Planlar ($12 / $29)" : "Pricing ($12 / $29)"}
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                {lang === "tr" ? "SSS" : "FAQ"}
              </a>
            </nav>

            <NavbarAuthButtons dark />
          </div>
        </div>
      </header>

      {/* Immediate Above-the-Fold 3-Pane Trading Cockpit */}
      <main className="flex-1 w-full mx-auto max-w-[1680px]">
        <MarketRiskTerminal lang={lang} />

        {/* Aligned Hairline Pricing Strip (Zero Card Height Mismatch, Zero Contradictions) */}
        <section
          id="pricing"
          className="border-t border-white/[0.07] bg-[#090D14] px-4 py-10 sm:px-6"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  {lang === "tr" ? "Şeffaf Lisanslar · Otomatik Yenileme Yok" : "One-Time Access · Zero Auto-Renewal"}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                  {lang === "tr"
                    ? "Ücretsiz Başla, Hazır Olduğunda Tüm 12 Pariteyi Aç"
                    : "Start Free on 5 Core Pairs, Unlock All 12 Whenever Ready"}
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                {lang === "tr"
                  ? "Kart bilginizle otomatik abonelik açılmaz."
                  : "No hidden recurring billing or card traps."}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border border-white/[0.08] divide-y md:divide-y-0 md:divide-x divide-white/[0.08] rounded-md bg-[#0B0F17] overflow-hidden">
              {/* Plan 1: Free Starter */}
              <div className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex h-12 items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {lang === "tr" ? "Quant Başlangıç" : "Quant Starter"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {lang === "tr" ? "Kayıtsız · 5 Ana Parite" : "No signup · 5 Core Pairs"}
                      </p>
                    </div>
                    <span className="rounded border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
                      {lang === "tr" ? "Ücretsiz" : "Free"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1 border-b border-white/[0.06] pb-4">
                    <span className="mono-nums text-2xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-500">
                      {lang === "tr" ? "/ süresiz" : "/ forever"}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-[11.5px] text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "BTC, ETH, SOL, BNB & PAXG · 1.000 gerçek mum"
                          : "BTC, ETH, SOL, BNB & PAXG · 1,000 real bars"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "1H & 4H Çift Yönlü (Long+Short) backtest"
                          : "1H & 4H Bi-directional Long+Short backtest"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "1 ücretsiz 36-senaryo Kör OOS tarama + Test Webhook"
                          : "1 free 36-setup Blind OOS sweep + Webhook test"}
                      </span>
                    </li>
                  </ul>
                </div>

                <a
                  href="#workbench"
                  className="mt-6 inline-flex w-full items-center justify-center rounded border border-white/[0.12] bg-[#121822] py-2 text-xs font-semibold text-white transition hover:border-white/[0.25]"
                >
                  {lang === "tr" ? "Terminali Kullan" : "Use Free Terminal"}
                </a>
              </div>

              {/* Plan 2: 7-Day Pass */}
              <div className="flex flex-col justify-between p-5 bg-[#0D131D]">
                <div>
                  <div className="flex h-12 items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {lang === "tr" ? "7 Günlük Quant Pass" : "7-Day Quant Pass"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {lang === "tr" ? "Tek seferlik tam erişim" : "Full access · One-time"}
                      </p>
                    </div>
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                      {lang === "tr" ? "En Popüler" : "Most Popular"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1 border-b border-white/[0.06] pb-4">
                    <span className="mono-nums text-2xl font-extrabold text-white">$12</span>
                    <span className="text-xs text-slate-400">
                      {lang === "tr" ? "/ 7 gün tek ödeme" : "/ 7 days flat"}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-[11.5px] text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "Tüm 12 parite (XRP, DOGE, SUI, AVAX, LINK...)"
                          : "All 12 pairs unlocked (XRP, DOGE, SUI, AVAX...)"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "15m Scalping & 1D Swing + Limitsiz OOS tarama"
                          : "15m Scalping & 1D Swing + Unlimited OOS sweeps"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        {lang === "tr"
                          ? "AES-256 Şifreli 7/24 Bulut Cron + CSV İhracı"
                          : "AES-256 Cloud Watchlist Cron + CSV Export"}
                      </span>
                    </li>
                  </ul>
                </div>

                <a
                  href={passCheckout}
                  className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded bg-emerald-400 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                >
                  <span>{lang === "tr" ? "7 Günlük Pass Al — $12" : "Get 7-Day Pass — $12"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Plan 3: Annual Quant Pro */}
              <div className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex h-12 items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {lang === "tr" ? "Yıllık Quant Pro" : "Annual Quant Pro"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {lang === "tr" ? "365 gün kesintisiz terminal" : "365 days uninterrupted"}
                      </p>
                    </div>
                    <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 whitespace-nowrap">
                      {lang === "tr" ? "En Avantajlı" : "Best Value"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1 border-b border-white/[0.06] pb-4">
                    <span className="mono-nums text-2xl font-extrabold text-white">$29</span>
                    <span className="text-xs text-slate-400">
                      {lang === "tr" ? "/ yıl tek ödeme" : "/ year flat"}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-[11.5px] text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span>
                        {lang === "tr"
                          ? "Yıl boyu tüm 12 parite, tüm dilimler & tüm stratejiler"
                          : "Full-year access to all 12 pairs & timeframes"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span>
                        {lang === "tr"
                          ? "Sınırsız Kör OOS tarama & 7/24 Bulut Webhook Cron"
                          : "Unlimited Blind OOS sweeps & 24/7 Cloud Cron"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span>
                        {lang === "tr"
                          ? "Yeni indikatör & borsa modüllerine öncelikli erişim"
                          : "Priority access to all upcoming engine updates"}
                      </span>
                    </li>
                  </ul>
                </div>

                <a
                  href={proCheckout}
                  className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded border border-white/[0.14] bg-white/[0.07] py-2 text-xs font-bold text-white transition hover:bg-white/[0.12]"
                >
                  <span>{lang === "tr" ? "Yıllık Pro Al — $29/yıl" : "Get Annual Pro — $29/yr"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Compact Collapsible FAQ Accordion (Zero Bloat) */}
        <section
          id="faq"
          className="border-t border-white/[0.06] bg-[#080B10] px-4 py-8 sm:px-6"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
              {lang === "tr" ? "Sık Sorulan Sorular" : "Frequently Asked Questions"}
            </h2>
            <div className="divide-y divide-white/[0.06] rounded-md border border-white/[0.08] bg-[#0B0F17]">
              {faqs.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-200 hover:text-white">
                    <span>{item.question}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-3.5 text-xs leading-relaxed text-slate-400">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimal Institutional Footer (No exposed sitemap.xml) */}
      <footer className="border-t border-white/[0.07] bg-[#0B0F17] px-4 py-4">
        <div className="mx-auto flex max-w-[1680px] flex-col items-center justify-between gap-2 text-[11px] text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">VaultSheet Quant</span>
            <span>&middot;</span>
            <span>
              {lang === "tr"
                ? "Tarayıcı İçi Nicel Backtest & Optimizasyon Terminali"
                : "Client-Side Quantitative Backtesting Terminal"}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">
              {lang === "tr" ? "Gizlilik" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {lang === "tr" ? "Koşullar & İade" : "Terms & Refund"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
