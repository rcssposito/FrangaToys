'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

function BeaconLogic() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const startTimeRef = useRef<number>(Date.now());
    const lastSentPathRef = useRef<string>('');
    const lastSentTimeRef = useRef<number>(0);

    useEffect(() => {
        // Ignora rotas do painel administrativo e APIs
        if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
            return;
        }

        const now = Date.now();
        // Evita double-firing do React StrictMode no mesmo segundo
        if (lastSentPathRef.current === pathname && (now - lastSentTimeRef.current) < 2000) {
            return;
        }

        lastSentPathRef.current = pathname;
        lastSentTimeRef.current = now;
        startTimeRef.current = now;

        // 1. Obter ou gerar Visitor ID anônimo persistente
        let visitorId = '';
        try {
            visitorId = localStorage.getItem('franga_visitor_id') || '';
            if (!visitorId) {
                visitorId = 'vis_' + Math.random().toString(36).substring(2, 10);
                localStorage.setItem('franga_visitor_id', visitorId);
            }
        } catch {
            visitorId = 'vis_' + Math.random().toString(36).substring(2, 8);
        }

        // 2. Identificação do Cliente (via query param na URL ou persistência anterior)
        const crmFromUrl = searchParams.get('crm_c') || searchParams.get('c_ref') || searchParams.get('cliente_id');
        let clienteId = crmFromUrl || '';

        try {
            if (crmFromUrl) {
                localStorage.setItem('franga_cliente_id', crmFromUrl);
            } else {
                clienteId = localStorage.getItem('franga_cliente_id') || '';
            }
        } catch {
            // Silencioso
        }

        // 3. Capturar parâmetros de campanha
        const utm_source = searchParams.get('utm_source') || '';
        const utm_medium = searchParams.get('utm_medium') || '';
        const utm_campaign = searchParams.get('utm_campaign') || '';
        const cadenciaId = searchParams.get('crm_cadencia') || searchParams.get('cadencia_id') || (utm_source === 'crm_cadencia' ? utm_campaign : null);

        // 4. Capturar cupom promocional da URL (?cupom=XYZ ou ?c=XYZ)
        const cupomFromUrl = searchParams.get('cupom') || searchParams.get('c');
        if (cupomFromUrl) {
            const upperCupom = cupomFromUrl.trim().toUpperCase();
            try {
                const prev = localStorage.getItem('franga_cupom_pendente');
                if (prev !== upperCupom) {
                    localStorage.setItem('franga_cupom_pendente', upperCupom);
                    toast.success(`🎁 Cupom ${upperCupom} ativado! Desconto garantido na sua compra.`, {
                        duration: 6000
                    });
                }
            } catch {
                // Silencioso
            }
        }

        // Se estiver em página de figura (ex: /figura/123)
        const figuraMatch = pathname.match(/\/figura\/([0-9]+)/);
        const figuraId = figuraMatch ? Number(figuraMatch[1]) : null;

        const basePayload = {
            visitorId,
            clienteId: clienteId || null,
            pathname,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            utm_source,
            utm_medium,
            utm_campaign,
            cadenciaId,
            figuraId,
            duracaoSegundos: 0,
            metadados: cupomFromUrl ? { cupom: cupomFromUrl.trim().toUpperCase() } : {}
        };

        const sendBeacon = (data: any) => {
            const bodyStr = JSON.stringify(data);
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                const blob = new Blob([bodyStr], { type: 'application/json' });
                const success = navigator.sendBeacon('/api/analytics/beacon', blob);
                if (success) return;
            }

            fetch('/api/analytics/beacon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: bodyStr,
                keepalive: true
            }).catch(() => {});
        };

        // Enviar beacon de entrada / transição de rota
        sendBeacon(basePayload);

        // Ao sair ou trocar de página, enviar beacon com duração acumulada
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const duracao = Math.round((Date.now() - startTimeRef.current) / 1000);
                if (duracao >= 3) {
                    sendBeacon({
                        ...basePayload,
                        duracaoSegundos: duracao
                    });
                }
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handleVisibilityChange);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handleVisibilityChange);
        };
    }, [pathname, searchParams]);

    return null;
}

export default function AccessBeacon() {
    return (
        <Suspense fallback={null}>
            <BeaconLogic />
        </Suspense>
    );
}
