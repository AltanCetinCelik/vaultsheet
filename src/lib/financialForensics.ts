import type { CategoryName, ParseResult, StatementMetadata } from "./types";

export type AppLang = "tr" | "en";

export interface MoneyLeakItem {
  id: string;
  transactionId: string;
  date: string;
  merchant: string;
  category: CategoryName;
  monthlyAmount: number;
  annualCost: number;
  fiveYearCompoundedCost: number;
  leakType: "subscription" | "bank_fee" | "high_burn";
  severity: "critical" | "warning" | "info";
  reasonTr: string;
  reasonEn: string;
}

export interface TaxDeductibleItem {
  id: string;
  transactionId: string;
  date: string;
  merchant: string;
  category: CategoryName;
  grossSpend: number;
  deductibleSharePct: number;
  vatSaved: number;
  incomeTaxSaved: number;
  totalTaxShield: number;
  lawRefTr: string;
  lawRefEn: string;
}

export interface CategorySpendSummary {
  category: CategoryName;
  totalOutflow: number;
  sharePct: number;
  txCount: number;
}

export interface ForensicsReport {
  leaks: MoneyLeakItem[];
  activeAnnualLeakTotal: number;
  savedMonthlyTotal: number;
  savedAnnualTotal: number;
  savedFiveYearCompounded: number;
  totalDetectedLeaksAnnual: number;
  totalBankFeesAnnual: number;
  taxItems: TaxDeductibleItem[];
  totalDeductibleSpend: number;
  totalVatShield: number;
  totalIncomeTaxShield: number;
  totalTaxCashback: number;
  categoryBreakdown: CategorySpendSummary[];
  savingsRatePct: number;
  healthScore: number;
}

// Monthly compounding factor over 60 months at 12% annual return (1% monthly):
// ((1 + 0.01)^60 - 1) / 0.01 = 81.669669856...
const FIVE_YEAR_COMPOUND_FACTOR = (Math.pow(1.01, 60) - 1) / 0.01;

const BANK_FEE_KEYWORDS_REGEX =
  /\b(FEE|FEES|KOMISYON|MASRAF|UCRET|ÜCRET|AIDAT|AİDAT|BSMV|OVERDRAFT|CHARGE|WIRE FEE|MONTHLY FEE|MAINTENANCE)\b/i;

const SUBSCRIPTION_KEYWORDS_REGEX =
  /\b(AWS|AMAZON WEB|GOOGLE|ADOBE|SLACK|NOTION|FIGMA|OPENAI|CHATGPT|PARASUT|PARAŞÜT|TELEKOM|FIBER|ABONELIK|ABONELİK|SUBSCRIPTION|SPOTIFY|NETFLIX|VERCEL|GITHUB|MICROSOFT|ZOOM|DROPBOX|HUBSPOT|LINEAR|STRIPE BILLING)\b/i;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface TaxRuleSpec {
  deductibleSharePct: number;
  vatEligible: boolean;
  lawRefTr: string;
  lawRefEn: string;
}

