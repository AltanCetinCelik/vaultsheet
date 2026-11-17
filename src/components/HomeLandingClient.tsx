"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ConverterWorkbench from "@/components/ConverterWorkbench";
import NavbarAuthButtons from "@/components/NavbarAuthButtons";
import { useAppLang } from "@/lib/useAppLang";
import type { SeoBankEntry } from "@/lib/types";

export interface FaqEntry {
  question: string;
  answer: string;
}

interface RegionCountItem {
  region: string;
  count: number;
}

interface HomeLandingClientProps {
  totalBanks: number;
  featuredBanks: SeoBankEntry[];
  regionCounts: RegionCountItem[];
  passCheckout: string;
  proCheckout: string;
  faqsEn: FaqEntry[];
}

const FAQS_TR: FaqEntry[] = [
  {
    question: "Banka PDF ekstrelerim gerçekten sunucuya gönderilmiyor mu?",
    answer:
      "Kesinlikle hayır. VaultSheet PDF koordinat çözümleme, yerel Tesseract OCR, kuruş mutabakatı ve vergi/kaçak analizini tamamen tarayıcı belleğinde (RAM) çalıştırır. Wi-Fi kapalıyken veya Chrome DevTools -> Network sekmesi açıkken tek bayt veri çıkmadığını doğrulayabilirsin.",
  },
  {
    question: "Piyasa & Kasa Riski Terminali ile Ekstre Röntgeni nasıl birlikte çalışıyor?",
    answer:
      "Ekstre Denetim Stüdyosu'nda kestiğin tekrarlayan abonelik ve gizli banka masrafları otomatik olarak Canlı Piyasa Terminali'ndeki 20 işlem / 12 ay bileşik portföy büyüme eğrine eklenir. Tek bir işlem riski veya kazanma oranı kaydırıcısını oynatarak etkisini canlı görürsün.",
  },
  {
    question: "Ücretsiz kullanım ile $12 / $29 Pro paket arasındaki fark nedir?",
    answer:
      "Canlı Piyasa Tarayıcısı, Pozisyon Riski Motoru, Para Kaçağı & Vergi Kalkanı hesaplayıcıları, yasal iptal/iade dilekçesi üretimi ve ilk yüklediğin tam ekstre için 100 satıra kadar Excel (.xlsx) indirme tamamen ücretsizdir. $12 7 Günlük Paket ve $29/yıl Pro lisans ise sınırsız satır, çoklu PDF birleştirme, sınırsız Excel/QuickBooks (.QBO) ve CPA Denetim PDF çıktısını açar.",
  },
  {
    question: "Taranmış (resim) veya şifreli banka PDF'lerini okuyabiliyor mu?",
    answer:
      "Evet. Şifreli bir ekstre attığında yerel şifre çözme penceresi açılır; metin katmanı olmayan taranmış veya kamera çekimi PDF'lerde ise sunucuya yüklemeden tarayıcı içi yerel OCR (Türkçe + İngilizce) motoru devreye girer.",
  },
  {
    question: "Türk bankaları ve uluslararası kurumlarla uyumlu mu?",
    answer:
      "Garanti BBVA, İş Bankası, Yapı Kredi, Akbank, Ziraat, Enpara/QNB dahil TRY/TL ekstrelerin (B)/(A), Devreden Bakiye ve GG.AA.YYYY formatlarının yanı sıra Chase, Wise, Mercury, Revolut, HSBC gibi 64+ global bankayı otomatik normalleştirir.",
  },
  {
    question: "6502 TKHK ve BDDK iptal / ücret iade dilekçeleri nasıl üretiliyor?",
    answer:
      "Kaçak, Vergi & Rapor modülünde tespit edilen herhangi bir abonelik veya EFT/işletim masrafı için Dilekçe Üret butonuna bastığında banka adı, hesap son 4 hanesi, işlem tutarı ve tarih otomatik doldurularak kopyalanabilir ve .txt olarak indirilebilir resmi metin hazırlanır.",
  },
];

