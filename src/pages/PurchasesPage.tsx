import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Plus,
  Package,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  X,
  Search,
  SortAsc,
  SortDesc,
  ListPlus,
  Send,
  LayoutGrid,
  ClipboardList,
  Loader2,
  SearchX,
  ExternalLink,
  User,
  Users,
  CheckCircle,
  Clock,
  Share2,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Image as ImageIcon,
  Save,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatAndAddYear, formatDateDayMonth } from "../utils/helpers";
import { compressImage } from "../utils/image";
import SearchableSelect from "../components/ui/SearchableSelect";

// --- TYPES ---
import { PIC_OPTIONS, PLATFORM_OPTIONS } from "../utils/constants";
import { PurchaseItem, ShareConfig, Customer as PurchaseCustomer } from "../types";
import { listenCustomers as listenPurchaseCustomers, addCustomer as addPurchaseCustomer } from "../services/customersFirebase";

// --- SUB-COMPONENTS ---

const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-w-[100px] flex-1 relative overflow-hidden group">
    <div
      className={`absolute right-[-10px] top-[-10px] p-4 rounded-full ${bgClass} opacity-20 group-hover:scale-125 transition-transform duration-500`}
    >
      <Icon size={40} />
    </div>
    <div className={`p-2 w-fit rounded-xl ${bgClass} ${colorClass} mb-3`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-2xl font-black text-slate-800 tracking-tight">
        {value}
      </p>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  </div>
);

