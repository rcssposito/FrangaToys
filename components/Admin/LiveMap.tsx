'use client';

import React, { useState } from 'react';
import { MapBrazil } from 'react-brazil-map';

const LiveMap = ({ analyticsData }: { analyticsData: any[] }) => {
  const [hoveredState, setHoveredState] = useState<any>(null);
  const [simulationData, setSimulationData] = useState<any[] | null>(null);

  const activeData = simulationData || analyticsData;
  const maxVisits = Math.max(...activeData.map(d => d.value), 1);

  const getHeatColor = (value: number) => {
    if (value === 0) return '#27272a'; // Zinc-800
    const ratio = value / maxVisits;
    if (ratio > 0.8) return '#f97316'; // Laranja Vivo
    if (ratio > 0.4) return '#fb923c'; // Laranja Médio
    return '#fdba74'; // Laranja Suave
  };

  const simulateTraffic = () => {
    if (simulationData) {
      setSimulationData(null);
      return;
    }
    const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const mock = states.map(s => ({
      name: s,
      value: Math.floor(Math.random() * (s === 'SP' || s === 'RJ' ? 500 : 100))
    }));
    setSimulationData(mock);
  };

  return (
    <div id="brazil-map-interactive-container" className="relative w-full h-[750px] flex items-center justify-center bg-gradient-to-br from-[#09090b] to-[#020202] rounded-[3rem] border border-white/5 overflow-hidden p-12 group shadow-2xl">

      {/* Botão de Simulação */}
      <button
        onClick={simulateTraffic}
        className="absolute top-10 right-10 z-30 px-4 py-2 bg-white/5 hover:bg-orange-500 hover:text-black border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
      >
        {simulationData ? 'Resetar Dados' : 'Simular Tráfego Live'}
      </button>

      {/* Backdrop invisível para fechar seleção ao clicar no vazio */}
      <div
        className="absolute inset-0 z-0 cursor-default"
        onClick={() => {
          setHoveredState(null);
          if (simulationData) setSimulationData(null);
        }}
      />

      <div className="w-full h-full flex items-center justify-center scale-[1.0] transition-transform duration-700 z-10 pointer-events-none">
        <div className="pointer-events-auto filter drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <MapBrazil
            width={650}
            height={650}
            fill="#27272a"
            colorStroke="rgba(255,255,255,0.15)"
            onChange={(stateAcronym: string) => {
              const data = activeData.find(d => d.name === stateAcronym);
              setHoveredState({ id: stateAcronym, name: stateAcronym, value: data?.value || 0 });
            }}
          />
        </div>
      </div>

      {/* Injeção de Visual Premium Matte Dark */}
      <style jsx global>{`
        /* 1. ESTILO BASE */
        #brazil-map-interactive-container svg path { 
            fill: #27272a !important; 
            stroke: rgba(255,255,255,0.12) !important; 
            stroke-width: 1px !important; 
            transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer !important;
        }

        /* 2. ESCALA DE CALOR */
        ${activeData.map(loc => {
        const value = loc.value || 0;
        const color = getHeatColor(value);
        return `
            #brazil-map-interactive-container svg a[id*="${loc.name}"] path { 
              fill: ${color} !important; 
              ${value > 0 ? 'filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.3));' : ''}
            }
          `;
      }).join('')}
        
        /* 3. SELEÇÃO DE ESTADO */
        ${hoveredState ? `
          #brazil-map-interactive-container svg a[id*="${hoveredState.id}"] path {
            fill: #f97316 !important;
            stroke: #ffffff !important;
            stroke-width: 2.5px !important;
            filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.6));
          }
          #brazil-map-interactive-container svg a[id*="${hoveredState.id}"] text {
            fill: #000000 !important;
            text-shadow: none !important;
          }
        ` : ''}

        /* 4. LEGENDA DINÂMICA */
        #brazil-map-interactive-container text {
          font-size: 11px !important;
          font-weight: 900 !important;
          fill: #ffffff !important; 
          pointer-events: none !important;
          text-transform: uppercase;
          text-shadow: 0 1px 10px rgba(0,0,0,1);
          letter-spacing: 0.5px;
          transition: all 300ms ease;
        }

        /* 5. LIMPEZA */
        #brazil-map-interactive-container circle, 
        #brazil-map-interactive-container ellipse, 
        #brazil-map-interactive-container line { 
          display: none !important;
        }
      `}</style>

      {/* Tag de Monitoramento */}
      <div className="absolute top-10 left-10 pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-black/50 px-5 py-2.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            {simulationData ? 'Simulation Mode Active' : 'Geo-Intelligence Active'}
          </span>
        </div>
      </div>

      {/* PAINEL LATERAL DE INSIGHT */}
      {hoveredState && (
        <div className="absolute bottom-6 right-6 bg-[#111113]/90 border border-white/10 p-4 rounded-[1.25rem] shadow-2xl animate-in slide-in-from-right-5 duration-500 z-50 flex flex-col items-center backdrop-blur-xl">
          <div className="flex flex-col items-center gap-0">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Estado</span>
            <h4 className="text-2xl font-black text-white tracking-tighter leading-none">{hoveredState.id}</h4>
          </div>

          <div className="w-8 h-px bg-white/5 my-3" />

          <div className="flex flex-col items-center gap-0">
            <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest">Acessos</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white leading-none">{hoveredState.value}</span>
              <span className="text-[8px] font-bold text-zinc-600">visitas</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setHoveredState(null);
            }}
            className="mt-4 px-6 py-2 bg-white/5 hover:bg-orange-500 hover:text-black rounded-lg text-[7px] font-black uppercase tracking-widest transition-all duration-300 border border-white/5"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