const TAX_RULES: Partial<Record<CategoryName, TaxRuleSpec>> = {
  "SaaS & Cloud": {
    deductibleSharePct: 100,
    vatEligible: true,
    lawRefTr: "GVK Md. 40/1 & KDV Md. 29 (%100 İndirilebilir Yazılım / Bulut Gideri)",
    lawRefEn: "IRS Schedule C Line 18/27 (100% Deductible SaaS & Cloud Software)",
  },
  "Marketing & Ads": {
    deductibleSharePct: 100,
    vatEligible: true,
    lawRefTr: "GVK Md. 40/1 & KDV Md. 29 (%100 Reklam & Dijital Pazarlama Gideri)",
    lawRefEn: "IRS Schedule C Line 8 (100% Advertising & Marketing Spend)",
  },
  "Travel & Meals": {
    deductibleSharePct: 70,
    vatEligible: true,
    lawRefTr: "GVK Md. 40/5 (Taşıt, Akaryakıt & İş Seyahati %70 Gider Kalkanı)",
    lawRefEn: "IRS Schedule C Line 9/24 (70% Business Fleet Fuel, Travel & Meals)",
  },
  "Utilities & Office": {
    deductibleSharePct: 50,
    vatEligible: true,
    lawRefTr: "GVK Md. 40/1 (Haberleşme, Fiber & Ofis İşletme Gideri %50 İşletme Payı)",
    lawRefEn: "IRS Schedule C Line 25 (Utilities, Telecom & Office 50% Business Share)",
  },
  "Bank Fees": {
    deductibleSharePct: 100,
    vatEligible: false,
    lawRefTr: "GVK Md. 40/1 (%100 İndirilebilir Bankacılık & EFT/FAST İşlem Masrafı)",
    lawRefEn: "IRS Schedule C Line 27a (100% Deductible Bank & Wire Service Charges)",
  },
  "Payroll & Contractors": {
    deductibleSharePct: 100,
    vatEligible: false,
    lawRefTr: "GVK Md. 40/1 (%100 İndirilebilir Personel Ücret & Hizmet Bedeli)",
    lawRefEn: "IRS Schedule C Line 11/26 (100% Payroll & Contractor Expense)",
  },
};

/**
 * Deterministic financial forensics engine:
 * Scans bank statement transactions for recurring money leaks, hidden bank fees,
 * 5-year compounded opportunity cost, tax & VAT shields, and overall cashflow health.
 */