const Badge = ({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: "slate" | "orange" | "green" | "blue";
}) => {
  const styles = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${styles[color]} uppercase tracking-wide`}
    >
      {children}
    </span>
  );
};

// --- HELPERS ---
const formatRp = (val: number | "") => {
  if (val === "") return "";
  return val.toLocaleString("id-ID");
};

const parseRp = (val: string) => {
  const clean = val.replace(/\D/g, "");
  return clean === "" ? "" : Number(clean);
};

export default function PurchasesPage() {
  // --- STATE ---
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<"all" | "done" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"checklist" | "pricing">("checklist");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseItem | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<string, { originalPrice: number | ""; jastipPrice: number | "" }>>({});
  const [isSimpleEdit, setIsSimpleEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "draft">("input");

  // Form State
  const emptyForm = {
    name: "",
    quantity: "",
    pic: "",
    customer: "",
    platform: "",
    link: "",
    note: "",
    shippingDate: "",
    isDone: false,
    originalPrice: "" as number | "",
    jastipPrice: "" as number | "",
  };
  const [form, setForm] = useState(emptyForm);
  const [drafts, setDrafts] = useState<Omit<PurchaseItem, "id">[]>([]);


  const [customers, setCustomers] = useState<PurchaseCustomer[]>([]);
  const [datePhotos, setDatePhotos] = useState<Record<string, string[]>>({});
  const [uploadingForDate, setUploadingForDate] = useState<string | null>(null); // key format: "date_customer"
  const fileInputRefForDate = useRef<HTMLInputElement>(null);
  const [activeUploadDate, setActiveUploadDate] = useState<{ date: string; customer: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; date: string; customer: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ type: 'selection' | 'admin' | 'customer'; date?: string } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = listenPurchaseCustomers((rows) => setCustomers(rows));
    return () => unsub();
  }, []);

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      label: c.nama,
      value: c.nama,
    }));
  }, [customers]);

  const handleAddNewCustomer = async () => {
    const name = prompt("Masukkan nama customer baru untuk pembelian:");
    if (!name) return;

    // Check if already exists
    if (customers.some(c => c.nama.toLowerCase() === name.trim().toLowerCase())) {
      alert("Customer suda ada di daftar.");
      setForm(prev => ({ ...prev, customer: name.trim() }));
      return;
    }

    try {
      setIsProcessing(true);
      await addPurchaseCustomer({
        nama: name.trim(),
        alamat: "",
        telpon: "",
      });
      setForm(prev => ({ ...prev, customer: name.trim() }));
    } catch (e) {
      console.error(e);
      alert("Gagal menambah customer.");
    } finally {
      setIsProcessing(false);
    }
  };


  // --- EFFECT ---
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "purchases"),
      orderBy("shippingDate", sortOrder),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PurchaseItem[];
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, [sortOrder]);

  // Photo Listener for all dates
  useEffect(() => {
    const q = query(collection(db, "purchasePhotos"));
    const unsub = onSnapshot(q, (snapshot) => {
      const photos: Record<string, string[]> = {};
      snapshot.docs.forEach((d) => {
        photos[d.id] = d.data().urls || [];
      });
      setDatePhotos(photos);
    });
    return () => unsub();
  }, []);

  // --- ACTIONS ---
  const handleBulkSave = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      Object.entries(bulkPrices).forEach(([id, prices]) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          // Only update if prices actually changed
          if (item.originalPrice !== prices.originalPrice || item.jastipPrice !== prices.jastipPrice) {
            const docRef = doc(db, "purchases", id);
            batch.update(docRef, {
              originalPrice: prices.originalPrice === "" ? null : prices.originalPrice,
              jastipPrice: prices.jastipPrice === "" ? null : prices.jastipPrice,
            });
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        await batch.commit();
        alert("Semua harga berhasil diperbarui!");
      }
      setIsBulkEditing(false);
      setBulkPrices({});
    } catch (error) {
      console.error("Error bulk saving:", error);
      alert("Gagal memperbarui harga.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addToDraft = () => {
    if (!form.name || !form.pic || !form.shippingDate || !form.customer) return;
    const cleanedItem = {
      ...form,
      originalPrice: form.originalPrice === "" ? null : form.originalPrice,
      jastipPrice: form.jastipPrice === "" ? null : form.jastipPrice,
    } as Omit<PurchaseItem, "id">;
    setDrafts((prev) => [...prev, cleanedItem]);
    setForm((prev) => ({
      ...emptyForm,
      pic: prev.pic,
      shippingDate: prev.shippingDate,
      customer: prev.customer,
      platform: prev.platform,
    }));
    setActiveTab("draft");
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveAll = async () => {
    setIsProcessing(true);
    try {
      const cleanedForm = {
        ...form,
        originalPrice: form.originalPrice === "" ? null : form.originalPrice,
        jastipPrice: form.jastipPrice === "" ? null : form.jastipPrice,
      };
      if (editing) {
        // @ts-ignore
        await updateDoc(doc(db, "purchases", editing.id), cleanedForm);
      } else if (drafts.length > 0) {
        const batch = writeBatch(db);
        drafts.forEach((d) => {
          const newRef = doc(collection(db, "purchases"));
          batch.set(newRef, d);
        });
        await batch.commit();
      }
      closeModal();
    } catch (e) {
      console.error("Error saving:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini?")) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "purchases", id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDone = async (item: PurchaseItem) => {
    try {
      await updateDoc(doc(db, "purchases", item.id), { isDone: !item.isDone });
    } catch (e) {
      console.error(e);
    }
  };

  const openPlatformLink = (url?: string) => {
    if (!url) return;
    const validUrl = url.startsWith("http") ? url : `https://${url}`;
    window.open(validUrl, "_blank", "noopener,noreferrer");
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditing(null);
    setIsSimpleEdit(false);
    setForm(emptyForm);
    setDrafts([]);
    setActiveTab("input");
  };

  const handlePhotoUploadForDate = async (e: React.ChangeEvent<HTMLInputElement>, date: string, customer: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = `${date}_${customer}`;
    if ((datePhotos[key]?.length || 0) >= 8) {
      alert("Maksimal 8 foto per tanggal & customer.");
      return;
    }

    setUploadingForDate(key);
    try {
      const compressedBlob = await compressImage(file);
      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset || cloudName === "your_cloud_name") {
        alert("Konfigurasi Cloudinary belum lengkap di .env");
        return;
      }

      const formData = new FormData();
      formData.append("file", compressedBlob, file.name);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (data.secure_url) {
        const currentUrls = datePhotos[key] || [];
        const newUrls = [...currentUrls, data.secure_url];
        await setDoc(doc(db, "purchasePhotos", key), { urls: newUrls });
      } else if (data.error) {
        alert(`Cloudinary Error: ${data.error.message}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Gagal mengunggah gambar.");
    } finally {
      setUploadingForDate(null);
    }
  };

  const handleDeletePhotoForDate = async (date: string, customer: string, urlToDelete: string) => {
    if (!confirm("Hapus foto ini?")) return;
    const key = `${date}_${customer}`;
    try {
      const currentUrls = datePhotos[key] || [];
      const newUrls = currentUrls.filter(u => u !== urlToDelete);
      await setDoc(doc(db, "purchasePhotos", key), { urls: newUrls });
      // Close lightbox if the deleted photo was active
      if (selectedPhoto?.url === urlToDelete) {
        setSelectedPhoto(null);
      }
    } catch (err) {
      console.error("Delete photo error:", err);
      alert("Gagal menghapus foto.");
    }
  };

  const navigateLightbox = (direction: 'next' | 'prev') => {
    if (!selectedPhoto) return;
    const key = `${selectedPhoto.date}_${selectedPhoto.customer}`;
    const urls = datePhotos[key] || [];
    if (urls.length <= 1) return;

    const currentIndex = urls.indexOf(selectedPhoto.url);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % urls.length;
    } else {
      nextIndex = (currentIndex - 1 + urls.length) % urls.length;
    }
    setSelectedPhoto({ ...selectedPhoto, url: urls[nextIndex] });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowRight') navigateLightbox('next');
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'Escape') setSelectedPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, datePhotos]);

  const handleShareToAdmin = (picName: string, date: string) => {
    const itemsForPic = items.filter(i => i.pic === picName && i.shippingDate === date);
    if (itemsForPic.length === 0) return;

    let message = `*Daftar Belanja - ${picName}*\n`;
    message += `📅 Tanggal Pengiriman: ${formatAndAddYear(date)}\n\n`;

    const byCustomer = itemsForPic.reduce((acc, i) => {
      const c = i.customer || "Tanpa Customer";
      if (!acc[c]) acc[c] = [];
      acc[c].push(i);
      return acc;
    }, {} as Record<string, PurchaseItem[]>);

    Object.entries(byCustomer).forEach(([customer, customerItems]) => {
      message += `👤 *${customer.toUpperCase()}*\n`;
      customerItems.forEach(item => {
        const price = Number(item.jastipPrice) || 0;
        message += `${item.isDone ? "✅" : "🔴"} ${item.name} (${item.quantity})`;
        if (price) message += ` [Rp${formatRp(price)}]`;
        message += `\n`;
        if (item.note) message += `   └ _${item.note}_\n`;
      });
      message += `\n`;
    });

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    setShareModal(null);
  };

  const handleShareToCustomer = (customerName: string, date: string) => {
    const itemsForCustomer = items.filter(i => i.customer === customerName && i.shippingDate === date);
    if (itemsForCustomer.length === 0) return;

    let message = `*Rincian Pesanan - ${customerName}*\n`;
    message += `📅 Tanggal Pengiriman: ${formatAndAddYear(date)}\n\n`;

    itemsForCustomer.forEach((item, idx) => {
      message += `${idx + 1}. *${item.name}*\n`;
      message += `   Qty: ${item.quantity}\n`;
      if (item.note) message += `   Catatan: ${item.note}\n`;
      message += `\n`;
    });

    message += `Terima kasih sudah belanja! 🙏`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    setShareModal(null);
  };
  const processedItems = useMemo(() => {
    let result = items;

    // Note: We used to filter by usageType here, but users want to see all data 
    // in both layouts to facilitate price entry for existing items.

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.pic.toLowerCase().includes(q) ||
          i.customer.toLowerCase().includes(q),
      );
    }
    if (filter === "done") result = result.filter((i) => i.isDone);
    if (filter === "pending") result = result.filter((i) => !i.isDone);
    return result;
  }, [items, filter, searchQuery, viewMode]);

  const grouped = useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        done: number;
        pics: Record<string, Record<string, PurchaseItem[]>>;
      }
    > = {};

    processedItems.forEach((item) => {
      const shippingDate = item.shippingDate || "Tanpa Tanggal";
      const pic = item.pic || "TANPA PIC";
      const customer = item.customer || "TANPA CUSTOMER";

      if (!map[shippingDate]) {
        map[shippingDate] = { total: 0, done: 0, pics: {} };
      }

      if (!map[shippingDate].pics[pic]) {
        map[shippingDate].pics[pic] = {};
      }

      if (!map[shippingDate].pics[pic][customer]) {
        map[shippingDate].pics[pic][customer] = [];
      }

      map[shippingDate].pics[pic][customer].push(item);
      map[shippingDate].total += 1;
      if (item.isDone) map[shippingDate].done += 1;
    });

    // Sort items by name within each customer group in checklist view
    Object.values(map).forEach(dateData => {
      Object.values(dateData.pics).forEach(customerMap => {
        Object.values(customerMap).forEach(itemList => {
          itemList.sort((a, b) => a.name.localeCompare(b.name));
        });
      });
    });

    return map;
  }, [processedItems]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.isDone).length;
    return { total, done, pending: total - done };
  }, [items]);

  const uniqueDates = useMemo(
    () => [...new Set(items.map((i) => i.shippingDate))].sort(),
    [items],
  );

  // --- SHARE GENERATOR ---
  // --- SPLIT SHARING LOGIC ---
  // (Using handleShareToAdmin and handleShareToCustomer defined above)

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-28">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-md flex items-center justify-center"
          >
            <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-orange-500" size={32} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Memproses...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Jastip Tracker
            </h1>
            <div className="flex items-center gap-2">
              {/* Share Button */}
              <button
                onClick={() => setShareModal({ type: 'selection' })}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 shadow-sm transition-all"
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Package size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.pending}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stats.done}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* --- STICKY SEARCH & FILTER --- */}
        <div className="sticky top-16 z-20 mb-6 space-y-3">
          {/* Main Toggle */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button
              onClick={() => setViewMode("checklist")}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === "checklist" ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ClipboardList size={16} />
              Checklist
            </button>
            <button
              onClick={() => setViewMode("pricing")}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewMode === "pricing" ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={16} />
              Penentuan Harga
            </button>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Cari item, customer, pic..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-slate-400 placeholder:font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 sm:pt-0 pb-1 sm:pb-0 px-1 sm:px-0">
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="aspect-square h-full p-3 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-orange-500 transition-colors shrink-0 flex items-center justify-center"
              >
                {sortOrder === "asc" ? (
                  <SortAsc size={18} />
                ) : (
                  <SortDesc size={18} />
                )}
              </button>
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 h-full items-center">
                {(["all", "pending", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all h-full flex items-center ${filter === f ? "bg-white text-slate-800 shadow-sm scale-100" : "text-slate-400 hover:text-slate-600 scale-95"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="space-y-10">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2
                className="animate-spin text-orange-400 mx-auto"
                size={40}
              />
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                Memuat Data...
              </p>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
              <SearchX
                size={80}
                className="text-slate-300 mb-4"
                strokeWidth={1}
              />
              <h3 className="text-base font-bold text-slate-600">
                Tidak ada data ditemukan
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Coba ubah kata kunci atau filter anda.
              </p>
            </div>
          ) : viewMode === "checklist" ? (
            Object.entries(grouped).map(([date, data]) => {
              const progress =
                data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;

              return (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={date}
                  className="relative"
                >
                  {/* Date Header Group */}
                  <div className="sticky top-[10.5rem] z-20 bg-slate-50/95 backdrop-blur-sm pb-4 pt-2 mb-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-slate-800 text-white p-2 rounded-lg">
                          <Calendar size={18} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                          {formatAndAddYear(date)}
                        </h2>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                        {data.done}/{data.total} Selesai
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full rounded-full ${progress === 100 ? "bg-emerald-500" : "bg-orange-500"}`}
                      />
                    </div>
                  </div>

                  {/* Group by PIC */}
                  <div className="space-y-6">
                    {Object.entries(data.pics).map(([pic, customerMap]) => (
                      <div
                        key={pic}
                        className="relative pl-4 border-l-2 border-slate-200 ml-3"
                      >
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-50" />

                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            PIC: {pic}
                          </span>
                        </div>

                        {/* Group by Customer */}
                        <div className="space-y-3">
                          {Object.entries(customerMap).map(
                            ([customer, list]) => (
                              <div
                                key={customer}
                                className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200/60 overflow-hidden"
                              >
                                <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <User size={12} className="text-slate-400" />
                                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wide">
                                      {customer}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleShareToCustomer(customer, date)}
                                      className="p-1 px-2 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black hover:bg-emerald-100 transition-colors flex items-center gap-1 border border-emerald-100"
                                    >
                                      <Share2 size={10} />
                                      WA CUSTOMER
                                    </button>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                      {datePhotos[`${date}_${customer}`]?.length || 0}/8 Foto
                                    </span>
                                  </div>
                                </div>

                                {/* Customer Photos Gallery */}
                                <div className="px-2 py-3 bg-white border-b border-slate-100">
                                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                                    {(datePhotos[`${date}_${customer}`] || []).map((url, idx) => (
                                      <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0 group/photo cursor-zoom-in"
                                      >
                                        <img
                                          src={url}
                                          alt={`${customer} - ${idx}`}
                                          className="w-full h-full object-cover"
                                          onClick={() => setSelectedPhoto({ url, date, customer })}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePhotoForDate(date, customer, url);
                                          }}
                                          className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-lg text-red-500 shadow-sm opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </motion.div>
                                    ))}

                                    {(!datePhotos[`${date}_${customer}`] || datePhotos[`${date}_${customer}`].length < 8) && (
                                      <button
                                        onClick={() => {
                                          setActiveUploadDate({ date, customer });
                                          fileInputRefForDate.current?.click();
                                        }}
                                        disabled={uploadingForDate === `${date}_${customer}`}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all shrink-0 bg-slate-50/50"
                                      >
                                        {uploadingForDate === `${date}_${customer}` ? (
                                          <Loader2 size={18} className="animate-spin text-orange-400" />
                                        ) : (
                                          <>
                                            <ImageIcon size={18} strokeWidth={2.5} />
                                            <span className="text-[7px] font-black mt-1 uppercase">UPLOAD</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {list.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`relative p-3 transition-all hover:bg-slate-50 group ${item.isDone ? "opacity-50 grayscale-[0.8]" : ""}`}
                                    >
                                      <div className="flex gap-3 items-start">
                                        <button
                                          onClick={() => toggleDone(item)}
                                          className="mt-0.5 shrink-0 text-slate-300 hover:text-emerald-500 transition-colors active:scale-90"
                                        >
                                          {item.isDone ? (
                                            <CheckCircle2
                                              size={22}
                                              className="text-emerald-500"
                                            />
                                          ) : (
                                            <Circle size={22} strokeWidth={2} />
                                          )}
                                        </button>


                                        <div className="flex-1 min-w-0 pt-0.5">
                                          <div className="flex justify-between items-start">
                                            <h5
                                              className={`font-bold text-sm leading-snug ${item.isDone ? "text-slate-500 line-through decoration-slate-300" : "text-slate-800"}`}
                                            >
                                              {item.name}
                                            </h5>
                                            {/* Actions Overlay - Visible on mobile, hover on desktop */}
                                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/90 shadow-sm rounded-lg p-1 border border-slate-100">
                                              {item.link && (
                                                <button
                                                  onClick={() =>
                                                    openPlatformLink(item.link)
                                                  }
                                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md"
                                                >
                                                  <ExternalLink size={14} />
                                                </button>
                                              )}
                                              <button
                                                onClick={() => {
                                                  setEditing(item);
                                                  setForm({
                                                    name: item.name,
                                                    quantity: item.quantity,
                                                    pic: item.pic,
                                                    customer: item.customer,
                                                    shippingDate:
                                                      item.shippingDate,
                                                    isDone: item.isDone,
                                                    platform:
                                                      item.platform || "",
                                                    link: item.link || "",
                                                    note: item.note || "",
                                                    originalPrice: item.originalPrice ?? "",
                                                    jastipPrice: item.jastipPrice ?? "",
                                                  });
                                                  setIsOpen(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-md"
                                              >
                                                <Edit3 size={14} />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleDelete(item.id)
                                                }
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <Badge color="orange">
                                              {item.quantity}
                                            </Badge>
                                            {item.platform && (
                                              <Badge color="slate">
                                                {item.platform}
                                              </Badge>
                                            )}
                                          </div>

                                          {(item.originalPrice || item.jastipPrice) && (
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100/50">
                                              {item.originalPrice && (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Asli</span>
                                                  <span className="text-xs font-black text-orange-600">Rp{formatRp(item.originalPrice)}</span>
                                                </div>
                                              )}
                                              {item.jastipPrice && (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Jastip</span>
                                                  <span className="text-xs font-black text-emerald-600">Rp{formatRp(item.jastipPrice)}</span>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {item.note && (
                                            <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg italic border border-slate-100/50 flex gap-1.5">
                                              <span className="font-bold not-italic text-slate-400">
                                                Note:
                                              </span>{" "}
                                              {item.note}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              );
            })
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Edit3 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                      Penentuan Harga
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Input harga asli & jastip
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (isBulkEditing) {
                        setBulkPrices({});
                      } else {
                        const initialPrices: Record<string, { originalPrice: number | ""; jastipPrice: number | "" }> = {};
                        items.forEach(item => {
                          initialPrices[item.id] = {
                            originalPrice: item.originalPrice ?? "",
                            jastipPrice: item.jastipPrice ?? ""
                          };
                        });
                        setBulkPrices(initialPrices);
                      }
                      setIsBulkEditing(!isBulkEditing);
                    }}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isBulkEditing ? "bg-red-50 text-red-600 border border-red-100" : "bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-orange-200 hover:text-orange-600"}`}
                  >
                    {isBulkEditing ? <X size={16} /> : <Edit3 size={16} />}
                    {isBulkEditing ? "Batal" : "Edit Sekaligus"}
                  </button>

                  {isBulkEditing && (
                    <button
                      onClick={handleBulkSave}
                      disabled={isProcessing}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      SIMPAN SEMUA
                    </button>
                  )}
                </div>
              </div>

              {Object.entries(grouped).map(([date, data]) => (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={date}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <h3 className="text-sm font-black text-slate-700 tracking-tight">
                        {formatAndAddYear(date)}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {(() => {
                        const dateItems = processedItems.filter(i => i.shippingDate === date);
                        const totalOriginal = dateItems.reduce((sum, i) => sum + (Number(i.originalPrice) || 0), 0);
                        const totalJastip = dateItems.reduce((sum, i) => sum + (Number(i.jastipPrice) || 0), 0);
                        return (
                          <>
                            <div className="bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-orange-400 uppercase">Total Asli</span>
                              <span className="text-[11px] font-black text-orange-600">Rp{formatRp(totalOriginal)}</span>
                            </div>
                            <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase">Total Jastip</span>
                              <span className="text-[11px] font-black text-emerald-600">Rp{formatRp(totalJastip)}</span>
                            </div>
                          </>
                        );
                      })()}
                      <Badge color="blue">{data.total} ITEMS</Badge>
                    </div>
                  </div>

                  {/* Date Summary (Pricing View) */}
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex flex-wrap gap-2 items-center">
                      {(() => {
                        const dateItems = processedItems.filter(i => i.shippingDate === date);
                        const totalOriginal = dateItems.reduce((sum, i) => sum + (Number(i.originalPrice) || 0), 0);
                        const totalJastip = dateItems.reduce((sum, i) => sum + (Number(i.jastipPrice) || 0), 0);
                        return (
                          <>
                            <div className="bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-orange-400 uppercase">Total Asli</span>
                              <span className="text-[11px] font-black text-orange-600">Rp{formatRp(totalOriginal)}</span>
                            </div>
                            <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase">Total Jastip</span>
                              <span className="text-[11px] font-black text-emerald-600">Rp{formatRp(totalJastip)}</span>
                            </div>
                          </>
                        );
                      })()}
                      <Badge color="blue">{data.total} ITEMS</Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Barang</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PIC</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Asli</th>
                          <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Jastip</th>
                          <th className="px-5 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {Object.entries(
                          processedItems
                            .filter((i) => i.shippingDate === date)
                            .reduce((acc, item) => {
                              const cust = item.customer || "Tanpa Customer";
                              if (!acc[cust]) acc[cust] = [];
                              acc[cust].push(item);
                              return acc;
                            }, {} as Record<string, PurchaseItem[]>)
                        )
                          .sort(([a], [b]) => a.localeCompare(b)) // Sort Customer Names
                          .map(([customer, customerItems]) => (
                            <React.Fragment key={customer}>
                              {/* Customer Sub-header row */}
                              <tr className="bg-slate-50/50">
                                <td colSpan={2} className="px-5 py-2">
                                  <div className="flex flex-col gap-2 py-1">
                                    <div className="flex items-center gap-2">
                                      <User size={12} className="text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                        {customer}
                                      </span>
                                    </div>

                                    {/* Pricing View Customer Photos */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                                      {(datePhotos[`${date}_${customer}`] || []).map((url, idx) => (
                                        <motion.div
                                          key={idx}
                                          whileHover={{ scale: 1.1 }}
                                          className="relative w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm shrink-0 cursor-zoom-in"
                                        >
                                          <img
                                            src={url}
                                            className="w-full h-full object-cover"
                                            onClick={() => setSelectedPhoto({ url, date, customer })}
                                          />
                                        </motion.div>
                                      ))}
                                      {(!datePhotos[`${date}_${customer}`] || datePhotos[`${date}_${customer}`].length < 8) && (
                                        <button
                                          onClick={() => {
                                            setActiveUploadDate({ date, customer });
                                            fileInputRefForDate.current?.click();
                                          }}
                                          disabled={uploadingForDate === `${date}_${customer}`}
                                          className="w-10 h-10 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-orange-500 hover:bg-white transition-colors shrink-0"
                                        >
                                          {uploadingForDate === `${date}_${customer}` ? (
                                            <Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <ImageIcon size={14} />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-2">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sub-Total Asli</span>
                                    <span className="text-[11px] font-black text-orange-600">
                                      Rp{formatRp(customerItems.reduce((sum, i) => sum + (Number(i.originalPrice) || 0), 0))}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-2 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sub-Total Jastip</span>
                                    <span className="text-[11px] font-black text-emerald-600">
                                      Rp{formatRp(customerItems.reduce((sum, i) => sum + (Number(i.jastipPrice) || 0), 0))}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-2"></td>
                              </tr>
                              {customerItems
                                .sort((a, b) => a.name.localeCompare(b.name)) // Sort Item Names
                                .map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-50/30 transition-colors"
                                  >
                                    <td className="px-5 py-4">
                                      <p className="text-sm font-bold text-slate-800 line-clamp-1">
                                        {item.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                        Qty: {item.quantity}
                                      </p>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                          {item.pic}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4">
                                      {isBulkEditing ? (
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">Rp</span>
                                          <input
                                            type="text"
                                            className="w-24 bg-orange-50/50 border border-orange-100 rounded-lg pl-6 pr-2 py-1.5 font-bold text-xs outline-none focus:ring-2 focus:ring-orange-100"
                                            value={formatRp(bulkPrices[item.id]?.originalPrice ?? "")}
                                            onChange={(e) => setBulkPrices({
                                              ...bulkPrices,
                                              [item.id]: {
                                                ...bulkPrices[item.id] || { jastipPrice: item.jastipPrice ?? "" },
                                                originalPrice: parseRp(e.target.value)
                                              }
                                            })}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-sm font-black text-orange-600">
                                          {item.originalPrice
                                            ? `Rp${formatRp(item.originalPrice)}`
                                            : "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      {isBulkEditing ? (
                                        <div className="relative inline-block text-left">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">Rp</span>
                                          <input
                                            type="text"
                                            className="w-24 bg-emerald-50/50 border border-emerald-100 rounded-lg pl-6 pr-2 py-1.5 font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-100 text-right"
                                            value={formatRp(bulkPrices[item.id]?.jastipPrice ?? "")}
                                            onChange={(e) => setBulkPrices({
                                              ...bulkPrices,
                                              [item.id]: {
                                                ...bulkPrices[item.id] || { originalPrice: item.originalPrice ?? "" },
                                                jastipPrice: parseRp(e.target.value)
                                              }
                                            })}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-sm font-black text-emerald-600">
                                          {item.jastipPrice
                                            ? `Rp${formatRp(item.jastipPrice)}`
                                            : "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button
                                          onClick={() => {
                                            setEditing(item);
                                            setIsSimpleEdit(true);
                                            setForm({
                                              name: item.name,
                                              quantity: item.quantity,
                                              pic: item.pic,
                                              customer: item.customer,
                                              shippingDate: item.shippingDate,
                                              isDone: item.isDone,
                                              platform: item.platform || "",
                                              link: item.link || "",
                                              note: item.note || "",
                                              originalPrice: item.originalPrice ?? "",
                                              jastipPrice: item.jastipPrice ?? "",
                                            });
                                            setIsOpen(true);
                                          }}
                                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                        >
                                          <Edit3 size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(item.id)}
                                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </motion.section>
              ))}
            </div>
          )}
        </div>

        {/* --- FAB --- */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 h-14 w-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 flex items-center justify-center active:scale-95 transition-transform z-40"
        >
          <Plus size={28} strokeWidth={2.5} />
        </motion.button>


        {/* --- MODAL INPUT --- */}
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 sm:mt-0">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 w-full max-w-4xl h-[92dvh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden"
              >
                {/* 1. HEADER (Fixed) */}
                <div className="bg-white px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0 z-30">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                      {editing ? "Edit Pesanan" : "Input Pesanan"}
                    </h2>
                    <p className="text-xs font-medium text-slate-400">
                      {editing
                        ? "Perbarui data item ini"
                        : "Tambah item baru ke antrian"}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 2. TABS (Mobile Only - Fixed) */}
                {!editing && (
                  <div className="flex sm:hidden bg-white border-b border-slate-200 shrink-0 z-30">
                    <button
                      onClick={() => setActiveTab("input")}
                      className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === "input" ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50" : "text-slate-400"}`}
                    >
                      Formulir
                    </button>
                    <button
                      onClick={() => setActiveTab("draft")}
                      className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest relative transition-colors ${activeTab === "draft" ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50" : "text-slate-400"}`}
                    >
                      Antrian
                      {drafts.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] inline-block text-center">
                          {drafts.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* 3. CONTENT BODY (Scrollable Area) */}
                {/* min-h-0 sangat penting agar child scroll berfungsi didalam flex parent */}
                <div className="flex flex-1 min-h-0 flex-col sm:flex-row relative bg-slate-50">
                  {/* --- KIRI: FORM INPUT --- */}
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className={`flex-1 flex flex-col relative h-full ${editing ? "flex" : (activeTab === "draft" ? "hidden sm:flex" : "flex")}`}
                  >
                    {/* Scrollable Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32 sm:pb-28">
                      <div className="space-y-5">

                        {!isSimpleEdit && (
                          <>
                            {/* Input Nama (Primary) */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                  Nama Barang
                                </label>
                                <input
                                  ref={nameInputRef}
                                  autoFocus={!editing}
                                  className="w-full text-lg font-bold text-slate-800 placeholder:text-slate-300 border-b-2 border-slate-100 focus:border-orange-500 outline-none py-2 bg-transparent transition-colors"
                                  placeholder="Contoh: Coklat Royce..."
                                  value={form.name}
                                  onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center h-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                      Jumlah
                                    </label>
                                  </div>
                                  <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-100"
                                    placeholder="1"
                                    value={form.quantity}
                                    onChange={(e) =>
                                      setForm({ ...form, quantity: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center h-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                      Customer
                                    </label>
                                    <button
                                      onClick={handleAddNewCustomer}
                                      className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
                                    >
                                      <Plus size={10} strokeWidth={3} />
                                      BARU
                                    </button>
                                  </div>
                                  <SearchableSelect
                                    placeholder="Cari Customer..."
                                    value={form.customer}
                                    onChange={(val) => setForm({ ...form, customer: val })}
                                    options={customerOptions}
                                    buttonClassName="bg-slate-50 border-slate-200 font-bold focus:ring-orange-100"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Pricing Fields - Always if simpleEdit or usageType is pricing */}
                        {editing && (
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                            {isSimpleEdit && (
                              <div className="mb-4 pb-4 border-b border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Harga Untuk</p>
                                <p className="text-sm font-bold text-slate-800">{form.name}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest ml-1">
                                  Harga Asli
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                  <input
                                    type="text"
                                    className="w-full bg-orange-50/50 border border-orange-100 rounded-xl pl-8 pr-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-100 placeholder:text-orange-200"
                                    placeholder="0"
                                    value={formatRp(form.originalPrice)}
                                    onChange={(e) =>
                                      setForm({ ...form, originalPrice: parseRp(e.target.value) })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest ml-1">
                                  Harga Jastip
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                  <input
                                    type="text"
                                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl pl-8 pr-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-100 placeholder:text-emerald-200"
                                    placeholder="0"
                                    value={formatRp(form.jastipPrice)}
                                    onChange={(e) =>
                                      setForm({ ...form, jastipPrice: parseRp(e.target.value) })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isSimpleEdit && (
                          <>
                            {/* Input Detail (Secondary) */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center h-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                      Tanggal Pengiriman
                                    </label>
                                  </div>
                                  <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-100"
                                    value={form.shippingDate}
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        shippingDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center h-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                      PIC
                                    </label>
                                  </div>
                                  <div className="relative">
                                    <select
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-orange-100"
                                      value={form.pic}
                                      onChange={(e) =>
                                        setForm({ ...form, pic: e.target.value })
                                      }
                                    >
                                      <option value="">Pilih...</option>
                                      {PIC_OPTIONS.map((p) => (
                                        <option key={p} value={p}>
                                          {p}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      size={14}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                  Platform
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {PLATFORM_OPTIONS.map((p) => (
                                    <button
                                      key={p}
                                      onClick={() =>
                                        setForm({ ...form, platform: p })
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${form.platform === p ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"}`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>


                            <details className="group bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                              <summary className="list-none flex justify-between items-center cursor-pointer">
                                <span className="text-xs font-bold text-slate-500">
                                  Catatan & Link
                                </span>
                                <Plus
                                  size={16}
                                  className="text-slate-400 group-open:rotate-45 transition-transform"
                                />
                              </summary>
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                <input
                                  placeholder="Link Produk..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-100 placeholder:font-medium"
                                  value={form.link}
                                  onChange={(e) =>
                                    setForm({ ...form, link: e.target.value })
                                  }
                                />
                                <textarea
                                  placeholder="Catatan..."
                                  rows={2}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-100 resize-none placeholder:font-medium"
                                  value={form.note}
                                  onChange={(e) =>
                                    setForm({ ...form, note: e.target.value })
                                  }
                                />
                              </div>
                            </details>
                          </>
                        )}
                      </div>
                    </div>

                    {/* BUTTON ACTION (FIXED BOTTOM) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                      {editing ? (
                        <button
                          type="button"
                          onClick={handleSaveAll}
                          disabled={isProcessing}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white h-12 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                          {isProcessing ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Send size={20} />
                          )}
                          {isSimpleEdit ? "UPDATE HARGA" : "SIMPAN PERUBAHAN"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={addToDraft}
                          disabled={
                            !form.name ||
                            !form.pic ||
                            !form.shippingDate ||
                            !form.customer
                          }
                          className="w-full bg-slate-900 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-300 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                        >
                          <ListPlus size={18} />
                          <span className="text-sm tracking-wide">
                            TAMBAH KE ANTRIAN
                          </span>
                        </button>
                      )}
                    </div>
                  </form>

                  {/* --- KANAN: DRAFT LIST --- */}
                  <div
                    className={`flex-1 flex flex-col h-full bg-slate-100 sm:border-l border-slate-200 relative ${editing ? "hidden sm:flex" : (activeTab === "input" ? "hidden sm:flex" : "flex")}`}
                  >
                    {/* Header Draft */}
                    <div className="p-4 bg-white/50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {editing
                          ? "Preview"
                          : `Daftar Antrian (${drafts.length})`}
                      </span>
                      {!editing && drafts.length > 0 && (
                        <button
                          onClick={() => setDrafts([])}
                          className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                        >
                          HAPUS SEMUA
                        </button>
                      )}
                    </div>

                    {/* List Draft */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
                      {editing ? (
                        <div className="bg-white p-5 rounded-2xl border-2 border-orange-100 shadow-sm text-center">
                          <p className="text-xs font-bold text-orange-500 uppercase mb-2">
                            Sedang Mengedit
                          </p>
                          <h3 className="text-lg font-black text-slate-800">
                            {form.name || "..."}
                          </h3>
                        </div>
                      ) : drafts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40 mt-10 sm:mt-0">
                          <ClipboardList
                            size={40}
                            className="mb-2 text-slate-400"
                          />
                          <p className="text-xs font-bold text-slate-400 uppercase">
                            Belum ada antrian
                          </p>
                        </div>
                      ) : (
                        drafts.map((d, i) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={i}
                            className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 text-sm truncate">
                                {d.name}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                  {d.customer}
                                </span>
                                <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                  {d.quantity}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setDrafts(drafts.filter((_, idx) => idx !== i))
                              }
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* BUTTON SIMPAN (FIXED BOTTOM) - Only for Drafts Save */}
                    {!editing && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <button
                          onClick={handleSaveAll}
                          disabled={
                            isProcessing || drafts.length === 0
                          }
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white h-12 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                          {isProcessing ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Send size={20} />
                          )}
                          SIMPAN SEMUA ({drafts.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Split Share Modal */}
        <AnimatePresence>
          {shareModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShareModal(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100"
              >
                <div className="p-8">
                  {shareModal.type === 'selection' && (
                    <div className="space-y-4">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Share2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Pilih Target Share</h3>
                        <p className="text-slate-500 text-sm mt-1">Ingin membagikan rincian ke siapa?</p>
                      </div>
                      <button
                        onClick={() => setShareModal({ ...shareModal, type: 'admin' })}
                        className="w-full p-5 bg-orange-50 hover:bg-orange-100 border-2 border-orange-100 text-orange-700 rounded-2xl font-black text-left flex items-center gap-4 transition-all group"
                      >
                        <div className="p-3 bg-white rounded-xl shadow-sm text-orange-600 group-hover:scale-110 transition-transform">
                          <Users size={24} />
                        </div>
                        <div>
                          <p>Share Ke Admin</p>
                          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Berdasarkan PIC</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setShareModal({ ...shareModal, type: 'customer' })}
                        className="w-full p-5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-100 text-emerald-700 rounded-2xl font-black text-left flex items-center gap-4 transition-all group"
                      >
                        <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                          <User size={24} />
                        </div>
                        <div>
                          <p>Share Ke Customer</p>
                          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Personalized Report</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {shareModal.type === 'admin' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setShareModal({ type: 'selection' })} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                          <ChevronLeft size={20} className="text-slate-400" />
                        </button>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Pilih PIC</h3>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto pr-2 no-scrollbar space-y-3">
                        {Array.from(new Set(items.map(i => i.pic || "Tanpa PIC"))).sort().map(pic => (
                          <div key={pic} className="p-3 border border-slate-100 rounded-2xl space-y-2">
                            <span className="font-bold text-slate-700 text-sm ps-1 flex items-center gap-2">
                              <User size={14} className="text-slate-400" /> {pic}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(new Set(items.filter(i => i.pic === pic).map(i => i.shippingDate))).sort().map(date => (
                                <button
                                  key={date}
                                  onClick={() => handleShareToAdmin(pic, date)}
                                  className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-[9px] font-black hover:bg-orange-700 transition-colors shadow-sm"
                                >
                                  {formatDateDayMonth(date)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {shareModal.type === 'customer' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setShareModal({ type: 'selection' })} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                          <ChevronLeft size={20} className="text-slate-400" />
                        </button>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Pilih Customer</h3>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto pr-2 no-scrollbar space-y-3">
                        {Array.from(new Set(items.map(i => i.customer || "Tanpa Customer"))).sort().map(cust => (
                          <div key={cust} className="p-3 border border-slate-100 rounded-2xl space-y-2">
                            <span className="font-bold text-slate-700 text-sm ps-1 flex items-center gap-2">
                              <User size={14} className="text-slate-400" /> {cust}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(new Set(items.filter(i => i.customer === cust).map(i => i.shippingDate))).sort().map(date => (
                                <button
                                  key={date}
                                  onClick={() => handleShareToCustomer(cust, date)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  {formatDateDayMonth(date)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      {/* Lightbox Preview */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-10"
          >
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors z-[110]"
            >
              <X size={24} />
            </motion.button>

            {/* Navigation Buttons */}
            {datePhotos[`${selectedPhoto.date}_${selectedPhoto.customer}`]?.length > 1 && (
              <>
                <motion.button
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[110] backdrop-blur-md border border-white/10"
                >
                  <ChevronLeft size={32} />
                </motion.button>
                <motion.button
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[110] backdrop-blur-md border border-white/10"
                >
                  <ChevronRight size={32} />
                </motion.button>
              </>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-full flex flex-col gap-4"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedPhoto.url}
                    src={selectedPhoto.url}
                    alt="Preview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 100) navigateLightbox('prev');
                      else if (info.offset.x < -100) navigateLightbox('next');
                    }}
                    className="w-full h-auto max-h-[75vh] object-contain rounded-[2rem] cursor-grab active:cursor-grabbing"
                  />
                </AnimatePresence>

                {/* Image Index Indicator */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                  <span className="text-white/90 text-xs font-black tracking-widest uppercase">
                    FOTO {(datePhotos[`${selectedPhoto.date}_${selectedPhoto.customer}`]?.indexOf(selectedPhoto.url) || 0) + 1} DARI {datePhotos[`${selectedPhoto.date}_${selectedPhoto.customer}`]?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg tracking-tight uppercase">
                      {selectedPhoto.customer}
                    </p>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-0.5">
                      Shipping: {formatAndAddYear(selectedPhoto.date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={selectedPhoto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-black hover:bg-slate-50 transition-colors shadow-lg"
                  >
                    <ExternalLink size={16} /> BUKA TAB BARU
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRefForDate}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (activeUploadDate) {
            handlePhotoUploadForDate(e, activeUploadDate.date, activeUploadDate.customer);
          }
        }}
      />
    </div>
  );
}
