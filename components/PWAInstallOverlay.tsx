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

                <div className="p-6 pt-8">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute -inset-6 bg-indigo-500/10 rounded-full blur-2xl animate-pulse"></div>
                            <div className="bg-white p-2 rounded-[2rem] shadow-xl relative border border-gray-100">
                                <img
                                    src="/condo-logo-new.png"
                                    alt="Logo Condomínio"
                                    className="w-24 h-24 object-contain"
                                />
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-2xl shadow-lg border-2 border-white">
                                    <DownloadIcon className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                            Instale o App do Condomínio
                        </h2>
                        <p className="text-sm text-gray-500 font-medium leading-tight px-2">
                            Tenha acesso mais rápido, receba avisos importantes e participe de votações direto da sua tela inicial.
                        </p>
                    </div>

                    <div className="mt-6 space-y-3">
                        {platform === 'ios' ? (
                            <div className="bg-gray-50 rounded-[2rem] p-5 border border-gray-100 shadow-inner">
                                <p className="text-[11px] font-black text-indigo-500 mb-4 text-center uppercase tracking-widest bg-white/50 py-1.5 rounded-full border border-indigo-100/50">
                                    Passo a passo no seu celular 🧭
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mt-0.5 shadow-md">1</div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-900 font-extrabold">Abrir o Menu</p>
                                            <p className="text-[10px] text-gray-500 leading-tight">No <strong>Chrome</strong>, toque nos <strong>3 pontinhos</strong>. No <strong>Safari</strong>, toque na <strong>setinha</strong> <ShareIcon className="w-3 h-3 inline text-blue-500" />.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mt-0.5 shadow-md">2</div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-900 font-extrabold">Compartilhar e Mais</p>
                                            <p className="text-[10px] text-gray-500 leading-tight">Clique em <strong>Compartilhar</strong>, role até o fim e se necessário clique em <strong>'Mais...'</strong>.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mt-0.5 shadow-md">3</div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-gray-900 font-extrabold">Adicionar à Tela de Início</p>
                                            <p className="text-[10px] text-gray-500 leading-tight">Toque em <strong>Adicionar à Tela de Início</strong> <PlusSquareIcon className="w-3 h-3 inline text-gray-700" /> e confirme clicando em 'Adicionar'.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleAndroidInstall}
                                className="w-full group relative flex items-center justify-between bg-indigo-600 text-white p-4 rounded-3xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 overflow-hidden"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <DownloadIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-base">Instalar Agora</span>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                            </button>
                        )}

                        <button
                            onClick={() => setShow(false)}
                            className="w-full py-2 text-[11px] font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.2em]"
                        >
                            Continuar pelo navegador
                        </button>
                    </div>
                </div>

                <div className="bg-indigo-50/30 p-3 border-t border-indigo-50 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                        Experiência Porto Seguro Residencial
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallOverlay;