export function analyzeStatementForensics(
  result: ParseResult,
  options?: {
    taxBracketPct?: number;
    includeVat?: boolean;
    cutLeakIds?: string[];
  }
): ForensicsReport {
  const taxBracketPct = Math.max(0, Math.min(60, options?.taxBracketPct ?? 25));
  const includeVat = options?.includeVat ?? true;
  const cutSet = new Set(options?.cutLeakIds ?? []);

  const leaks: MoneyLeakItem[] = [];
  const taxItems: TaxDeductibleItem[] = [];
  const catTotals = new Map<CategoryName, { totalOutflow: number; txCount: number }>();

  let totalOutflowSum = 0;

  for (const row of result.transactions) {
    if (row.amount >= 0) continue;
    const absAmount = round2(Math.abs(row.amount));
    if (absAmount <= 0) continue;

    totalOutflowSum += absAmount;
    const existingCat = catTotals.get(row.category) ?? { totalOutflow: 0, txCount: 0 };
    existingCat.totalOutflow = round2(existingCat.totalOutflow + absAmount);
    existingCat.txCount += 1;
    catTotals.set(row.category, existingCat);

    // 1. Money Leak & Drain Detection
    const isBankFee =
      row.category === "Bank Fees" || BANK_FEE_KEYWORDS_REGEX.test(row.description);
    const isSubscription =
      row.category === "SaaS & Cloud" ||
      row.category === "Utilities & Office" ||
      SUBSCRIPTION_KEYWORDS_REGEX.test(row.description);
    const isHighBurn =
      !isBankFee &&
      !isSubscription &&
      (row.category === "Marketing & Ads" || row.category === "Travel & Meals");

    if (isBankFee || isSubscription || isHighBurn) {
      const leakType: MoneyLeakItem["leakType"] = isBankFee
        ? "bank_fee"
        : isSubscription
          ? "subscription"
          : "high_burn";

      const annualCost = round2(absAmount * 12);
      const fiveYearCompoundedCost = round2(absAmount * FIVE_YEAR_COMPOUND_FACTOR);

      const severity: MoneyLeakItem["severity"] = isBankFee
        ? "critical"
        : row.category === "SaaS & Cloud" || annualCost >= 2500
          ? "warning"
          : "info";

      let reasonTr = "";
      let reasonEn = "";

      if (leakType === "bank_fee") {
        reasonTr =
          "Gizli Banka / EFT / BSMV Masrafı — Ticari hesap muafiyeti veya ücret iadesi talep edilebilir";
        reasonEn =
          "Hidden Bank / Wire / Maintenance Fee — Eligible for fee waiver or bank refund request";
      } else if (leakType === "subscription") {
        reasonTr =
          row.category === "Utilities & Office"
            ? "Tekrarlayan Telekom / Abonelik Faturası — Tarife & taahhüt indirimi kontrol edilmeli"
            : "Tekrarlayan SaaS / Bulut Aboneliği — Kullanılmayan lisans veya yıllık plan indirimi fırsatı";
        reasonEn =
          row.category === "Utilities & Office"
            ? "Recurring Telecom / Office Subscription — Audit plan rate & bundle discount"
            : "Recurring SaaS / Cloud Charge — Check for idle seats or annual billing discount";
      } else {
        reasonTr =
          row.category === "Marketing & Ads"
            ? "Yüksek Yakım (Reklam / Kampanya) — ROAS & bütçe tavanı denetimi önerilir"
            : "Operasyonel / Filo Yakıt Gideri — Bütçe sınırı ve %70 KDV/GVK kalkanı denetimi";
        reasonEn =
          row.category === "Marketing & Ads"
            ? "High-Burn Ad Spend — Audit ROAS efficiency and monthly budget cap"
            : "Operational / Fleet Spend — Audit expense cap and 70% tax deduction eligibility";
      }

      leaks.push({
        id: `leak-${row.id}`,
        transactionId: row.id,
        date: row.date,
        merchant: row.description,
        category: row.category,
        monthlyAmount: absAmount,
        annualCost,
        fiveYearCompoundedCost,
        leakType,
        severity,
        reasonTr,
        reasonEn,
      });
    }

    // 2. Tax & VAT Shield Calculation
    const taxRule = TAX_RULES[row.category];
    if (taxRule) {
      const effectiveGross = round2(absAmount * (taxRule.deductibleSharePct / 100));
      const vatSaved =
        includeVat && taxRule.vatEligible
          ? round2(effectiveGross - effectiveGross / 1.2)
          : 0;
      const netDeductibleBase = round2(effectiveGross - vatSaved);
      const incomeTaxSaved = round2(netDeductibleBase * (taxBracketPct / 100));
      const totalTaxShield = round2(vatSaved + incomeTaxSaved);

      taxItems.push({
        id: `tax-${row.id}`,
        transactionId: row.id,
        date: row.date,
        merchant: row.description,
        category: row.category,
        grossSpend: absAmount,
        deductibleSharePct: taxRule.deductibleSharePct,
        vatSaved,
        incomeTaxSaved,
        totalTaxShield,
        lawRefTr: taxRule.lawRefTr,
        lawRefEn: taxRule.lawRefEn,
      });
    }
  }

  // Sort leaks: bank fees & critical items / highest annual drain first
  leaks.sort((a, b) => {
    if (a.leakType === "bank_fee" && b.leakType !== "bank_fee") return -1;
    if (b.leakType === "bank_fee" && a.leakType !== "bank_fee") return 1;
    return b.annualCost - a.annualCost;
  });

  // Sort tax items: highest tax cashback first
  taxItems.sort((a, b) => b.totalTaxShield - a.totalTaxShield);

  const totalDetectedLeaksAnnual = round2(
    leaks.reduce((sum, item) => sum + item.annualCost, 0)
  );
  const totalBankFeesAnnual = round2(
    leaks
      .filter((item) => item.leakType === "bank_fee")
      .reduce((sum, item) => sum + item.annualCost, 0)
  );

  const activeAnnualLeakTotal = round2(
    leaks
      .filter((item) => !cutSet.has(item.id))
      .reduce((sum, item) => sum + item.annualCost, 0)
  );

  // If the user hasn't toggled any specific item yet, project recovery from all subscriptions + bank fees
  const selectedCutLeaks =
    cutSet.size > 0
      ? leaks.filter((item) => cutSet.has(item.id))
      : leaks.filter((item) => item.leakType === "subscription" || item.leakType === "bank_fee");

  const savedMonthlyTotal = round2(
    selectedCutLeaks.reduce((sum, item) => sum + item.monthlyAmount, 0)
  );
  const savedAnnualTotal = round2(savedMonthlyTotal * 12);
  const savedFiveYearCompounded = round2(savedMonthlyTotal * FIVE_YEAR_COMPOUND_FACTOR);

  const totalDeductibleSpend = round2(
    taxItems.reduce((sum, item) => sum + item.grossSpend, 0)
  );
  const totalVatShield = round2(taxItems.reduce((sum, item) => sum + item.vatSaved, 0));
  const totalIncomeTaxShield = round2(
    taxItems.reduce((sum, item) => sum + item.incomeTaxSaved, 0)
  );
  const totalTaxCashback = round2(totalVatShield + totalIncomeTaxShield);

  const categoryBreakdown: CategorySpendSummary[] = Array.from(catTotals.entries())
    .map(([category, info]) => ({
      category,
      totalOutflow: info.totalOutflow,
      sharePct:
        totalOutflowSum > 0 ? round2((info.totalOutflow / totalOutflowSum) * 100) : 0,
      txCount: info.txCount,
    }))
    .sort((a, b) => b.totalOutflow - a.totalOutflow);

  const { totalCredits, totalDebits, isFullyReconciled } = result.reconciliation;
  const savingsRatePct =
    totalCredits > 0
      ? round2(((totalCredits - totalDebits) / totalCredits) * 100)
      : totalDebits > 0
        ? -100
        : 0;

  // Cashflow health score (0-100)
  let score = 50;
  if (savingsRatePct >= 25) score += 22;
  else if (savingsRatePct >= 10) score += 14;
  else if (savingsRatePct >= 0) score += 6;
  else score -= 18;

  if (isFullyReconciled) score += 15;
  const monthlyFeeTotal = totalBankFeesAnnual / 12;
  if (monthlyFeeTotal === 0) score += 8;
  else if (totalOutflowSum > 0 && monthlyFeeTotal / totalOutflowSum > 0.02) score -= 8;

  const cutPenalty = cutSet.size > 0 ? Math.min(10, cutSet.size * 3) : 0;
  const healthScore = Math.max(12, Math.min(98, Math.round(score + cutPenalty)));

  return {
    leaks,
    activeAnnualLeakTotal,
    savedMonthlyTotal,
    savedAnnualTotal,
    savedFiveYearCompounded,
    totalDetectedLeaksAnnual,
    totalBankFeesAnnual,
    taxItems,
    totalDeductibleSpend,
    totalVatShield,
    totalIncomeTaxShield,
    totalTaxCashback,
    categoryBreakdown,
    savingsRatePct,
    healthScore,
  };
}

