import { useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Flame,
  Hash,
  MapPin,
  MessageSquareText,
  Package,
  Plane,
  RotateCcw,
  Scale,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Weight,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";

const MAIN_TOPIC = {
  name: "JASTIP-JEPANG-TRUSTED",
  searchUrl: "https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED&filter=recent",
  tagUrl: "https://www.threads.com/tag/JASTIP-JEPANG-TRUSTED",
  badge: "Pusat Komunitas Utama 🔥",
  desc: "Hampir semua jastiper aktif Jepang berkumpul dan posting jadwal keberangkatan, open order, dan sisa kiloan bagasi di wadah topik ini. Postingan selalu terupdate tiap hitungan menit.",
};

const TARGETED_QUERIES = [
  {
    title: "Osaka & Kansai di Topik Trusted",
    queryText: "JASTIP-JEPANG-TRUSTED osaka",
    searchUrl: "https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED+osaka&filter=recent",
    badge: "Kansai · Osaka",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: MapPin,
    desc: "Menyaring jastiper di topik trusted yang berdomisili atau belanja di Osaka, Shinsaibashi, dan Dotonbori.",
  },
  {
    title: "Sisa Bagasi Koper di Topik Trusted",
    queryText: "JASTIP-JEPANG-TRUSTED bagasi",
    searchUrl: "https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED+bagasi&filter=recent",
    badge: "Kiloan Bagasi",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: Package,
    desc: "Khusus mencari traveler yang masih punya sisa kuota kiloan bagasi kosong (rate per kg).",
  },
  {
    title: "Handcarry Cepat di Topik Trusted",
    queryText: "JASTIP-JEPANG-TRUSTED handcarry",
    searchUrl: "https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED+handcarry&filter=recent",
    badge: "Handcarry / ETA Dekat",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    icon: Plane,
    desc: "Mencari jastip bawaan kabin/handcarry dengan jadwal kepulangan terdekat ke Indonesia.",
  },
  {
    title: "Tokyo & Kanto di Topik Trusted",
    queryText: "JASTIP-JEPANG-TRUSTED tokyo",
    searchUrl: "https://www.threads.com/search?q=JASTIP-JEPANG-TRUSTED+tokyo&filter=recent",
    badge: "Kanto · Tokyo",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    icon: MapPin,
    desc: "Jastiper yang hunting barang di area Tokyo, Shibuya, Shinjuku, Ginza, dan Akihabara.",
  },
  {
    title: "Hashtag Asli #bagasiindojepang",
    queryText: "#bagasiindojepang",
    searchUrl: "https://www.threads.com/search?q=%23bagasiindojepang&filter=recent",
    tagUrl: "https://www.threads.com/tag/bagasiindojepang",
    badge: "Hashtag Komunitas",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    icon: Hash,
    desc: "Hashtag spesifik rute pulang-pergi Indo - Jepang untuk barter dan titip bagasi bagasi.",
  },
  {
    title: "Hashtag Asli #jastipjepang",
    queryText: "#jastipjepang",
    searchUrl: "https://www.threads.com/search?q=%23jastipjepang&filter=recent",
    tagUrl: "https://www.threads.com/tag/jastipjepang",
    badge: "Katalog & PO",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Hash,
    desc: "Hashtag umum untuk katalog snack, kosmetik, skincare, obat, dan merchandise anime.",
  },
];

const BUILDER_CATEGORIES = [
  { id: "rate_bagasi", label: "Tanya Rate / Kg & Sisa Bagasi", icon: Scale, highlight: true },
  { id: "booking_bagasi", label: "Booking Slot (Titip X Kg)", icon: Package },
  { id: "toko", label: "Belanja Toko (Donki / Mall)", icon: Store },
  { id: "skincare", label: "Drugstore & Skincare", icon: ShoppingBag },
  { id: "eta", label: "Jadwal & Tanggal ETA", icon: Calendar },
  { id: "kurs", label: "Kurs Yen & Skema Fee", icon: DollarSign },
] as const;

type BuilderCategoryId = (typeof BUILDER_CATEGORIES)[number]["id"];

const QUICK_ITEM_CHIPS = [
  "Sepatu Onitsuka Tiger",
  "Don Quijote (Donki)",
  "Bic Camera / Yodobashi",
  "Pokemon Center",
  "Drugstore (Matsukiyo / Rohto)",
  "Snack Tokyo Banana & KitKat",
  "Uniqlo / GU Japan",
  "Figure / Gundam Akihabara",
];

const CITY_OPTIONS = ["Osaka", "Tokyo", "Kyoto", "Semua Jepang"];
const WEIGHT_OPTIONS = ["0.5 kg", "1 kg", "2 kg", "3 kg", "5 kg"];

const TONE_OPTIONS = [
  { id: "sopan", label: "Sopan & Lengkap", badge: "Paling Disukai Jastiper" },
  { id: "singkat", label: "Singkat & Padat", badge: "Fast Response" },
  { id: "santai", label: "Kasual & Santai", badge: "Ramah" },
] as const;

type ToneId = (typeof TONE_OPTIONS)[number]["id"];

export function JastiperSearchPage() {
  // Smart DM Builder state
  const [activeCategory, setActiveCategory] = useState<BuilderCategoryId>("rate_bagasi");
  const [jastiperHandle, setJastiperHandle] = useState("");
  const [city, setCity] = useState("Osaka");
  const [itemDetail, setItemDetail] = useState("titipan barang belanjaan");
  const [weight, setWeight] = useState("1-2 kg");
  const [tone, setTone] = useState<ToneId>("sopan");
  const [builderCopied, setBuilderCopied] = useState(false);

  // Khusus Tanya Bagasi checkboxes
  const [askGrams, setAskGrams] = useState(true);
  const [askRules, setAskRules] = useState(false);
  const [askETA, setAskETA] = useState(true);

  function resetBuilder() {
    setJastiperHandle("");
    setCity("Osaka");
    setItemDetail("titipan barang belanjaan");
    setWeight("1-2 kg");
    setTone("sopan");
    setAskGrams(true);
    setAskRules(false);
    setAskETA(true);
  }

  function generateMessage(): string {
    const cleanHandle = jastiperHandle.trim().replace(/^@/, "");
    const greeting = cleanHandle ? `Halo kak @${cleanHandle}` : "Halo kak";
    const targetCity = city ? (city === "Semua Jepang" ? "Jepang" : city) : "Osaka";

    // 1. Kategori: TANYA RATE PER KG & SISA BAGASI (Requested specifically by user)
    if (activeCategory === "rate_bagasi") {
      let mainText = "";
      if (tone === "singkat") {
        mainText = `${greeting}, mau tanya rate bagasi Jepang kena berapa per kg ya kak? Dan saat ini masih sisa slot berapa kg lagi? Rencana mau titip ${itemDetail || "barang"}${weight ? ` sekitar ${weight}` : ""}.`;
      } else if (tone === "santai") {
        mainText = `${greeting}! Mau tanya dong untuk bagasi Jepangnya rate per kg kena berapa ya dan sekarang masih sisa berapa kg lagi koper kosongnya? Rencana mau nitip ${itemDetail || "barang"}${weight ? ` kurleb ${weight}` : ""}.`;
      } else {
        mainText = `${greeting}, salam kenal! Mau tanya untuk penawaran bagasi Jepangnya, saat ini rate per kg kena berapa ya kak? Dan sekarang masih ada sisa kuota berapa kg lagi yang kosong? Saya berencana mau titip ${itemDetail || "barang"} ${weight ? `sekitar ${weight}` : ""} untuk rute ${targetCity} - Indonesia.`;
      }

      const extraQuestions: string[] = [];
      if (askGrams) {
        extraQuestions.push(
          tone === "singkat"
            ? "Apakah ada minimal berat atau bisa hitungan gram?"
            : "Sekalian mau tanya apakah ada minimal order atau bisa titip di bawah 1 kg (hitungan gram)?"
        );
      }
      if (askRules) {
        extraQuestions.push(
          tone === "singkat"
            ? "Terima barang cairan/skincare/makanan?"
            : "Apakah ada ketentuan atau batasan jenis barang (seperti skincare, cairan, atau makanan)?"
        );
      }
      if (askETA) {
        extraQuestions.push(
          tone === "singkat"
            ? "Rute terbang & ETA Indo kapan ya?"
            : "Boleh info juga untuk rute keberangkatan dan estimasi tiba (ETA) di Indonesia tanggal berapa?"
        );
      }

      const closing = tone === "singkat" ? "Makasih kak!" : tone === "santai" ? "Kabarin ya kak, thank you!" : "Terima kasih banyak!";
      return [mainText, ...extraQuestions, closing].filter(Boolean).join(" ");
    }

    // 2. Kategori: BOOKING BAGASI (X KG)
    if (activeCategory === "booking_bagasi") {
      if (tone === "singkat") {
        return `${greeting}, mau tanya masih ada slot sisa bagasi rute Jepang - Indo? Rencana mau titip ${itemDetail || "barang"} sekitar ${weight || "2 kg"}. Fee per kg dan ETA sampai Indo-nya berapa ya? Terima kasih!`;
      }
      if (tone === "santai") {
        return `${greeting}! Mau tanya dong masih bisa nitip slot bagasi Jepang - Indo? Ada titipan ${itemDetail || "barang"} kurleb ${weight || "2 kg"}. Boleh info rate per kg dan jadwal berangkatnya? Thank you kak!`;
      }
      return `${greeting}, salam kenal! Mau tanya apakah masih ada slot sisa bagasi kosong untuk rute Jepang - Indo (keberangkatan terdekat)? Saya ada rencana mau titip ${itemDetail || "barang"} sekitar ${weight || "2 kg"}. Untuk fee per kg dan ketentuannya bagaimana ya kak? Terima kasih!`;
    }

    // 3. Kategori: BELANJA TOKO OFFLINE
    if (activeCategory === "toko") {
      if (tone === "singkat") {
        return `${greeting}, bisa titip belanja toko offline di ${targetCity} (${itemDetail || "Don Quijote / Bic Camera"})? Mau tanya hitungan fee dan cara titipnya. Makasih kak!`;
      }
      if (tone === "santai") {
        return `${greeting}! Boleh titip beliin barang toko fisik di area ${targetCity} gak ya? Mau nitip ${itemDetail || "barang belanjaan"}. Untuk fee dan sistem ordernya gimana ya? Thank you kak!`;
      }
      return `${greeting}, permisi mau tanya apakah bisa titip belikan barang toko offline di area ${targetCity} (seperti ${itemDetail || "Don Quijote / Bic Camera / Pokemon Center"})? Saya ada barang incaran yang mau dibeli. Estimasi fee belanja dan ketentuan ordernya bagaimana ya kak? Terima kasih!`;
    }

    // 4. Kategori: DRUGSTORE & SKINCARE
    if (activeCategory === "skincare") {
      if (tone === "singkat") {
        return `${greeting}, open jastip drugstore / kosmetik Jepang di ${targetCity}? Mau titip ${itemDetail || "skincare & obat"}. Rate dan cara ordernya bagaimana ya kak?`;
      }
      if (tone === "santai") {
        return `${greeting}! Mau titip produk drugstore Jepang dong, rencananya mau beli ${itemDetail || "skincare & vitamin"}. Masih buka slot gak kak? Thank you!`;
      }
      return `${greeting}, salam kenal! Mau tanya apakah menerima jastip produk drugstore / kecantikan Jepang di area ${targetCity}? Rencana mau titip ${itemDetail || "skincare & vitamin"}. Apakah ada kuota khusus atau fee per item? Terima kasih!`;
    }

    // 5. Kategori: JADWAL & ETA
    if (activeCategory === "eta") {
      if (tone === "singkat") {
        return `${greeting}, jastip ${targetCity}-nya close order dan ETA tiba di Indo tanggal berapa ya kak? Makasih!`;
      }
      if (tone === "santai") {
        return `${greeting}! Mau tanya jadwal jastipnya dong kak, close order kapan dan estimasi barang ready dikirim di Indo tanggal berapa ya? Thank you!`;
      }
      return `${greeting}, permisi mau tanya untuk open jastip area ${targetCity}-nya batas close order tanggal berapa ya kak? Dan estimasi tiba (ETA) di Indonesia tanggal berapa? Mau mencocokkan dengan kebutuhan barang titipan saya. Terima kasih!`;
    }

    // 6. Kategori: KURS & FEE
    if (tone === "singkat") {
      return `${greeting}, mau tanya perhitungan jastipnya pakai kurs yen berapa ya kak dan sistem fee-nya bagaimana? Terima kasih!`;
    }
    if (tone === "santai") {
      return `${greeting}! Boleh info kurs yen yang dipakai dan skema fee jastipnya kak? Mau ngitung estimasi total titipan barang saya. Thank you!`;
    }
    return `${greeting}, salam kenal! Mau tanya untuk jastip barang dari Jepang saat ini perhitungannya menggunakan estimasi kurs berapa ya kak? Apakah fee-nya dihitung persen, per item, atau per kg? Terima kasih banyak!`;
  }

  const generatedMessage = generateMessage();
  const cleanHandle = jastiperHandle.trim().replace(/^@/, "");

  function handleCopyBuilder() {
    void navigator.clipboard.writeText(generatedMessage);
    setBuilderCopied(true);
    setTimeout(() => setBuilderCopied(false), 2500);
  }

  return (
    <div className="min-h-screen bg-surface-base pb-28 text-slate-800">
      <div className="page-container space-y-8">
        <PageHeader
          title="Radar Jastip & Titipan Jepang"
          subtitle="Pantau topik aktif Threads secara live (filter: terbaru), temukan sisa bagasi kosong, dan hubungi jastiper langsung."
        />

        {/* 1. HERO CARD: THE #1 GOLDMINE TOPIC */}
        <section aria-label="Topik Utama Jastip Jepang" className="overflow-hidden rounded-card border-2 border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/50 p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                  <Flame size={14} /> {MAIN_TOPIC.badge}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                  <Clock size={13} /> Update Tiap Hitungan Menit
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black text-brand-navyDark sm:text-3xl">
                #{MAIN_TOPIC.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                {MAIN_TOPIC.desc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <a
                href={MAIN_TOPIC.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-input bg-rose-600 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-rose-700"
              >
                <span>Buka Postingan Terbaru</span>
                <ArrowUpRight size={17} />
              </a>
              <a
                href={MAIN_TOPIC.tagUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-input border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Buka Halaman Topic Tag</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </section>

        {/* 2. TARGETED QUERIES WITHIN THE TRUSTED TOPIC */}
        <section aria-label="Pencarian Tertarget" className="overflow-hidden rounded-card border border-surface-border bg-white p-5 shadow-card sm:p-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-mist px-2.5 py-1 text-xs font-bold text-brand-navy">
                <Sparkles size={13} /> Filter Spesifik
              </span>
              <span className="text-xs text-slate-500">Mencari kata kunci langsung di dalam topik aktif</span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-brand-navyDark sm:text-2xl">
              Cari Berdasarkan Lokasi & Kebutuhan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Karena para jastiper berkumpul di topik <strong>JASTIP-JEPANG-TRUSTED</strong>, tombol di bawah otomatis menyaring postingan terbaru berdasarkan kata kunci spesifik:
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TARGETED_QUERIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-brand-navy/30 hover:bg-white hover:shadow-card-hover"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Icon size={14} className="text-brand-orange" />
                        Query
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-base font-extrabold text-brand-navyDark">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {item.desc}
                    </p>
                    <div className="mt-2.5 font-mono text-[11px] text-slate-400">
                      q={item.queryText}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                    <a
                      href={item.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between rounded-xl bg-brand-navy px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-navyLight"
                    >
                      <span>Cari Terbaru di Threads</span>
                      <ArrowUpRight size={14} />
                    </a>
                    {item.tagUrl && (
                      <a
                        href={item.tagUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-orange hover:underline"
                      >
                        <span>Buka Topic Tag #{item.queryText.replace("#", "")}</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. SMART INTERACTIVE DM BUILDER */}
        <section aria-label="Smart DM Studio" className="overflow-hidden rounded-card border border-surface-border bg-white p-5 shadow-card sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-orange">
                <Sparkles size={14} /> Smart DM Studio
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-brand-navyDark sm:text-2xl">
                Generator Pesan DM Cerdas & Siap Kirim
              </h2>
              <p className="text-sm text-slate-600">
                Pilih kebutuhanmu, atur detail barang atau sisa bagasi, dan salin pesan yang sudah otomatis terformat rapi:
              </p>
            </div>
            <button
              type="button"
              onClick={resetBuilder}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-navy"
            >
              <RotateCcw size={13} /> Reset Pilihan
            </button>
          </div>

          {/* Category Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {BUILDER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-brand-navy text-white shadow-xs ring-2 ring-brand-navy/30"
                      : "border border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-brand-orange" : "text-slate-400"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Builder Workspace: Left Form, Right Live Preview */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {/* Left Column: Interactive Inputs */}
            <div className="space-y-5 lg:col-span-6">
              {/* Account Handle */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" /> Akun Threads Jastiper (Opsional)
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">Contoh: @burhanulfuady</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">@</span>
                  <input
                    type="text"
                    value={jastiperHandle}
                    onChange={(e) => setJastiperHandle(e.target.value.replace(/^@/, ""))}
                    placeholder="nama_jastiper"
                    className="h-10 w-full rounded-input border border-slate-200 bg-slate-50/50 pl-8 pr-3 text-xs font-medium focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                  />
                </div>
              </div>

              {/* Khusus Kategori Tanya Rate Per Kg & Sisa Bagasi: Checkbox Opsi Lengkap */}
              {activeCategory === "rate_bagasi" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Weight size={14} className="text-emerald-700" /> Poin Pertanyaan Bagasi:
                  </div>
                  <div className="space-y-2 text-xs text-slate-700 font-medium">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={askGrams}
                        onChange={(e) => setAskGrams(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tanyakan minimal berat (apakah bisa di bawah 1 kg / hitungan gram)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={askETA}
                        onChange={(e) => setAskETA(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tanyakan rute penerbangan & tanggal tiba (ETA) di Indonesia</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={askRules}
                        onChange={(e) => setAskRules(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tanyakan ketentuan jenis barang (cairan / skincare / makanan)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* City Pill Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400" /> Lokasi / Rute
                </label>
                <div className="flex flex-wrap gap-2">
                  {CITY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        city === c
                          ? "border-brand-navy bg-brand-navy text-white font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Selector */}
              {(activeCategory === "rate_bagasi" || activeCategory === "booking_bagasi") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Package size={13} className="text-slate-400" /> Estimasi Kebutuhan Kiloan Barang
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEIGHT_OPTIONS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeight(w)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          weight === w
                            ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Item / Store Name Input & Quick Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag size={13} className="text-slate-400" /> Rencana Barang yang Mau Dititip
                </label>
                <input
                  type="text"
                  value={itemDetail}
                  onChange={(e) => setItemDetail(e.target.value)}
                  placeholder="Ketik nama barang / toko..."
                  className="h-10 w-full rounded-input border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Pilih Cepat:</span>
                  {QUICK_ITEM_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setItemDetail(chip)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-brand-navy hover:text-brand-navy"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquareText size={13} className="text-slate-400" /> Gaya Bahasa (Tone)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                        tone === t.id
                          ? "border-brand-orange bg-orange-50/60 text-brand-navy font-bold ring-1 ring-brand-orange"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-bold">{t.label}</span>
                      <span className="mt-0.5 text-[10px] text-slate-400">{t.badge}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Message Preview */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 lg:col-span-6">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
                    <span className="text-xs font-extrabold text-brand-navyDark">Live Preview Pesan DM</span>
                  </div>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                    {tone}
                  </span>
                </div>

                {/* Simulated Chat Bubble */}
                <div className="mt-4 rounded-2xl border border-brand-orange/20 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <Send size={12} className="text-brand-orange" />
                    <span>Draf Pesan Siap Kirim:</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                    {generatedMessage}
                  </p>
                </div>
              </div>

              {/* Copy & Direct Action Buttons */}
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={handleCopyBuilder}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-input text-sm font-extrabold transition-all shadow-sm ${
                    builderCopied
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                      : "bg-brand-navy text-white hover:bg-brand-navyLight"
                  }`}
                >
                  {builderCopied ? (
                    <>
                      <CheckCheck size={18} />
                      <span>Berhasil Tersalin ke Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={17} />
                      <span>Salin Pesan DM</span>
                    </>
                  )}
                </button>

                {cleanHandle && (
                  <a
                    href={`https://www.threads.com/@${cleanHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-input border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span>Buka Profil @{cleanHandle} di Threads</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
