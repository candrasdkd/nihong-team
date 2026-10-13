import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  Calculator,
  Check,
  Copy,
  ExternalLink,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  PackageX,
  Ruler,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HeroPageHeader } from "../components/ui/HeroPageHeader";
import { Button } from "../components/ui/Button";
import SearchableSelect from "../components/ui/SearchableSelect";
import { normalizeWhatsAppPhone } from "../utils/whatsapp";
import {
  estimateYamatoByRouteAndWeight,
  YAMATO_PREFECTURES,
  type YamatoPrefecture,
} from "../utils/yamato";

type TemplateId =
  | "yen-payment"
  | "bank-account"
  | "japan-address"
  | "indonesia-address"
  | "indo-japan"
  | "japan-indo"
  | "yamato-estimate"
  | "letterpack-estimate"
  | "oversized-item"
  | "cannot-carry"
  | "restricted-items";

interface WhatsAppTemplate {
  id: TemplateId;
  title: string;
  description: string;
  icon: LucideIcon;
  text: string;
}

const TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "yen-payment",
    title: "Pembayaran bukan Yen",
    description: "Penjelasan bahwa pembayaran diterima dalam Rupiah.",
    icon: MessageCircle,
    text: `Mohon maaf, saat ini kami tidak dapat menerima pembayaran menggunakan mata uang Yen (JPY).

Hal ini dikarenakan adanya regulasi dan aturan perbankan/pemerintah Jepang yang sangat ketat terkait transaksi serta lalu lintas pembayaran mata uang Yen.

Untuk kemudahan dan kelancaran transaksi, kami menyarankan pembayaran dilakukan menggunakan Rupiah.

Terima kasih banyak atas pengertian dan kerja samanya.`,
  },
  {
    id: "bank-account",
    title: "Informasi nomor rekening",
    description: "Kirim detail rekening BCA dan Mandiri.",
    icon: Landmark,
    text: `Halo Kak, berikut nomor rekening untuk pembayaran:

*BCA*
0800826764

*MANDIRI*
700012366782

Semua rekening atas nama:
*DIN MIZWAR ULYA SYEKH KHODIR*

Terima kasih! 🙏`,
  },
  {
    id: "japan-address",
    title: "Alamat Jepang · Romaji & Kanji",
    description: "Kirim kontak dan alamat Jepang dalam dua format.",
    icon: MapPin,
    text: `Halo Kak, berikut alamat kontak kami di Jepang dalam format Romaji dan Kanji:

Nama: DIN MIZWAR
Telepon: 07084476483
Kode pos: 595-0811

*Alamat Romaji:*
Osaka-fu, Senboku-gun, Tadaoka-cho, Tadaoka-kita 2-13-4

*Alamat Kanji:*
大阪府泉北郡忠岡町忠岡北２－１３－４`,
  },
  {
    id: "indonesia-address",
    title: "Alamat Indonesia · Candra",
    description: "Kirim nama, nomor telepon, dan alamat di Depok.",
    icon: MapPin,
    text: `Halo Kak, berikut alamat di Indonesia:

Nama: Candra
Telepon: 085156775933

Alamat:
Jl. Garuda I, Gg. Acim II No. 58
Kp. Rumbut, RT 011/009
Pasir Gunung Selatan, Kec. Cimanggis
Kota Depok, Jawa Barat 16451
Indonesia`,
  },
  {
    id: "indo-japan",
    title: "Tarif Indonesia → Jepang",
    description: "Info tarif handcarry ¥1.200 per kg.",
    icon: ArrowLeftRight,
    text: `Halo Kak! Untuk rute Indonesia → Jepang, tarif handcarry saat ini *¥1.200/kg*. Tarif tersebut belum termasuk biaya pengiriman domestik.

Jika ingin menitipkan barang, silakan kirim nama barang atau tautan produk dan perkiraan beratnya ya. Berat akhir akan mengikuti hasil penimbangan.

Terima kasih! 🙏`,
  },
  {
    id: "japan-indo",
    title: "Tarif Jepang → Indonesia",
    description: "Info tarif handcarry ¥1.400 per kg.",
    icon: ArrowLeftRight,
    text: `Halo Kak! Untuk rute Jepang → Indonesia, tarif handcarry saat ini *¥1.400/kg*. Tarif tersebut belum termasuk biaya pengiriman domestik.

Jika ingin menitipkan barang, silakan kirim nama barang atau tautan produk dan perkiraan beratnya ya. Berat akhir akan mengikuti hasil penimbangan.

Terima kasih! 🙏`,
  },
  {
    id: "yamato-estimate",
    title: "Estimasi ongkir Yamato · Jepang",
    description: "Hitung otomatis ongkir domestik dari rute dan berat.",
    icon: ArrowLeftRight,
    text: `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Yamato:

📍 Rute: [prefektur asal] → [prefektur tujuan]
⚖️ Berat paket: [berat] kg
📦 Ukuran minimum berdasarkan berat: [ukuran]
🚚 Estimasi ongkir Yamato: *¥[nominal]*

Estimasi ini memakai tarif tunai Yamato dan ukuran minimum berdasarkan berat saja. Ukuran final ditentukan dari dimensi dan berat paket, sehingga ongkir dapat berubah setelah paket diukur. Biaya ini belum termasuk tarif handcarry.`,
  },
  {
    id: "letterpack-estimate",
    title: "Estimasi Letter Pack · Jepang",
    description: "Tarif tetap Japan Post, divalidasi berdasarkan berat dan ketebalan.",
    icon: Mail,
    text: `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Japan Post Letter Pack:

📮 Jenis: [Letter Pack Light / Letter Pack Plus]
⚖️ Berat paket: [berat] kg
🚚 Ongkir domestik: *¥[nominal]* (tarif tetap seluruh Jepang)

Letter Pack hanya berlaku untuk pengiriman domestik di Jepang dan menggunakan amplop khusus Japan Post. Biaya ini belum termasuk tarif handcarry.`,
  },
  {
    id: "oversized-item",
    title: "Barang besar · tarif satuan",
    description: "Harga dihitung per barang, bukan per kg.",
    icon: Ruler,
    text: `Halo Kak! Untuk barang berukuran besar, tarif handcarry tidak dihitung per kg, melainkan per barang/satuan.

Harganya menyesuaikan ukuran, volume, dan jenis barang. Boleh kirim nama barang, tautan produk, serta ukuran atau dimensinya? Kami cek dulu dan konfirmasi tarif sebelum pesanan diproses.

Terima kasih! 🙏`,
  },
  {
    id: "cannot-carry",
    title: "Barang terlalu besar",
    description: "Info barang bulky yang tidak bisa dibawa.",
    icon: PackageX,
    text: `Mohon maaf Kak, kami belum bisa menerima barang yang terlalu besar atau memakan banyak ruang untuk dibawa Handcarry.

Barang tersebut tidak muat atau tidak memungkinkan dibawa dengan kapasitas bagasi yang tersedia.

Terima kasih atas pengertiannya.`,
  },
  {
    id: "restricted-items",
    title: "Barang terlarang & terbatas",
    description: "Jelaskan barang yang tidak dapat diterima atau perlu dicek dulu.",
    icon: ShieldAlert,
    text: `Halo Kak, demi keamanan dan kepatuhan terhadap aturan, kami tidak menerima narkotika/psikotropika, senjata api dan amunisi, bahan peledak, uang atau kartu palsu, barang palsu yang melanggar merek/hak cipta, materi pornografi ilegal, serta produk dari satwa atau tumbuhan yang dilindungi.

Obat dan suplemen, kosmetik, makanan atau produk hewani, tanaman/biji, serta produk satwa atau tumbuhan tertentu dapat memerlukan izin atau pemeriksaan karantina. Mohon tanyakan nama dan foto produk kepada kami sebelum memesan.

Daftar ini ringkasan umum. Penerimaan barang mengikuti aturan Bea Cukai Jepang dan Indonesia serta ketentuan maskapai. Terima kasih atas pengertiannya.`,
  },
];

