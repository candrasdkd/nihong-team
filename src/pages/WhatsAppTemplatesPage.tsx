import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  Calculator,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageX,
  Plus,
  Ruler,
  Search,
  Send,
  ShieldAlert,
  Truck,
  User,
  Users,
  X,
  CreditCard,
  Edit3,
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
import { Customer } from "../types";
import { listenCustomers } from "../services/customersFirebase";

export type TemplateId =
  | "yen-payment"
  | "bank-account"
  | "dp-confirmed"
  | "settlement-reminder"
  | "japan-address"
  | "indonesia-address"
  | "tracking-number"
  | "indo-japan"
  | "japan-indo"
  | "yamato-estimate"
  | "letterpack-estimate"
  | "last-drop-reminder"
  | "oversized-item"
  | "cannot-carry"
  | "restricted-items";

export type TemplateCategory = "all" | "ongkir" | "pembayaran" | "alamat" | "aturan";

export interface WhatsAppTemplate {
  id: TemplateId;
  title: string;
  category: TemplateCategory;
  description: string;
  icon: LucideIcon;
  text: string;
  badge?: string;
}

export const TEMPLATES: WhatsAppTemplate[] = [
  // ─── PEMBAYARAN & DP ───
  {
    id: "bank-account",
    category: "pembayaran",
    title: "Informasi nomor rekening",
    description: "Kirim detail rekening BCA dan Mandiri.",
    icon: Landmark,
    badge: "Populer",
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
    id: "dp-confirmed",
    category: "pembayaran",
    title: "Konfirmasi Penerimaan DP",
    description: "Konfirmasi DP telah masuk dan pesanan masuk antrean belanja.",
    icon: CreditCard,
    badge: "Baru",
    text: `Halo Kak [Nama], salam dari Tim *Nihong Jastip*! 🙏🇯🇵

Kami konfirmasikan bahwa DP untuk pesanan Kakak telah kami terima dengan baik. Terima kasih banyak atas pembayarannya! ✨

Pesanan Kakak resmi masuk ke antrean daftar belanja jastiper kami di Jepang. Kami akan kabari kembali saat barang mulai dibelanjakan atau jika ada update dari toko ya Kak. 🛍️`,
  },
  {
    id: "settlement-reminder",
    category: "pembayaran",
    title: "Pengingat Pelunasan Barang Tiba",
    description: "Barang sudah mendarat di Indo, ingatkan pelunasan sebelum kirim ekspedisi.",
    icon: PackageCheck,
    badge: "Penting",
    text: `Halo Kak [Nama]! Kabar gembira dari Tim *Nihong Jastip* 📦🎉

Barang titipan Kakak sudah tiba di Indonesia dan telah selesai melewati pemeriksaan tim kami dengan kondisi aman & lengkap.

Mohon bantuan untuk menyelesaikan sisa pelunasan dan konfirmasi alamat pengiriman lengkap agar paket dapat segera kami serahkan ke pihak ekspedisi kurir lokal hari ini. Terima kasih banyak Kak! 🙏✨`,
  },
  {
    id: "yen-payment",
    category: "pembayaran",
    title: "Pembayaran bukan Yen",
    description: "Penjelasan bahwa pembayaran diterima dalam Rupiah.",
    icon: MessageCircle,
    text: `Mohon maaf, saat ini kami tidak dapat menerima pembayaran menggunakan mata uang Yen (JPY).

Hal ini dikarenakan adanya regulasi dan aturan perbankan/pemerintah Jepang yang sangat ketat terkait transaksi serta lalu lintas pembayaran mata uang Yen.

Untuk kemudahan dan kelancaran transaksi, kami menyarankan pembayaran dilakukan menggunakan Rupiah.

Terima kasih banyak atas pengertian dan kerja samanya.`,
  },

  // ─── ONGKIR & TARIF ───
  {
    id: "yamato-estimate",
    category: "ongkir",
    title: "Estimasi ongkir Yamato · Jepang",
    description: "Hitung otomatis ongkir domestik dari rute dan berat.",
    icon: ArrowLeftRight,
    badge: "Kalkulator",
    text: `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Yamato:

📍 Rute: [prefektur asal] → [prefektur tujuan]
⚖️ Berat paket: [berat] kg
📦 Ukuran minimum berdasarkan berat: [ukuran]
🚚 Estimasi ongkir Yamato: *¥[nominal]*

Estimasi ini memakai tarif tunai Yamato dan ukuran minimum berdasarkan berat saja. Ukuran final ditentukan dari dimensi dan berat paket, sehingga ongkir dapat berubah setelah paket diukur. Biaya ini belum termasuk tarif handcarry.`,
  },
  {
    id: "letterpack-estimate",
    category: "ongkir",
    title: "Estimasi Letter Pack · Jepang",
    description: "Tarif tetap Japan Post, divalidasi berdasarkan berat dan ketebalan.",
    icon: Mail,
    badge: "Kalkulator",
    text: `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Japan Post Letter Pack:

📮 Jenis: [Letter Pack Light / Letter Pack Plus]
⚖️ Berat paket: [berat] kg
🚚 Ongkir domestik: *¥[nominal]* (tarif tetap seluruh Jepang)

Letter Pack hanya berlaku untuk pengiriman domestik di Jepang dan menggunakan amplop khusus Japan Post. Biaya ini belum termasuk tarif handcarry.`,
  },
  {
    id: "indo-japan",
    category: "ongkir",
    title: "Tarif Indonesia → Jepang",
    description: "Info tarif handcarry ¥1.200 per kg.",
    icon: ArrowLeftRight,
    text: `Halo Kak! Untuk rute Indonesia → Jepang, tarif handcarry saat ini *¥1.200/kg*. Tarif tersebut belum termasuk biaya pengiriman domestik.

Jika ingin menitipkan barang, silakan kirim nama barang atau tautan produk dan perkiraan beratnya ya. Berat akhir akan mengikuti hasil penimbangan.

Terima kasih! 🙏`,
  },
  {
    id: "japan-indo",
    category: "ongkir",
    title: "Tarif Jepang → Indonesia",
    description: "Info tarif handcarry ¥1.400 per kg.",
    icon: ArrowLeftRight,
    text: `Halo Kak! Untuk rute Jepang → Indonesia, tarif handcarry saat ini *¥1.400/kg*. Tarif tersebut belum termasuk biaya pengiriman domestik.

Jika ingin menitipkan barang, silakan kirim nama barang atau tautan produk dan perkiraan beratnya ya. Berat akhir akan mengikuti hasil penimbangan.

Terima kasih! 🙏`,
  },

  // ─── ALAMAT & RESI ───
  {
    id: "tracking-number",
    category: "alamat",
    title: "Pemberitahuan Resi Pengiriman",
    description: "Kirim nomor resi kurir JNE/J&T/Sicepat setelah paket diserahkan.",
    icon: Truck,
    badge: "Baru",
    text: `Halo Kak [Nama]! Paket titipan Kakak sudah resmi dikirimkan via ekspedisi domestik hari ini 🚚📦

📍 Ekspedisi: [JNE / J&T / SiCepat / Lion Parcel]
🔖 Nomor Resi: [Masukkan nomor resi di sini]
🔗 Status pengiriman dapat dicek berkala di web atau aplikasi ekspedisi terkait.

Terima kasih banyak telah berbelanja titip di *Nihong Jastip*! Ditunggu pesanan berikutnya ya Kak 🥰🙏`,
  },
  {
    id: "japan-address",
    category: "alamat",
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
    category: "alamat",
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

  // ─── ATURAN & JADWAL ───
  {
    id: "last-drop-reminder",
    category: "aturan",
    title: "Pengingat Batas Titip (Last Drop)",
    description: "Pengingat penutupan jadwal titipan sebelum jastiper berangkat.",
    icon: Clock,
    badge: "Penting",
    text: `Halo Kak [Nama]! ⏰✈️
Mengingatkan kembali bahwa batas akhir penerimaan titipan (*Last Drop*) untuk jadwal keberangkatan terdekat akan segera ditutup.

Bagi Kakak yang masih ingin menitipkan barang belanjaan atau mengirimkan paket ke alamat kami di Jepang, mohon konfirmasi dan selesaikan detailnya sebelum jadwal ditutup agar kuota bagasi dapat kami amankan. Terima kasih! 🙏`,
  },
  {
    id: "oversized-item",
    category: "aturan",
    title: "Barang besar · tarif satuan",
    description: "Harga dihitung per barang, bukan per kg.",
    icon: Ruler,
    text: `Halo Kak! Untuk barang berukuran besar, tarif handcarry tidak dihitung per kg, melainkan per barang/satuan.

Harganya menyesuaikan ukuran, volume, dan jenis barang. Boleh kirim nama barang, tautan produk, serta ukuran atau dimensinya? Kami cek dulu dan konfirmasi tarif sebelum pesanan diproses.

Terima kasih! 🙏`,
  },
  {
    id: "cannot-carry",
    category: "aturan",
    title: "Barang terlalu besar",
    description: "Info barang bulky yang tidak bisa dibawa.",
    icon: PackageX,
    text: `Mohon maaf Kak, kami belum bisa menerima barang yang terlalu besar atau memakan banyak ruang untuk dibawa Handcarry.

Barang tersebut tidak muat atau tidak memungkinkan dibawa dengan kapasitas bagasi yang tersedia.

Terima kasih atas pengertiannya.`,
  },
  {
    id: "restricted-items",
    category: "aturan",
    title: "Barang terlarang & terbatas",
    description: "Jelaskan barang yang tidak dapat diterima atau perlu dicek dulu.",
    icon: ShieldAlert,
    text: `Halo Kak, demi keamanan dan kepatuhan terhadap aturan, kami tidak menerima narkotika/psikotropika, senjata api dan amunisi, bahan peledak, uang atau kartu palsu, barang palsu yang melanggar merek/hak cipta, materi pornografi ilegal, serta produk dari satwa atau tumbuhan yang dilindungi.

Obat dan suplemen, kosmetik, makanan atau produk hewani, tanaman/biji, serta produk satwa atau tumbuhan tertentu dapat memerlukan izin atau pemeriksaan karantina. Mohon tanyakan nama dan foto produk kepada kami sebelum memesan.

Daftar ini ringkasan umum. Penerimaan barang mengikuti aturan Bea Cukai Jepang dan Indonesia serta ketentuan maskapai. Terima kasih atas pengertiannya.`,
  },
];

const CATEGORIES: Array<{ id: TemplateCategory; label: string; icon: LucideIcon }> = [
  { id: "all", label: "Semua", icon: MessageCircle },
  { id: "pembayaran", label: "Rekening & DP", icon: Landmark },
  { id: "ongkir", label: "Ongkir & Tarif", icon: ArrowLeftRight },
  { id: "alamat", label: "Alamat & Resi", icon: MapPin },
  { id: "aturan", label: "Aturan & Jadwal", icon: ShieldAlert },
];

const YAMATO_PREFECTURE_OPTIONS = YAMATO_PREFECTURES.map((prefecture) => ({
  label: prefecture,
  value: prefecture,
}));

const LETTER_PACK_OPTIONS = {
  light: { label: "Letter Pack Light", priceYen: 430, delivery: "Dikirim ke kotak surat" },
  plus: { label: "Letter Pack Plus", priceYen: 600, delivery: "Diantar langsung, perlu tanda terima" },
} as const;

// ─── WA Bubble Message Renderer ─────────────────────────────────────────────
function WhatsAppBubblePreview({
  text,
  customerName,
  phone,
}: {
  text: string;
  customerName?: string;
  phone?: string;
}) {
  const timeStr = useMemo(() => {
    return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }, []);

  const lines = text.split("\n");

  return (
    <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-[#E5DDD5]">
      {/* WhatsApp Header Simulation */}
      <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#075E54] flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            NJ
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold leading-tight truncate">
              {customerName ? customerName : "Nihong Jastip Client"}
            </h4>
            <p className="text-[10px] text-emerald-200 font-medium truncate">
              {phone ? phone : "+62 (WhatsApp)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded-full text-emerald-100">
          <span>Preview Chat</span>
        </div>
      </div>

      {/* WhatsApp Chat Area */}
      <div className="p-3 sm:p-4 min-h-[220px] max-h-[420px] overflow-y-auto space-y-2 bg-[radial-gradient(#d4cbbe_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Date separator */}
        <div className="flex justify-center my-1">
          <span className="text-[10px] font-bold text-slate-600 bg-white/80 shadow-xs px-2.5 py-0.5 rounded-full backdrop-blur-xs">
            Hari ini
          </span>
        </div>

        {/* Chat Bubble (Outgoing) */}
        <div className="flex justify-end">
          <div className="relative max-w-[92%] sm:max-w-[85%] bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs p-3 shadow-[0_1px_2px_rgba(0,0,0,0.13)] border border-emerald-200/40">
            <div className="text-xs sm:text-[13px] leading-relaxed space-y-1 font-sans">
              {lines.map((line, idx) => {
                if (!line.trim()) {
                  return <div key={idx} className="h-1.5" />;
                }

                // Parse bold (*bold*) and italic (_italic_)
                const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g);
                return (
                  <p key={idx} className="break-words">
                    {parts.map((part, pIdx) => {
                      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                        return (
                          <strong key={pIdx} className="font-extrabold text-slate-950">
                            {part.slice(1, -1)}
                          </strong>
                        );
                      }
                      if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
                        return (
                          <em key={pIdx} className="italic">
                            {part.slice(1, -1)}
                          </em>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>

            {/* Timestamp & read receipts */}
            <div className="flex items-center justify-end gap-1 mt-1.5 pt-0.5 text-[9.5px] text-slate-500 font-medium select-none">
              <span>{timeStr}</span>
              <CheckCheck size={13} className="text-[#34B7F1]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppTemplatesPage() {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("all");
  const [selectedId, setSelectedId] = useState<TemplateId>("bank-account");
  const [messageText, setMessageText] = useState(TEMPLATES[0].text);
  const [phone, setPhone] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Customers data & picker
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Yamato calculator state
  const [yamatoOrigin, setYamatoOrigin] = useState<YamatoPrefecture>("Osaka");
  const [yamatoDestination, setYamatoDestination] = useState<YamatoPrefecture | "">("");
  const [yamatoWeight, setYamatoWeight] = useState("");

  // Letterpack calculator state
  const [letterPackType, setLetterPackType] = useState<keyof typeof LETTER_PACK_OPTIONS>("light");
  const [letterPackWeight, setLetterPackWeight] = useState("");
  const [letterPackThickness, setLetterPackThickness] = useState("");

  const editorSectionRef = useRef<HTMLDivElement>(null);

  // 🔊 Real-time customers loader
  useEffect(() => {
    const unsub = listenCustomers((data) => {
      setCustomers(data);
    });
    return () => unsub();
  }, []);

  // 🔗 Pre-fill from URL params (e.g. from OrderCard or BookingCard)
  useEffect(() => {
    const paramPhone = searchParams.get("phone");
    const paramName = searchParams.get("name");
    const paramTemplate = searchParams.get("template");

    if (paramPhone) {
      setPhone(paramPhone);
    }
    if (paramName) {
      setSelectedCustomerName(paramName);
    }
    if (paramTemplate) {
      const match = TEMPLATES.find((t) => t.id === paramTemplate);
      if (match) {
        setSelectedId(match.id);
        setSelectedCategory(match.category);
      }
    }
  }, [searchParams]);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0],
    [selectedId],
  );

  // Sync text when template changes, replacing [Nama] with customer name if available
  useEffect(() => {
    let t = selectedTemplate.text;
    if (selectedCustomerName) {
      const firstName = selectedCustomerName.split(" ")[0];
      t = t.replace(/\[Nama\]/g, firstName);
    }
    setMessageText(t);
    setCopyState("idle");
  }, [selectedTemplate, selectedCustomerName]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const hasInvalidPhone = phone.trim().length > 0 && normalizedPhone.length < 8;

  // Yamato calculation
  const yamatoWeightKg = Number(yamatoWeight);
  const yamatoEstimate = useMemo(() => {
    if (!yamatoDestination || !yamatoWeight.trim()) return null;
    return estimateYamatoByRouteAndWeight(yamatoOrigin, yamatoDestination, yamatoWeightKg);
  }, [yamatoDestination, yamatoOrigin, yamatoWeight, yamatoWeightKg]);

  // Letterpack calculation
  const letterPackWeightKg = Number(letterPackWeight);
  const letterPackThicknessCm = Number(letterPackThickness);
  const letterPackWeightValid =
    letterPackWeight.trim() !== "" &&
    Number.isFinite(letterPackWeightKg) &&
    letterPackWeightKg > 0 &&
    letterPackWeightKg <= 4;
  const letterPackThicknessValid =
    letterPackType === "plus" ||
    (letterPackThickness.trim() !== "" &&
      Number.isFinite(letterPackThicknessCm) &&
      letterPackThicknessCm > 0 &&
      letterPackThicknessCm <= 3);
  const canEstimateLetterPack = letterPackWeightValid && letterPackThicknessValid;

  const handleInsertYamatoEstimate = () => {
    if (!yamatoEstimate || !yamatoDestination) return;

    const formattedWeight = new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2,
    }).format(yamatoWeightKg);
    const formattedYen = new Intl.NumberFormat("id-ID").format(yamatoEstimate.amountYen);
    setMessageText(
      `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Yamato:\n\n` +
      `📍 Rute: ${yamatoOrigin} → ${yamatoDestination}\n` +
      `⚖️ Berat paket: ${formattedWeight} kg\n` +
      `📦 Ukuran minimum berdasarkan berat: ${yamatoEstimate.size} (maks. ${yamatoEstimate.maxWeightKg} kg)\n` +
      `🚚 Estimasi ongkir Yamato: *¥${formattedYen}*\n\n` +
      `Estimasi ini memakai tarif tunai Yamato dan ukuran minimum berdasarkan berat saja. Ukuran final ditentukan dari dimensi dan berat paket, sehingga ongkir dapat berubah setelah paket diukur. Biaya ini belum termasuk tarif handcarry.`,
    );
    setCopyState("idle");
  };

  const handleInsertLetterPackEstimate = () => {
    if (!canEstimateLetterPack) return;

    const option = LETTER_PACK_OPTIONS[letterPackType];
    const formattedWeight = new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2,
    }).format(letterPackWeightKg);
    const formattedYen = new Intl.NumberFormat("id-ID").format(option.priceYen);
    const thicknessLine =
      letterPackType === "light"
        ? `\n📏 Ketebalan paket: ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(letterPackThicknessCm)} cm`
        : "";
    setMessageText(
      `Halo Kak! Berikut perkiraan biaya pengiriman domestik Jepang menggunakan Japan Post Letter Pack:\n\n` +
      `📮 Jenis: ${option.label} · ${option.delivery}\n` +
      `⚖️ Berat paket: ${formattedWeight} kg${thicknessLine}\n` +
      `🚚 Ongkir domestik: *¥${formattedYen}* (tarif tetap seluruh Jepang)\n\n` +
      `Letter Pack hanya berlaku untuk pengiriman domestik di Jepang dan menggunakan amplop khusus Japan Post. Biaya ini belum termasuk tarif handcarry.`,
    );
    setCopyState("idle");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  };

  const handleOpenWhatsApp = () => {
    const recipientUrl = normalizedPhone ? `/${normalizedPhone}` : "/";
    const url = `https://wa.me${recipientUrl}?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSelectTemplate = (id: TemplateId) => {
    setSelectedId(id);
    // Smooth scroll down to editor on mobile so user immediately sees the change
    if (window.innerWidth < 768) {
      setTimeout(() => {
        editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handlePickCustomer = (c: Customer) => {
    if (c.telpon) setPhone(c.telpon);
    setSelectedCustomerName(c.nama);
    setShowCustomerModal(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerName("");
    setPhone("");
  };

  const filteredCustomerList = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 20);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        (c.telpon && c.telpon.includes(q)),
    ).slice(0, 30);
  }, [customers, customerSearchQuery]);

  return (
    <div className="min-h-screen bg-transparent pb-48 font-sans md:pb-28">
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-5 sm:px-6 sm:py-8">
        <HeroPageHeader
          variant="gradient"
          badgeIcon={MessageCircle}
          badgeLabel="Nihong Jastip · WhatsApp"
          title="Template Chat WhatsApp"
          description="Pilih template pesan, pilih pelanggan, sesuaikan teks atau preview balon chat, lalu salin atau kirim."
          mobileSubtitle="Pilih template, tentukan penerima, lalu salin atau kirim via WhatsApp."
        />

        {/* ── 0. SECTION: PENERIMA PESAN & DATABASE PELANGGAN ── */}
        <section
          aria-labelledby="recipient-section-title"
          className="rounded-2xl border border-white bg-surface-card p-4 shadow-card ring-1 ring-brand-navy/5 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="recipient-section-title" className="text-xs font-black uppercase tracking-wider text-slate-500">
                Penerima WhatsApp (Opsional)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih kontak dari data pelanggan atau ketik nomor WhatsApp secara langsung.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCustomerModal(true)}
              className="min-h-[42px] px-3.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-navy flex items-center justify-center gap-2 self-start sm:self-auto"
            >
              <Users size={14} className="text-brand-orange" />
              <span>Pilih dari Data Pelanggan</span>
            </Button>
          </div>

          <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {selectedCustomerName ? (
              <div className="flex items-center justify-between gap-2 bg-brand-cream/80 border border-brand-orange/30 px-3 py-2 rounded-xl text-xs font-bold text-brand-navyDark">
                <span className="flex items-center gap-1.5 truncate">
                  <User size={14} className="text-brand-orange shrink-0" />
                  <span className="truncate">{selectedCustomerName}</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span className="font-mono text-brand-orange">{phone || "Tanpa No HP"}</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                  title="Ganti / Hapus Pelanggan"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            <div className="flex-1 relative">
              <input
                id="whatsapp-template-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx atau 62xxxxxxxxxx"
                className="min-h-[44px] w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15"
              />
            </div>

            {cleanPhoneIndicator(phone, normalizedPhone, hasInvalidPhone)}
          </div>
        </section>

        {/* ── 1. SECTION: PILIH TEMPLATE ── */}
        <section aria-labelledby="template-list-title" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 id="template-list-title" className="text-sm font-extrabold text-brand-navyDark">
                1. Pilih Kategori & Template Pesan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tersedia {TEMPLATES.length} template siap pakai untuk berbagai tahapan jastip.
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400 self-start sm:self-auto">
              Aktif: <strong className="text-brand-navy">{selectedTemplate.title}</strong>
            </span>
          </div>

          {/* Horizontal Category Scroll Tabs (Mobile-Friendly) */}
          <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => {
              const count =
                cat.id === "all"
                  ? TEMPLATES.length
                  : TEMPLATES.filter((t) => t.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? "bg-brand-navy text-white shadow-sm ring-2 ring-brand-navy/20"
                      : "bg-surface-card border border-surface-border text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon size={13} className={isSelected ? "text-brand-orange" : "text-slate-400"} />
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile-Optimized Template Selector: Compact horizontal/vertical list */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {filteredTemplates.map((template, index) => {
              const Icon = template.icon;
              const isSelected = selectedId === template.id;

              return (
                <motion.button
                  key={template.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelectTemplate(template.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[64px] sm:min-h-[90px] items-center sm:items-start gap-2.5 rounded-2xl border p-2.5 text-left transition-all active:scale-[0.99] sm:p-3.5 ${
                    isSelected
                      ? "border-brand-orange/70 bg-brand-cream/90 shadow-sm ring-2 ring-brand-orange/15"
                      : "border-surface-border bg-surface-card hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {/* Icon */}
                  <span
                    className={`grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl transition-transform ${
                      isSelected
                        ? "bg-brand-orange text-white shadow-xs"
                        : "bg-brand-mist text-brand-navy group-hover:scale-105"
                    }`}
                  >
                    <Icon size={16} />
                  </span>

                  {/* Info */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block text-xs sm:text-sm font-extrabold leading-tight text-brand-navyDark truncate">
                        {template.title}
                      </span>
                      {template.badge && (
                        <span className="rounded-md bg-brand-orange/10 px-1.5 py-0.2 text-[9px] font-black text-brand-orange shrink-0">
                          {template.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-slate-500 sm:line-clamp-2">
                      {template.description}
                    </span>
                  </span>

                  {/* Indicator */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-orange text-white">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="text-slate-300 group-hover:text-slate-500 sm:hidden">
                        <ChevronRight size={16} />
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── KALKULATOR KHUSUS JIKA DIPILIH ── */}
        {selectedId === "yamato-estimate" && (
          <section
            aria-labelledby="yamato-calculator-title"
            className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-navy">
                <Calculator size={19} />
              </span>
              <div>
                <h2 id="yamato-calculator-title" className="text-sm font-extrabold text-brand-navyDark">
                  Hitung estimasi ongkir Yamato
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Isi prefektur asal, tujuan, dan berat paket untuk melihat tarif otomatis.
                </p>
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
                <label htmlFor="yamato-weight" className="mb-1.5 block text-sm font-bold text-slate-600">
                  Berat paket (kg)
                </label>
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

            <div
              aria-live="polite"
              className={`rounded-xl border p-3.5 ${
                yamatoEstimate ? "border-emerald-200 bg-emerald-50/70" : "border-surface-border bg-surface-base/70"
              }`}
            >
              {yamatoEstimate ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">
                      Estimasi ongkir Yamato · tarif tunai, termasuk pajak
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-brand-navyDark">
                      ¥{new Intl.NumberFormat("id-ID").format(yamatoEstimate.amountYen)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {yamatoOrigin} → {yamatoDestination} · minimum ukuran {yamatoEstimate.size} berdasarkan berat
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Estimasi
                  </span>
                </div>
              ) : yamatoWeight.trim() && (!Number.isFinite(yamatoWeightKg) || yamatoWeightKg <= 0) ? (
                <p className="text-sm leading-relaxed text-rose-700">Masukkan berat paket lebih dari 0 kg.</p>
              ) : yamatoWeightKg > 30 ? (
                <p className="text-sm leading-relaxed text-rose-700">
                  Kalkulator standar ini untuk paket sampai 30 kg. Untuk paket lebih berat, cek layanan Yamato khusus.
                </p>
              ) : !yamatoDestination ? (
                <p className="text-sm leading-relaxed text-slate-600">Pilih prefektur tujuan untuk menghitung ongkir.</p>
              ) : !yamatoWeight.trim() ? (
                <p className="text-sm leading-relaxed text-slate-600">Masukkan berat paket untuk menghitung ongkir.</p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">
                  Tarif untuk rute ini belum tersedia di kalkulator. Silakan periksa tabel resmi Yamato.
                </p>
              )}
            </div>

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
          <section
            aria-labelledby="letterpack-calculator-title"
            className="space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-navy">
                <Mail size={19} />
              </span>
              <div>
                <h2 id="letterpack-calculator-title" className="text-sm font-extrabold text-brand-navyDark">
                  Hitung ongkir Letter Pack
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Tarif tetap untuk seluruh Jepang, jadi tidak perlu mengisi rute.
                </p>
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
                    className={`flex min-h-[76px] items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-brand-orange/60 bg-brand-cream ring-2 ring-brand-orange/10"
                        : "border-surface-border bg-white hover:border-slate-300"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-brand-navyDark">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{option.delivery}</span>
                    </span>
                    <span className="shrink-0 text-base font-extrabold text-brand-navyDark">
                      ¥{new Intl.NumberFormat("id-ID").format(option.priceYen)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={letterPackType === "plus" ? "sm:col-span-2" : ""}>
                <label htmlFor="letterpack-weight" className="mb-1.5 block text-sm font-bold text-slate-600">
                  Berat paket (kg)
                </label>
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
                  <label htmlFor="letterpack-thickness" className="mb-1.5 block text-sm font-bold text-slate-600">
                    Ketebalan paket (cm)
                  </label>
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

            <div
              aria-live="polite"
              className={`rounded-xl border p-3.5 ${
                canEstimateLetterPack ? "border-emerald-200 bg-emerald-50/70" : "border-surface-border bg-surface-base/70"
              }`}
            >
              {letterPackWeight.trim() === "" ? (
                <p className="text-sm leading-relaxed text-slate-600">
                  Masukkan berat paket untuk memeriksa kelayakan dan menampilkan tarif.
                </p>
              ) : !Number.isFinite(letterPackWeightKg) || letterPackWeightKg <= 0 ? (
                <p className="text-sm leading-relaxed text-rose-700">Masukkan berat paket lebih dari 0 kg.</p>
              ) : letterPackWeightKg > 4 ? (
                <p className="text-sm leading-relaxed text-rose-700">Letter Pack hanya menerima paket sampai 4 kg.</p>
              ) : letterPackType === "light" && letterPackThickness.trim() === "" ? (
                <p className="text-sm leading-relaxed text-slate-600">
                  Masukkan ketebalan paket untuk mengecek Letter Pack Light.
                </p>
              ) : letterPackType === "light" && (!Number.isFinite(letterPackThicknessCm) || letterPackThicknessCm <= 0) ? (
                <p className="text-sm leading-relaxed text-rose-700">Masukkan ketebalan paket lebih dari 0 cm.</p>
              ) : letterPackType === "light" && letterPackThicknessCm > 3 ? (
                <p className="text-sm leading-relaxed text-rose-700">
                  Paket lebih dari 3 cm tidak memenuhi batas Letter Pack Light. Coba Letter Pack Plus.
                </p>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Estimasi ongkir domestik Jepang · tarif tetap seluruh Jepang
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-brand-navyDark">
                    ¥{new Intl.NumberFormat("id-ID").format(LETTER_PACK_OPTIONS[letterPackType].priceYen)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {LETTER_PACK_OPTIONS[letterPackType].label} · berat{" "}
                    {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(letterPackWeightKg)} kg
                  </p>
                </div>
              )}
            </div>

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

        {/* ── 2. SECTION: EDIT PESAN & PREVIEW WA BUBBLE ── */}
        <div ref={editorSectionRef} className="scroll-mt-4">
          <section
            aria-labelledby="message-editor-title"
            className="overflow-hidden rounded-card border border-white bg-surface-card shadow-card ring-1 ring-brand-navy/5"
          >
            {/* Header: Judul & Toggle Mode Edit vs Balon WA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MessageCircle size={19} />
                </div>
                <div className="min-w-0">
                  <h2 id="message-editor-title" className="text-sm font-extrabold text-brand-navyDark leading-tight truncate">
                    2. Sesuaikan Pesan ({selectedTemplate.title})
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    Bisa diedit atau langsung dikirimkan ke WhatsApp pelanggan.
                  </p>
                </div>
              </div>

              {/* View Mode Toggle: [✏️ Edit Teks] & [💬 Preview Balon WA] */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "edit"
                      ? "bg-white text-brand-navyDark shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Editor Teks</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "preview"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Eye size={13} />
                  <span>Preview Balon WA</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {/* Variable Quick-Insert Chips (Sangat Ramah Mobile) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Sisipkan Pintas ke Pesan (1-Klik)
                </label>
                <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const name = selectedCustomerName ? selectedCustomerName.split(" ")[0] : "Kak";
                      setMessageText((prev) => `${prev} Kak ${name}`);
                    }}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus size={11} />
                    <span>Nama Pelanggan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageText(
                        (prev) => `${prev}\n\n*Rekening Pembayaran:*\nBCA: 0800826764\nMANDIRI: 700012366782\na.n DIN MIZWAR ULYA SYEKH KHODIR`,
                      );
                    }}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus size={11} />
                    <span>Rekening BCA & Mandiri</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageText(
                        (prev) => `${prev}\n\n*Alamat Jepang:*\nDIN MIZWAR (07084476483)\nOsaka-fu, Senboku-gun, Tadaoka-cho, Tadaoka-kita 2-13-4 (595-0811)`,
                      );
                    }}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus size={11} />
                    <span>Alamat Jepang</span>
                  </button>
                </div>
              </div>

              {/* Tampilan View Mode: Editor vs Preview Balon */}
              {viewMode === "edit" ? (
                <div>
                  <textarea
                    id="whatsapp-template-message"
                    value={messageText}
                    onChange={(event) => {
                      setMessageText(event.target.value);
                      setCopyState("idle");
                    }}
                    rows={10}
                    className="min-h-[240px] w-full resize-y rounded-2xl border border-surface-border bg-white p-3.5 text-sm sm:text-base leading-relaxed text-slate-700 outline-none transition focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15 font-sans"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span>* Format *tebal* dan _miring_ didukung otomatis.</span>
                    <span>{messageText.length} karakter</span>
                  </div>
                </div>
              ) : (
                <div>
                  <WhatsAppBubblePreview
                    text={messageText}
                    customerName={selectedCustomerName}
                    phone={normalizedPhone ? `+${normalizedPhone}` : undefined}
                  />
                </div>
              )}

              {/* Action Buttons (Inline di Bawah Editor untuk Tablet/Desktop & Mobile) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-surface-border pt-4">
                <p
                  aria-live="polite"
                  className={`text-xs font-semibold ${
                    copyState === "copied"
                      ? "text-emerald-700"
                      : copyState === "error"
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {copyState === "copied"
                    ? "✓ Pesan berhasil disalin ke clipboard!"
                    : copyState === "error"
                    ? "Gagal menyalin. Silakan coba kembali."
                    : `${messageText.length} karakter siap dikirim.`}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="min-h-[46px] flex-1 sm:flex-none px-4 text-xs font-bold rounded-xl"
                  >
                    {copyState === "copied" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    <span>{copyState === "copied" ? "Tersalin ke Clipboard" : "Salin Pesan"}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    disabled={hasInvalidPhone}
                    className="min-h-[46px] flex-1 sm:flex-none bg-emerald-600 px-5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:ring-emerald-600 rounded-xl"
                  >
                    <Send size={16} />
                    <span>Buka di WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── 3. SECTION: CATATAN ATURAN & LARANGAN ── */}
        <details className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 sm:p-5">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 text-sm font-extrabold text-amber-950">
            <AlertTriangle size={18} className="shrink-0 text-amber-700" />
            <span>Lihat catatan barang terlarang dan terbatas</span>
          </summary>
          <div className="pt-2 pl-[30px]">
            <p className="text-xs leading-relaxed text-amber-900/80">
              Aturan berbeda menurut negara tujuan dan jenis barang. Pastikan ketentuan resminya sebelum menerima
              produk yang memerlukan izin atau pemeriksaan.
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

      {/* ── MODAL PILIH PELANGGAN DARI DATABASE ── */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomerModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold">
                    <Users size={16} />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800">Pilih Kontak Pelanggan</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Cari nama atau nomor HP pelanggan..."
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain">
                {filteredCustomerList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada pelanggan ditemukan
                  </div>
                ) : (
                  filteredCustomerList.map((c) => (
                    <button
                      key={c.id || c.nama}
                      type="button"
                      onClick={() => handlePickCustomer(c)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-cream/60 transition-colors text-left group"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                          {c.nama ? c.nama.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{c.nama}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {c.telpon || "Tanpa No HP"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-orange shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FLOATING QUICK BAR MOBILE (Tetap Bersih, Nyaman & Tidak Menutupi Layar) ── */}
      <div
        className="fixed inset-x-0 z-40 px-3 md:hidden"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-[0_12px_40px_rgba(7,27,51,0.18)] backdrop-blur-xl">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="min-h-[46px] min-w-0 flex-1 whitespace-nowrap px-2 text-xs font-bold rounded-xl"
          >
            {copyState === "copied" ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            <span>{copyState === "copied" ? "Tersalin!" : "Salin"}</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={hasInvalidPhone}
            className="min-h-[46px] min-w-0 flex-1 whitespace-nowrap bg-emerald-600 px-2 text-xs font-bold text-white hover:bg-emerald-700 focus:ring-emerald-600 rounded-xl"
          >
            <Send size={15} />
            <span>Kirim WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function cleanPhoneIndicator(phone: string, normalizedPhone: string, hasInvalidPhone: boolean) {
  if (!phone.trim()) {
    return (
      <span className="shrink-0 text-[11px] text-slate-400 hidden sm:inline">
        (Bisa dikosongkan untuk pilih kontak di WA)
      </span>
    );
  }

  if (hasInvalidPhone) {
    return (
      <span className="shrink-0 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-2 rounded-xl">
        Nomor tidak valid
      </span>
    );
  }

  return (
    <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl">
      ✓ Valid (+{normalizedPhone})
    </span>
  );
}
