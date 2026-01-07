import React, { useState, useEffect } from 'react';
import {
    DownloadIcon,
    ShareIcon,
    PlusSquareIcon,
    XIcon,
    SmartphoneIcon,
    ChevronRightIcon
} from './Icons';

const PWAInstallOverlay: React.FC = () => {
    const [show, setShow] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check for debug flag in URL
        const params = new URLSearchParams(window.location.search);
        const forceShow = params.get('debug_install') === 'true';

        // 1. Detect if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone && !forceShow) return;

        // 2. Detect Platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS detection
        const isAndroid = /android/.test(userAgent);

        if (isIos) setPlatform('ios');
        else if (isAndroid) setPlatform('android');

        // 3. Show on mobile or if forced
        if (isIos || isAndroid || forceShow) {
            if (forceShow && !isIos && !isAndroid) setPlatform('ios'); // Default to iOS visual for desktop debug

            const timer = setTimeout(() => {
                setShow(true);
                console.log("PWA Overlay: Active on platform", isIos ? 'ios' : (isAndroid ? 'android' : 'forced'));
            }, forceShow ? 100 : 1500);
            return () => clearTimeout(timer);
        }

        // 4. Android specific prompt capture
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleAndroidInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShow(false);
        }
        setDeferredPrompt(null);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden transform transition-all animate-slide-up border border-white/20">
                {/* Close button - discreet */}
                <button
                    onClick={() => setShow(false)}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="p-8 pt-10">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl shadow-xl relative">
                                <SmartphoneIcon className="w-10 h-10 text-white" />
                                <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-lg">
                                    <DownloadIcon className="w-4 h-4 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                            Instale o App do Condomínio
                        </h2>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Tenha acesso rápido, receba notificações de encomendas e participe de votações direto da sua tela inicial.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {platform === 'ios' ? (
                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                                <p className="text-sm font-bold text-gray-700 mb-4 text-center">
                                    Siga estes 2 passos no Safari:
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                                        <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                                            Toque no botão de <strong>Compartilhar</strong> <ShareIcon className="w-4 h-4 text-blue-500" />
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                                        <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                                            Role e toque em <strong>Tela de Início</strong> <PlusSquareIcon className="w-4 h-4 text-gray-700" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleAndroidInstall}
                                className="w-full group relative flex items-center justify-between bg-indigo-600 text-white p-5 rounded-3xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <DownloadIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-lg">Instalar Agora</span>
                                </div>
                                <ChevronRightIcon className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                            </button>
                        )}

                        <button
                            onClick={() => setShow(false)}
                            className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                        >
                            Continuar pelo navegador
                        </button>
                    </div>
                </div>

                <div className="bg-indigo-50/50 p-4 border-t border-indigo-50">
                    <p className="text-[10px] text-center font-bold text-indigo-400 uppercase tracking-widest">
                        Experiência otimizada para moradores
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallOverlay;