const YAMATO_PREFECTURE_OPTIONS = YAMATO_PREFECTURES.map((prefecture) => ({
  label: prefecture,
  value: prefecture,
}));

const LETTER_PACK_OPTIONS = {
  light: { label: "Letter Pack Light", priceYen: 430, delivery: "Dikirim ke kotak surat" },
  plus: { label: "Letter Pack Plus", priceYen: 600, delivery: "Diantar langsung, perlu tanda terima" },
} as const;

export function WhatsAppTemplatesPage() {
  const [selectedId, setSelectedId] = useState<TemplateId>("yen-payment");
  const [messageText, setMessageText] = useState(TEMPLATES[0].text);
  const [phone, setPhone] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [yamatoOrigin, setYamatoOrigin] = useState<YamatoPrefecture>("Osaka");
  const [yamatoDestination, setYamatoDestination] = useState<YamatoPrefecture | "">("");
  const [yamatoWeight, setYamatoWeight] = useState("");
  const [letterPackType, setLetterPackType] = useState<keyof typeof LETTER_PACK_OPTIONS>("light");
  const [letterPackWeight, setLetterPackWeight] = useState("");
  const [letterPackThickness, setLetterPackThickness] = useState("");

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0],
    [selectedId],
  );

  useEffect(() => {
    setMessageText(selectedTemplate.text);
    setCopyState("idle");
  }, [selectedTemplate]);

  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const hasInvalidPhone = phone.trim().length > 0 && normalizedPhone.length < 8;
  const yamatoWeightKg = Number(yamatoWeight);
  const yamatoEstimate = useMemo(() => {
    if (!yamatoDestination || !yamatoWeight.trim()) return null;
    return estimateYamatoByRouteAndWeight(yamatoOrigin, yamatoDestination, yamatoWeightKg);
  }, [yamatoDestination, yamatoOrigin, yamatoWeight, yamatoWeightKg]);
  const letterPackWeightKg = Number(letterPackWeight);
  const letterPackThicknessCm = Number(letterPackThickness);
  const letterPackWeightValid = letterPackWeight.trim() !== ""
    && Number.isFinite(letterPackWeightKg)
    && letterPackWeightKg > 0
    && letterPackWeightKg <= 4;
  const letterPackThicknessValid = letterPackType === "plus"
    || (letterPackThickness.trim() !== ""
      && Number.isFinite(letterPackThicknessCm)
      && letterPackThicknessCm > 0
      && letterPackThicknessCm <= 3);
  const canEstimateLetterPack = letterPackWeightValid && letterPackThicknessValid;

  const handleInsertYamatoEstimate = () => {
    if (!yamatoEstimate || !yamatoDestination) return;

    const formattedWeight = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(yamatoWeightKg);
    const formattedYen = new Intl.NumberFormat("id-ID").format(yamatoEstimate.amountYen);
    setMessageText(`Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Yamato:

📍 Rute: ${yamatoOrigin} → ${yamatoDestination}
⚖️ Berat paket: ${formattedWeight} kg
📦 Ukuran minimum berdasarkan berat: ${yamatoEstimate.size} (maks. ${yamatoEstimate.maxWeightKg} kg)
🚚 Estimasi ongkir Yamato: *¥${formattedYen}*

Estimasi ini memakai tarif tunai Yamato dan ukuran minimum berdasarkan berat saja. Ukuran final ditentukan dari dimensi dan berat paket, sehingga ongkir dapat berubah setelah paket diukur. Biaya ini belum termasuk tarif handcarry.`);
    setCopyState("idle");
  };

  const handleInsertLetterPackEstimate = () => {
    if (!canEstimateLetterPack) return;

    const option = LETTER_PACK_OPTIONS[letterPackType];
    const formattedWeight = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(letterPackWeightKg);
    const formattedYen = new Intl.NumberFormat("id-ID").format(option.priceYen);
    const thicknessLine = letterPackType === "light"
      ? `\n📏 Ketebalan paket: ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(letterPackThicknessCm)} cm`
      : "";
    setMessageText(`Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Japan Post Letter Pack:

📮 Jenis: ${option.label} · ${option.delivery}
⚖️ Berat paket: ${formattedWeight} kg${thicknessLine}
🚚 Ongkir domestik: *¥${formattedYen}* (tarif tetap seluruh Jepang)

Letter Pack hanya berlaku untuk pengiriman domestik di Jepang dan menggunakan amplop khusus Japan Post. Biaya ini belum termasuk tarif handcarry.`);
    setCopyState("idle");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const handleOpenWhatsApp = () => {
    const recipientUrl = normalizedPhone ? `/${normalizedPhone}` : "/";
    const url = `https://wa.me${recipientUrl}?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-transparent pb-40 font-sans md:pb-28">
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-5 sm:px-6 sm:py-8">
        <HeroPageHeader
          variant="gradient"
          badgeIcon={MessageCircle}
          badgeLabel="Nihong Jastip · WhatsApp"
          title="Template Chat WhatsApp"
          description="Pilih pesan, sesuaikan bila perlu, lalu salin atau kirim lewat WhatsApp."
          mobileSubtitle="Pilih template, edit pesannya, lalu salin atau kirim."
        />

        <div className="space-y-4">
          <section aria-labelledby="template-list-title" className="space-y-3">
            <div className="px-1">
              <h2 id="template-list-title" className="text-sm font-extrabold text-brand-navyDark">1. Pilih template</h2>
              <p className="mt-1 text-xs text-slate-500">Pilih jenis pesan yang ingin dikirim.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {TEMPLATES.map((template, index) => {
                const Icon = template.icon;
                const isSelected = selectedId === template.id;

                return (
                  <motion.button
                    key={template.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => setSelectedId(template.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[76px] min-w-0 items-center gap-2 rounded-2xl border p-2.5 text-left transition-all active:scale-[0.99] sm:min-h-[96px] sm:items-start sm:gap-3 sm:p-3.5 ${
                      isSelected
                        ? "border-brand-orange/60 bg-brand-cream shadow-sm ring-2 ring-brand-orange/10"
                        : "border-surface-border bg-surface-card hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-9 sm:w-9 ${isSelected ? "bg-brand-orange text-white" : "bg-brand-mist text-brand-navy"}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-bold leading-snug text-brand-navyDark sm:text-sm">{template.title}</span>
                      <span className="mt-1 hidden text-xs leading-relaxed text-slate-500 sm:block">{template.description}</span>
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-brand-orange sm:mt-1" />}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {selectedId === "yamato-estimate" && (
            <section aria-labelledby="yamato-calculator-title" className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-navy">
                  <Calculator size={19} />
                </span>
                <div>
                  <h2 id="yamato-calculator-title" className="text-sm font-extrabold text-brand-navyDark">Hitung estimasi ongkir Yamato</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Isi prefektur asal, tujuan, dan berat paket untuk melihat tarif otomatis.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <SearchableSelect
                    label="Prefektur asal"
                    value={yamatoOrigin}
                    onChange={(value) => setYamatoOrigin(value as YamatoPrefecture)}
                    options={YAMATO_PREFECTURE_OPTIONS}
                    placeholder="Cari atau pilih prefektur"
                    buttonClassName="min-h-[46px] rounded-xl"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Prefektur tujuan"
                    value={yamatoDestination}
                    onChange={(value) => setYamatoDestination(value as YamatoPrefecture)}
                    options={YAMATO_PREFECTURE_OPTIONS}
                    placeholder="Cari atau pilih prefektur"
                    buttonClassName="min-h-[46px] rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="yamato-weight" className="mb-1.5 block text-sm font-bold text-slate-600">Berat paket (kg)</label>
                  <input
                    id="yamato-weight"
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    max="30"
                    step="0.1"
                    value={yamatoWeight}
                    onChange={(event) => setYamatoWeight(event.target.value)}
                    placeholder="Contoh: 1.5"
                    className="min-h-[46px] w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
                  />
                </div>
              </div>

              <div aria-live="polite" className={`rounded-xl border p-3.5 ${yamatoEstimate ? "border-emerald-200 bg-emerald-50/70" : "border-surface-border bg-surface-base/70"}`}>
                {yamatoEstimate ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600">Estimasi ongkir Yamato · tarif tunai, termasuk pajak</p>
                      <p className="mt-1 text-2xl font-black tracking-tight text-brand-navyDark">¥{new Intl.NumberFormat("id-ID").format(yamatoEstimate.amountYen)}</p>
                      <p className="mt-1 text-xs text-slate-500">{yamatoOrigin} → {yamatoDestination} · minimum ukuran {yamatoEstimate.size} berdasarkan berat</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Estimasi</span>
                  </div>
                ) : yamatoWeight.trim() && (!Number.isFinite(yamatoWeightKg) || yamatoWeightKg <= 0) ? (
                  <p className="text-sm leading-relaxed text-rose-700">Masukkan berat paket lebih dari 0 kg.</p>
                ) : yamatoWeightKg > 30 ? (
                  <p className="text-sm leading-relaxed text-rose-700">Kalkulator standar ini untuk paket sampai 30 kg. Untuk paket lebih berat, cek layanan Yamato khusus.</p>
                ) : !yamatoDestination ? (
                  <p className="text-sm leading-relaxed text-slate-600">Pilih prefektur tujuan untuk menghitung ongkir.</p>
                ) : !yamatoWeight.trim() ? (
                  <p className="text-sm leading-relaxed text-slate-600">Masukkan berat paket untuk menghitung ongkir.</p>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-600">Tarif untuk rute ini belum tersedia di kalkulator. Silakan periksa tabel resmi Yamato.</p>
                )}
              </div>

              <p className="text-xs leading-relaxed text-amber-800">Yamato menentukan ukuran dari jumlah panjang + lebar + tinggi dan berat, lalu memakai ukuran yang lebih besar. Estimasi ini hanya menggunakan berat; tarif final bisa lebih tinggi setelah dimensi diukur.</p>
              <a
                href="https://www.kuronekoyamato.co.jp/ytc/search/estimate/ichiran.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-navyLight underline-offset-4 hover:underline"
              >
                Cek tabel tarif resmi Yamato <ExternalLink size={14} />
              </a>

              <Button
                type="button"
                onClick={handleInsertYamatoEstimate}
                disabled={!yamatoEstimate}
                className="min-h-[48px] w-full bg-brand-navy px-4 text-sm hover:bg-brand-navyDark"
              >
                Masukkan estimasi ke pesan
              </Button>
            </section>
          )}

          {selectedId === "letterpack-estimate" && (
            <section aria-labelledby="letterpack-calculator-title" className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-navy">
                  <Mail size={19} />
                </span>
                <div>
                  <h2 id="letterpack-calculator-title" className="text-sm font-extrabold text-brand-navyDark">Hitung ongkir Letter Pack</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Tarif tetap untuk seluruh Jepang, jadi tidak perlu mengisi rute.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["light", "plus"] as const).map((type) => {
                  const option = LETTER_PACK_OPTIONS[type];
                  const isSelected = letterPackType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setLetterPackType(type)}
                      className={`flex min-h-[76px] items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${isSelected ? "border-brand-orange/60 bg-brand-cream ring-2 ring-brand-orange/10" : "border-surface-border bg-white hover:border-slate-300"}`}
                    >
                      <span>
                        <span className="block text-sm font-bold text-brand-navyDark">{option.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{option.delivery}</span>
                      </span>
                      <span className="shrink-0 text-base font-extrabold text-brand-navyDark">¥{new Intl.NumberFormat("id-ID").format(option.priceYen)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={letterPackType === "plus" ? "sm:col-span-2" : ""}>
                  <label htmlFor="letterpack-weight" className="mb-1.5 block text-sm font-bold text-slate-600">Berat paket (kg)</label>
                  <input
                    id="letterpack-weight"
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    max="4"
                    step="0.1"
                    value={letterPackWeight}
                    onChange={(event) => setLetterPackWeight(event.target.value)}
                    placeholder="Maksimal 4 kg"
                    className="min-h-[46px] w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
                  />
                </div>
                {letterPackType === "light" && (
                  <div>
                    <label htmlFor="letterpack-thickness" className="mb-1.5 block text-sm font-bold text-slate-600">Ketebalan paket (cm)</label>
                    <input
                      id="letterpack-thickness"
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={letterPackThickness}
                      onChange={(event) => setLetterPackThickness(event.target.value)}
                      placeholder="Maksimal 3 cm"
                      className="min-h-[46px] w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
                    />
                  </div>
                )}
              </div>

              <div aria-live="polite" className={`rounded-xl border p-3.5 ${canEstimateLetterPack ? "border-emerald-200 bg-emerald-50/70" : "border-surface-border bg-surface-base/70"}`}>
                {letterPackWeight.trim() === "" ? (
                  <p className="text-sm leading-relaxed text-slate-600">Masukkan berat paket untuk memeriksa kelayakan dan menampilkan tarif.</p>
                ) : !Number.isFinite(letterPackWeightKg) || letterPackWeightKg <= 0 ? (
                  <p className="text-sm leading-relaxed text-rose-700">Masukkan berat paket lebih dari 0 kg.</p>
                ) : letterPackWeightKg > 4 ? (
                  <p className="text-sm leading-relaxed text-rose-700">Letter Pack hanya menerima paket sampai 4 kg.</p>
                ) : letterPackType === "light" && letterPackThickness.trim() === "" ? (
                  <p className="text-sm leading-relaxed text-slate-600">Masukkan ketebalan paket untuk mengecek Letter Pack Light.</p>
                ) : letterPackType === "light" && (!Number.isFinite(letterPackThicknessCm) || letterPackThicknessCm <= 0) ? (
                  <p className="text-sm leading-relaxed text-rose-700">Masukkan ketebalan paket lebih dari 0 cm.</p>
                ) : letterPackType === "light" && letterPackThicknessCm > 3 ? (
                  <p className="text-sm leading-relaxed text-rose-700">Paket lebih dari 3 cm tidak memenuhi batas Letter Pack Light. Coba Letter Pack Plus.</p>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Estimasi ongkir domestik Jepang · tarif tetap seluruh Jepang</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-brand-navyDark">¥{new Intl.NumberFormat("id-ID").format(LETTER_PACK_OPTIONS[letterPackType].priceYen)}</p>
                    <p className="mt-1 text-xs text-slate-500">{LETTER_PACK_OPTIONS[letterPackType].label} · berat {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(letterPackWeightKg)} kg</p>
                  </div>
                )}
              </div>

              <p className="text-xs leading-relaxed text-amber-800">Keduanya maksimal 4 kg dan wajib memakai amplop khusus Japan Post ukuran A4 (34 × 24,8 cm). Letter Pack Light maksimal 3 cm tebal; Plus tidak memiliki batas ketebalan selama tetap muat dalam amplop. Layanan ini hanya berlaku untuk pengiriman domestik Jepang.</p>
              <a
                href="https://www.post.japanpost.jp/service/send/domestic/mail/letterpack/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-navyLight underline-offset-4 hover:underline"
              >
                Cek detail resmi Japan Post <ExternalLink size={14} />
              </a>

              <Button
                type="button"
                onClick={handleInsertLetterPackEstimate}
                disabled={!canEstimateLetterPack}
                className="min-h-[48px] w-full bg-brand-navy px-4 text-sm hover:bg-brand-navyDark"
              >
                Masukkan estimasi ke pesan
              </Button>
            </section>
          )}

          <AnimatePresence mode="wait">
            <motion.section
              key={selectedId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              aria-labelledby="message-editor-title"
              className="overflow-hidden rounded-card border border-white bg-surface-card shadow-card ring-1 ring-brand-navy/5"
            >
              <div className="flex items-center gap-3 border-b border-surface-border px-4 py-4 sm:px-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MessageCircle size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="message-editor-title" className="text-sm font-extrabold text-brand-navyDark">2. Edit pesan</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{selectedTemplate.title} · sesuaikan sebelum dikirim</p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 sm:inline-flex">
                  {messageText.length} karakter
                </span>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div>
                  <label htmlFor="whatsapp-template-phone" className="mb-1.5 block text-xs font-bold text-slate-600">
                    Nomor WhatsApp <span className="font-medium text-slate-400">(opsional)</span>
                  </label>
                  <input
                    id="whatsapp-template-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="08xxxxxxxxxx atau 62xxxxxxxxxx"
                    className="min-h-[46px] w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
                  />
                  {hasInvalidPhone ? (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">Periksa kembali nomor WhatsApp.</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">Kosongkan untuk membuka WhatsApp dan memilih kontak di sana.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="whatsapp-template-message" className="mb-1.5 block text-xs font-bold text-slate-600">Isi pesan</label>
                  <textarea
                    id="whatsapp-template-message"
                    value={messageText}
                    onChange={(event) => {
                      setMessageText(event.target.value);
                      setCopyState("idle");
                    }}
                    rows={9}
                    className="min-h-[220px] w-full resize-y rounded-2xl border border-surface-border bg-white p-3.5 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
                  />
                </div>

                <div className="hidden items-center justify-between gap-3 border-t border-surface-border pt-4 md:flex">
                  <p aria-live="polite" className={`min-h-5 text-xs font-semibold ${copyState === "error" ? "text-rose-600" : "text-emerald-700"}`}>
                    {copyState === "copied" ? "Pesan berhasil disalin." : copyState === "error" ? "Gagal menyalin. Coba lagi dari browser." : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleCopy} className="min-h-[44px] px-4 text-sm">
                      {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
                      {copyState === "copied" ? "Tersalin" : "Salin pesan"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      disabled={hasInvalidPhone}
                      className="min-h-[44px] bg-emerald-600 px-4 text-sm shadow-[0_8px_20px_rgba(5,150,105,0.2)] hover:bg-emerald-700 focus:ring-emerald-600"
                    >
                      <Send size={16} />
                      Buka WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        <details className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 sm:p-5">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-sm font-extrabold text-amber-950">
            <AlertTriangle size={18} className="shrink-0 text-amber-700" />
            Lihat catatan barang terlarang dan terbatas
          </summary>
          <div className="pt-2 pl-[30px]">
            <p className="text-xs leading-relaxed text-amber-900/80">
              Aturan berbeda menurut negara tujuan dan jenis barang. Pastikan ketentuan resminya sebelum menerima produk yang memerlukan izin atau pemeriksaan.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://www.beacukai.go.id/barang-penumpang"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-300/80 bg-white/80 px-3 text-xs font-bold text-amber-950 hover:bg-white"
              >
                Bea Cukai Indonesia <ExternalLink size={13} />
              </a>
              <a
                href="https://www.customs.go.jp/english/summary/passenger.htm"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-300/80 bg-white/80 px-3 text-xs font-bold text-amber-950 hover:bg-white"
              >
                Japan Customs <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </details>
      </div>

      <div
        className="fixed inset-x-0 z-40 px-4 md:hidden"
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-md gap-2 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-[0_10px_35px_rgba(7,27,51,0.18)] backdrop-blur-xl">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            aria-label={copyState === "copied" ? "Pesan tersalin" : "Salin pesan"}
            className="min-h-[48px] min-w-0 flex-1 whitespace-nowrap px-2 text-xs"
          >
            {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
            {copyState === "copied" ? "Tersalin" : copyState === "error" ? "Coba lagi" : "Salin"}
          </Button>
          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={hasInvalidPhone}
            className="min-h-[48px] min-w-0 flex-1 whitespace-nowrap bg-emerald-600 px-2 text-xs hover:bg-emerald-700 focus:ring-emerald-600"
          >
            <Send size={16} />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