export default function HomeLandingClient({
  totalBanks,
  featuredBanks,
  regionCounts,
  passCheckout,
  proCheckout,
  faqsEn,
}: HomeLandingClientProps) {
  const [lang] = useAppLang();
  const faqs = lang === "tr" ? FAQS_TR : faqsEn;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Obsidian-Glass Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-blue-600 text-slate-950 shadow-sm transition group-hover:scale-105">
              <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              VaultSheet
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#workbench" className="hover:text-white transition-colors">
              {lang === "tr" ? "Çalışma Alanı" : "Workspace"}
            </a>
            <Link href="/convert" className="hover:text-white transition-colors">
              {totalBanks} {lang === "tr" ? "Banka" : "Banks"}
            </Link>
            <a href="#security" className="hover:text-white transition-colors">
              {lang === "tr" ? "Gizlilik Kanıtı" : "Privacy Proof"}
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
        {/* Deep Obsidian Glow Hero + Live 3-Engine Workbench */}
        <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-10%,rgba(16,185,129,0.18),rgba(37,99,235,0.12)_50%,transparent_80%)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 lg:px-8 lg:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {lang === "tr"
                  ? "VaultSheet Suite · %100 Yerel Gizlilik · 3 Finansal Motor Tek Çatıda"
                  : "VaultSheet Suite · 100% Local Privacy · 3 Engines Under One Roof"}
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                {lang === "tr"
                  ? "Paranı Yönet, Kaçakları Kes, Ekstrelerini Saniyeler İçinde Denetle"
                  : "Size Your Market Risk, Cut Hidden Money Leaks & Reconcile Any Bank PDF"}
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base leading-relaxed">
                {lang === "tr"
                  ? "Canlı 24s piyasa radarı ve kasa risk simülatörü, kuruşu kuruşuna PDF → Excel/QBO çevirici (yerel OCR + şifre çözme), %20 KDV & vergi kalkanı ve 6502/BDDK dilekçe motoru tarayıcında çalışır."
                  : "Live 24h market breakout scanner & position risk curve, cent-reconciled PDF → Excel/QBO converter (local OCR + password unlock), KDV/Tax write-off shield, and legal demand engine inside browser RAM."}
              </p>
            </div>

            {/* Embedded Live Suite */}
            <div id="workbench" className="mt-8 scroll-mt-20">
              <ConverterWorkbench defaultPreset="garanti" />
            </div>
          </div>
        </section>

        {/* 3 Core Suite Pillars Overview */}
        <section id="how-it-works" className="border-b border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 transition hover:border-emerald-300 hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-emerald-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {lang === "tr"
                    ? "1. Canlı Piyasa & Kasa Riski Terminali"
                    : "1. Live Market & Wealth Curve Terminal"}
                </h2>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "Anlık 24s fiyat bandı kırılımlarını ve dip bölgelerini tarar; R:R oranı, başabaş yüzdesi ve 20 işlem sonu bileşik portföy eğrisini hesaplar."
                    : "Tracks live 24h range breakouts, oversold dip zones, and volatility spikes—then simulates exact position sizes, R:R ratios, and 20-trade compounded wealth curves."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 transition hover:border-blue-300 hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {lang === "tr"
                    ? "2. Sıfır Hata PDF → Excel & QBO Çevirici"
                    : "2. Zero-Upload PDF → Excel & QBO Engine"}
                </h2>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "Dijital, taranmış (yerel Tesseract OCR) veya şifreli PDF'leri tarayıcı RAM'inde çözer. Orijinal sayfayla yan yana görüp ilk dosyanı ücretsiz .xlsx al."
                    : "Decrypts password PDFs, runs browser-local Tesseract OCR on scans, checks Opening + Deposits − Withdrawals = Closing to 0.00 diff, and exports Excel (1st file free) or QBO."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 transition hover:border-indigo-300 hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {lang === "tr"
                    ? "3. Kaçak Avcısı, Vergi Kalkanı & Dilekçe"
                    : "3. Spend Leak, Tax Shield & Legal Studio"}
                </h2>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "Sessiz SaaS aboneliklerini ve EFT masraflarını tespit eder; %20 KDV + GVK vergi kalkanını hesaplar ve tek tıkla 6502/BDDK iade ihtarnamesi üretir."
                    : "Spots recurring SaaS & wire fee drains, models KDV (20%) & Schedule C / GVK write-offs, generates formal cancel/refund notices, and copies verified CPA audit reports."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Architecture Proof */}
        <section id="security" className="border-b border-slate-200 bg-[#f8fafc] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {lang === "tr" ? "%100 Cihaz İçi Gizlilik" : "100% On-Device Privacy"}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "Banka ekstrelerin asla bir bulut sunucusuna yüklenmez. Wi-Fi kapalıyken bile her satır tarayıcı belleğinde çözülür."
                    : "Financial statements never touch a remote cloud server. Coordinate parsing and reconciliation run strictly inside local browser RAM."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {lang === "tr"
                    ? "Kuruşu Kuruşuna Matematik Mutabakatı"
                    : "Automatic Cent-Level Reconciliation"}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "ChatGPT gibi satır atlamaz veya rakam uydurmaz; Açılış + Giriş − Çıkış = Kapanış formülünü her işlemde doğrular."
                    : "VaultSheet checks Opening Balance + Deposits − Withdrawals = Closing Balance row-by-row so you never import a broken ledger."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {lang === "tr"
                    ? "8 Muhasebe Formatı & CPA Sertifikası"
                    : "8 Accounting Formats & CPA Certificate"}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "3 sayfalı Excel (.xlsx), OL-222 hatasız QuickBooks (.qbo), Xero CSV, OFX, JSON ve denetime hazır PDF Audit Sertifikası üretir."
                    : "Exports 3-sheet Excel workbooks (.xlsx), OL-222 compliant Web Connect .QBO, QuickBooks CSV, Xero CSV, OFX, JSON, and Audit Certificate PDFs."}
                </p>
              </div>
            </div>

            {/* Verifiable Local-Processing Proof Card */}
            <div className="mt-8 grid items-center gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  {lang === "tr"
                    ? "Chrome DevTools Üzerinden Doğrulanabilir"
                    : "Verifiable In Chrome DevTools"}
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {lang === "tr"
                    ? "Gizliliğe Sadece Sözle Güvenme — Network Sekmesini Kendin Kontrol Et"
                    : "Don't Take Privacy on Faith — Inspect the Network Tab Yourself"}
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  {lang === "tr"
                    ? "Chrome DevTools → Network sekmesini aç, istersen interneti kes ve çok sayfalı ekstreni sürükle. Sunucuya 0 bayt gider; tüm pdfjs ve Tesseract OCR işlemleri bilgisayarında çalışır."
                    : "Open Chrome DevTools → Network tab, disconnect Wi-Fi if you want, and drop any PDF. Zero upload requests fire because coordinate extraction, OCR, and XLSX assembly run locally."}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>DevTools &rarr; Network Filter: Fetch/XHR</span>
                  <span className="text-emerald-400 font-semibold">0 bytes uploaded</span>
                </div>
                <pre className="mt-3 overflow-x-auto leading-relaxed text-[11px] text-slate-300">
{`POST /api/upload-pdf        [NONE - Does Not Exist]
POST /api/ocr-extract       [NONE - Local pdfjs + Tesseract]
RAM  Statement Buffer   ->  100% In-Browser Parsing
OUT  garanti-ekim.xlsx  ->  Local Blob Download`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-b border-slate-200 bg-white py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {lang === "tr"
                  ? "Otomatik Yenileme Tuzağı Yok — Tek Seferlik Net Paketler"
                  : "Simple, One-Time Passes — Zero Subscription Traps"}
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                {lang === "tr"
                  ? "Piyasa terminali, kaçak/vergi röntgeni ve ilk tam Excel (.xlsx) ekstren ücretsiz. Sadece sınırsız toplu çıktı gerektiğinde yükselt."
                  : "Use the Market Risk Terminal, Leak & Tax Studio, and export your 1st full Excel (.xlsx) statement free. Upgrade only for unlimited scale."}
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {/* Free Tier */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      {lang === "tr" ? "Ücretsiz Başlangıç" : "Free Starter"}
                    </h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {lang === "tr" ? "Her Zaman $0" : "$0 Forever"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$0</span>
                    <span className="text-sm text-slate-500">
                      {lang === "tr" ? "/ süresiz" : "forever"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {lang === "tr"
                      ? "Canlı Piyasa Terminali, Kaçak & Vergi Röntgeni ve 100 satıra kadar 1. tam Excel (.xlsx) çıktısı ücretsiz."
                      : "Full Market & Risk Terminal, Spend Leak & Tax Studio, and your 1st full Excel (.xlsx) export free (up to 100 rows)."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>
                          {lang === "tr"
                            ? "1. tam Excel (.xlsx) çıktısı ücretsiz"
                            : "1st full Excel (.xlsx) export free"}
                        </strong>{" "}
                        ({lang === "tr" ? "100 satıra kadar" : "up to 100 rows"})
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Canlı Piyasa Tarayıcısı & Kasa Eğrisi Simülatörü"
                        : "Live Market Scanner & Equity Curve Simulator"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Vergi & KDV Kalkanı + 1 tıkla iptal/iade dilekçesi"
                        : "Tax & VAT Shield + 1-click legal cancel/refund notices"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Taranmış OCR & şifreli PDF yerel açma"
                        : "Local Tesseract OCR & password-protected PDF unlock"}
                    </li>
                  </ul>
                </div>
                <a
                  href="#workbench"
                  className="mt-8 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  {lang === "tr" ? "Hemen Ücretsiz Kullan" : "Launch Workspace Free"}
                </a>
              </div>

              {/* 7-Day Pass */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-blue-600 bg-white p-7 shadow-lg shadow-blue-950/5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      {lang === "tr" ? "7 Günlük Tam Yetki Paketi" : "7-Day Full Suite Pass"}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      <Sparkles className="h-3 w-3" />{" "}
                      {lang === "tr" ? "En Popüler" : "Most Popular"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$12</span>
                    <span className="text-sm text-slate-500">
                      {lang === "tr" ? "tek seferlik" : "one-time pass"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {lang === "tr"
                      ? "Vergi dönemi, kredi başvurusu veya yoğun muhasebe kapatmaları için otomatik yenilemesiz tam erişim."
                      : "Built for quarterly close, mortgage underwriting, or tax sprints. No recurring billing."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Sınırsız satır & çoklu aylık PDF birleştirme"
                        : "Unlimited rows & multi-file PDF statement merge"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "8 format (.XLSX, .QBO, Xero, OFX) + CPA Audit PDF"
                        : "All 8 export formats + CPA Audit Certificate (.pdf)"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Anında lisans anahtarı & e-posta aktivasyonu"
                        : "Instant license key delivery (VS-...) via Polar"}
                    </li>
                  </ul>
                </div>
                <a
                  href={passCheckout}
                  target={passCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={passCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  {lang === "tr" ? "7 Günlük Paket Al ($12)" : "Get 7-Day Pass ($12)"}
                </a>
              </div>

              {/* Annual Pro */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      {lang === "tr" ? "Yıllık Pro Lisans" : "Annual Pro License"}
                    </h3>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {lang === "tr" ? "Müşavir & Ofisler" : "Firms & Traders"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 mono-nums">$29</span>
                    <span className="text-sm text-slate-500">
                      {lang === "tr" ? "/ yıl" : "/ year"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {lang === "tr"
                      ? "12 ay boyunca tek seferlik ödeme — yıl boyu defterler ve portföy yönetimi için."
                      : "One-time annual pass — zero auto-renewal. Built for year-round books and risk discipline."}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "7 Günlük Paketteki tüm özellikler 365 gün açık"
                        : "Everything in 7-Day Pass unlocked for 12 full months"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Çoklu müşteri / şirket ticari kullanım lisansı"
                        : "Commercial multi-client bookkeeping license"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      {lang === "tr"
                        ? "Özel banka ekstre şablonları için öncelikli destek"
                        : "Priority custom bank layout request turnaround"}
                    </li>
                  </ul>
                </div>
                <a
                  href={proCheckout}
                  target={proCheckout.startsWith("http") ? "_blank" : undefined}
                  rel={proCheckout.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
                >
                  {lang === "tr" ? "Yıllık Pro Al ($29/yıl)" : "Get Annual Pro Pass ($29/yr)"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Global Bank Directory Preview */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {lang === "tr"
                    ? `${totalBanks} Küresel Banka ve Format İçin Özel Profiller`
                    : `Dedicated Converters for ${totalBanks} Global Banks & Formats`}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {lang === "tr"
                    ? "ABD, İngiltere, Avrupa, Kanada, Avustralya ve Türk bankaları için hazır tarih, kur ve sütun tanıma ayarları."
                    : "Pre-tuned date conventions, decimal separators, and column detection profiles across US, UK, EU, Canadian, Australian, and global fintech institutions."}
                </p>
              </div>
              <Link
                href="/convert"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
              >
                {lang === "tr"
                  ? `${totalBanks} Bankanın Tamamını Gör`
                  : `View All ${totalBanks} Converters`}
                <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {regionCounts.map((item) => (
                <Link
                  key={item.region}
                  href="/convert"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-slate-900 transition-colors"
                >
                  {item.region}: <span className="font-bold text-blue-600">{item.count}</span>
                </Link>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBanks.map((bank) => (
                <Link
                  key={bank.slug}
                  href={`/convert/${bank.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">{bank.region}</span>
                    <span className="mono-nums rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {bank.currency}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {bank.bankName} &rarr; Excel &amp; QBO
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                    {bank.metaDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Bilingual FAQ Section */}
        <section id="faq" className="border-t border-slate-200 bg-[#f8fafc] py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {lang === "tr" ? "Sık Sorulan Sorular" : "FAQ"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {lang === "tr" ? "Merak Edilenler" : "Frequently Asked Questions"}
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
                >
                  <h3 className="text-sm font-bold text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-slate-900" />
            <span className="font-bold text-slate-900">VaultSheet</span>
            <span>
              &middot;{" "}
              {lang === "tr"
                ? "%100 Cihaz İçi Finansal Risk & Ekstre Platformu"
                : "100% Client-Side Financial Risk & Statement Suite"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/convert" className="hover:text-slate-900 transition-colors">
              {lang === "tr" ? `Bankalar (${totalBanks})` : `Supported Banks (${totalBanks})`}
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-qbo"
              className="hover:text-slate-900 transition-colors"
            >
              PDF to QBO
            </Link>
            <Link
              href="/convert/pdf-bank-statement-to-xero-csv"
              className="hover:text-slate-900 transition-colors"
            >
              PDF to Xero
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              {lang === "tr" ? "Gizlilik" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              {lang === "tr" ? "Koşullar & İade" : "Terms & Refunds"}
            </Link>
            <a href="/llms.txt" className="hover:text-slate-900 transition-colors">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-slate-900 transition-colors">
              sitemap.xml
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
