import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            if (!r) return;
            // Cek update berkala setiap 20 detik
            setInterval(() => r.update(), 20 * 1000);

            // Cek update instan saat user membuka/beralih kembali ke aplikasi di Android (focus & visibility change)
            const handleFocusOrVisible = () => {
                if (document.visibilityState === 'visible') {
                    r.update();
                }
            };
            window.addEventListener('focus', handleFocusOrVisible);
            document.addEventListener('visibilitychange', handleFocusOrVisible);
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    // Otomatis refresh service worker saat versi baru terdeteksi
    useEffect(() => {
        if (needRefresh) {
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker]);

    if (!needRefresh) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100 dark:bg-neutral-900 dark:border-neutral-800">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center rounded-2xl mb-5 shadow-inner">
                    <RefreshCw size={28} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-800 dark:text-neutral-100 mb-2">Memperbarui Aplikasi... 🚀</h3>
                <p className="text-slate-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                    Sedang menerapkan versi terbaru agar aplikasi selalu sinkron.
                </p>
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none active:scale-95 transition-all outline-none"
                >
                    Muat Ulang
                </button>
            </div>
        </div>
    );
}
