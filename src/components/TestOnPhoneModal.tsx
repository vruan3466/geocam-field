import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  QrCode,
  Share2,
} from 'lucide-react';

interface TestOnPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestOnPhoneModal: React.FC<TestOnPhoneModalProps> = ({ isOpen, onClose }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'android' | 'ios'>('qr');

  // Determine URL to open: prefer production/shared URL if available or current window origin
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.href.split('?')[0]
      : 'https://ais-pre-pw3llobph2cfu4pv6vph3u-550566891823.us-west2.run.app';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(appUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0284c7', // sky-600
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Como Testar no Celular</h2>
              <p className="text-xs text-slate-400">Android & iPhone (iOS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'qr'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'android'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passo a Passo Android
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'ios'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passo a Passo iPhone
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-3">
              <p className="text-slate-300 text-xs">
                Aponte a <strong>câmera do seu celular</strong> para o QR Code abaixo para abrir o app diretamente:
              </p>

              {/* QR Code Card */}
              <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code do App"
                    className="w-56 h-56 rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 animate-pulse text-sky-500" />
                  </div>
                )}
              </div>

              {/* Link copy box */}
              <div className="w-full space-y-1.5 text-left">
                <span className="text-[11px] text-slate-400">Ou copie o link direto:</span>
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="flex-1 bg-transparent text-[11px] font-mono text-slate-300 px-2 outline-none select-all truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 text-xs transition active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  1. Abra no Google Chrome
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Abra o link no navegador <strong>Google Chrome</strong> do seu Android (você pode escanear o QR Code ou enviar o link pelo WhatsApp).
                </p>
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  2. Permita Câmera e GPS
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  O navegador exibirá uma caixa pedindo permissão para acessar a <strong>Câmera</strong> e sua <strong>Localização</strong>. Toque em <strong>Permitir</strong> para que a conversão UTM, GMS e altimetria funcionem em tempo real no campo.
                </p>
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  3. Instalar como Aplicativo (Opcional, Recomendado)
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>. O app abrirá em tela cheia como se fosse um app da Play Store!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  1. Abra no Safari do iPhone
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  No iPhone, certifique-se de abrir o link no <strong>Safari</strong> (se abrir pelo WhatsApp ou outro app, toque no ícone da bússola no canto inferior para abrir no Safari).
                </p>
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  2. Permita Acesso à Câmera e Localização
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Toque em <strong>Permitir</strong> quando o iOS solicitar acesso à câmera e à localização precisa.
                </p>
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  3. Adicionar à Tela de Início (App Sem Barras)
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  1. Na barra inferior do Safari, toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta para cima).<br />
                  2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.<br />
                  3. Toque em <strong>"Adicionar"</strong> no canto superior. O app ficará na sua tela inicial com ícone próprio e sem as barras do Safari!
                </p>
              </div>
            </div>
          )}

          {/* Tips banner */}
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-slate-400 space-y-1">
            <span className="text-sky-300 font-semibold block flex items-center gap-1">
              💡 Dica de Campo:
            </span>
            <p>
              O aplicativo funciona <strong>100% offline</strong> após o primeiro carregamento. Você pode tirar fotos em áreas rurais ou sem sinal de celular, e todas as fotos ficam salvas com segurança no armazenamento interno do seu aparelho.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 transition text-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