/**
 * Generates a ready-to-send formal cancellation or bank fee refund notice in Turkish or English.
 */
export function generateLegalActionNotice(
  item: MoneyLeakItem,
  metadata: StatementMetadata,
  lang: AppLang,
  currencyFormatted: string
): { title: string; subject: string; body: string } {
  const bankName = metadata.bankDetected || "Bank / Financial Institution";
  const acct = metadata.accountLast4 || "****";

  if (lang === "tr") {
    if (item.leakType === "bank_fee") {
      const title = "BDDK & 6502 Sayılı TKHK Kapsamında Masraf İadesi İhtarnamesi";
      const subject = `Hesap No ****${acct} — Haksız İşlem Masrafı / Komisyon İadesi ve Muafiyet Talebi (${currencyFormatted})`;
      const body = `${bankName} Müşteri İlişkileri ve İtiraz Birimi Dikkatine,

Konu: ****${acct} numaralı hesabımdan ${item.date} tarihinde tahsil edilen "${item.merchant}" açıklamalı ${currencyFormatted} tutarındaki işlem masrafının/komisyonun iadesi talebidir.

BDDK'nın Finansal Tüketicilerden Alınacak Ücretlere İlişkin Usul ve Esaslar Hakkında Yönetmelik hükümleri, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Ticari Bankacılık teamülleri uyarınca, ekstrede yer alan söz konusu kesintinin hukuki ve ticari mutabakatım dışında tahsil edildiği görülmüştür.

Gereği:
1. ${item.date} tarihli ${currencyFormatted} tutarındaki "${item.merchant}" kesintisinin ****${acct} numaralı hesabıma nakden ve defaten iade edilmesini,
2. İleriye dönük EFT / FAST / Hesap İşletim ve işlem masrafları için hesabıma kalıcı ücret muafiyeti tanımlanmasını,
3. Tarafıma 5 iş günü içinde yazılı dönüş yapılmasını, aksi halde BDDK e-Şikayet ve Tüketici / Bankacılık Hakem Heyeti nezdinde resmi başvuru yapılacağını ihtaren bildiririm.

Saygılarımla,
[Ad Soyad / Firma Unvanı]
[İletişim Telefonu / E-posta]
Referans Ekstre: ${metadata.fileName}`;
      return { title, subject, body };
    }

    const title = "6502 Sayılı TKHK Uyarınca Abonelik Fesih & İade Bildirimi";
    const subject = `Abonelik İptali, Otomatik Yenileme Durdurma ve Ücret İadesi Talebi — ${item.merchant}`;
    const body = `${item.merchant} Faturalandırma ve Müşteri Destek Birimi Dikkatine,

Konu: ****${acct} son dört haneli ödeme aracımdan (${bankName}) ${item.date} tarihinde çekilen ${currencyFormatted} tutarındaki "${item.merchant}" tahsilatının iptali ve otomatik yenilemenin durdurulması talebidir.

6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, söz konusu hizmete/aboneliğe ilişkin otomatik yenileme onayımı bu bildirim tarihi itibarıyla açıkça geri çekiyorum.

Gereği:
1. Hesabıma bağlı aktif aboneliğin ve gelecek dönem tüm otomatik kart/hesap çekim talimatlarının derhal iptal edilmesini,
2. Kullanılmayan döneme / iznim dışındaki son yenilemeye ait ${currencyFormatted} tutarının ödeme aracıma iade edilmesini,
3. İptal onay numarasının yazılı olarak tarafıma iletilmesini talep ederim. (Aksi halde bankam ${bankName} üzerinden Chargeback / Harcama İtirazı süreci başlatılacaktır.)

Saygılarımla,
[Ad Soyad / Firma Unvanı]
[Hesap E-postası]`;
    return { title, subject, body };
  }

  // English Formal Notice
  if (item.leakType === "bank_fee") {
    const title = "Formal Bank Fee Waiver & Refund Demand";
    const subject = `Account ****${acct} — Request for Immediate Refund & Waiver of ${currencyFormatted} Service Fee`;
    const body = `To: ${bankName} Fee Review & Account Services Team,

I am writing regarding the ${currencyFormatted} charge recorded on ${item.date} on my account ending in ****${acct} with description "${item.merchant}".

As an active customer of ${bankName}, I respectfully request:
1. A full courtesy credit/refund of ${currencyFormatted} back to account ****${acct}, and
2. Permanent fee-waiver protection on future wire, transfer, and maintenance charges on this account.

Please confirm the credit and updated fee schedule in writing within 5 business days so we can continue banking smoothly without escalating to formal dispute channels.

Sincerely,
[Your Name / Business Name]
[Email / Phone]
Statement Ref: ${metadata.fileName}`;
    return { title, subject, body };
  }

  const title = "Formal Subscription Termination & Billing Cancellation Notice";
  const subject = `Immediate Cancellation of Recurring Billing & Auto-Renewal — ${item.merchant}`;
  const body = `To: ${item.merchant} Billing & Cancellation Support,

Please treat this message as formal written notice to immediately cancel my recurring subscription and revoke authorization for future charges associated with "${item.merchant}" (${currencyFormatted} billed on ${item.date} to ${bankName} ****${acct}).

Required Actions:
1. Terminate auto-renewal and cease all upcoming recurring charges effective immediately.
2. Refund any unused or unauthorized portion of the ${currencyFormatted} charge to account ****${acct}.
3. Reply with a written cancellation confirmation ID for our accounting audit records. If unauthorized charges continue, a formal payment dispute (chargeback) will be filed with ${bankName}.

Thank you,
[Your Name / Business Name]
[Account Email]`;
  return { title, subject, body };
}
