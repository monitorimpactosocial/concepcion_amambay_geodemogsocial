import { useState, useEffect, useMemo } from 'react';
import { Download, Calculator, X, Settings2, Sparkles, MapPin } from 'lucide-react';
import type { DepartmentCode } from '../types';

interface UPM {
  id: string;
  tipo: string;
  dpto: string;
  dist: string;
  barrio: string;
  manzana: string;
  hogares: number;
  lng: number;
  lat: number;
}

interface SamplingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSampleGenerated: (sample: UPM[]) => void;
  activeDepartment: DepartmentCode; // Contexto para pre-seleccionar
}

const Z_SCORES: Record<string, number> = {
  '90': 1.645,
  '95': 1.96,
  '99': 2.576
};

export default function SamplingPanel({ isOpen, onClose, onSampleGenerated, activeDepartment }: SamplingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UPM[]>([]);
  
  // Params
  const [targetDpto, setTargetDpto] = useState<string>(activeDepartment || 'AMBOS');
  const [confLevel, setConfLevel] = useState<string>('95');
  const [errorMargin, setErrorMargin] = useState<number>(5);
  const [clusterSize, setClusterSize] = useState<number>(10);
  const [stratify, setStratify] = useState(true);

  const [results, setResults] = useState<{
    nTotal: number;
    sampleSize: number;
    nUpms: number;
    selectedList: UPM[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen && data.length === 0) return;
    if (data.length === 0) {
      fetch('data/marco_muestral_viviendas.json')
        .then(r => r.json())
        .then(d => {
          if (d && d.data) setData(d.data);
        })
        .catch(e => console.error("Error loading frame", e));
    }
  }, [isOpen, data.length]);

  useEffect(() => {
    if (activeDepartment && targetDpto !== activeDepartment) {
      setTargetDpto(activeDepartment);
    }
  }, [activeDepartment]);

  const frameData = useMemo(() => {
    if (targetDpto === 'AMBOS') return data;
    const dptoName = targetDpto === '01' ? 'CONCEPCION' : 'AMAMBAY';
    // The field in UPM uses normalized names (e.g. CONCEPCION without accent)
    return data.filter(u => String(u.dpto).includes(dptoName));
  }, [data, targetDpto]);

  const totalHogares = useMemo(() => frameData.reduce((acc, u) => acc + u.hogares, 0), [frameData]);

  const handleGenerate = () => {
    if (!frameData.length) return;
    setLoading(true);
    
    setTimeout(() => {
      // 1. Calculate statistical n
      const Z = Z_SCORES[confLevel] || 1.96;
      const p = 0.5;
      const e = errorMargin / 100;
      
      const n0 = (Math.pow(Z, 2) * p * (1 - p)) / Math.pow(e, 2);
      let n = Math.ceil(n0 / (1 + ((n0 - 1) / totalHogares)));
      
      // Design effect adjustment (Deff) for cluster sampling is usually 1.5 - 2.0
      // We apply a moderate Deff of 1.5 for being super sophisticated
      const deff = 1.35; 
      n = Math.ceil(n * deff);
      
      // Protect bounds
      if (n > totalHogares) n = totalHogares;
      
      // 2. Identify UPM quantity
      const cSize = Math.max(1, clusterSize);
      let numUpms = Math.ceil(n / cSize);
      
      // 3. PPS Sampling Logic
      const selected: UPM[] = [];
      const strata = stratify ? ['regular', 'indigena'] : ['all'];
      
      for (const st of strata) {
        let stratumFrame = frameData;
        if (stratify) {
            stratumFrame = frameData.filter(u => u.tipo === st);
        }
        if (!stratumFrame.length) continue;
        
        const N_st = stratumFrame.reduce((acc, u) => acc + u.hogares, 0);
        if (N_st === 0) continue;
        
        let n_st_upm = Math.round(numUpms * (N_st / totalHogares));
        if (n_st_upm < 1 && N_st > 0) n_st_upm = 1; // force at least 1 if pop exists
        
        // Interval
        const interval = N_st / n_st_upm;
        const start = Math.random() * interval;
        
        let cumulative = 0;
        let ppsTargets = Array.from({length: n_st_upm}, (_, i) => start + i * interval);
        
        // Sort by geographic implicit sorting (District) to ensure implicit stratification
        stratumFrame.sort((a,b) => String(a.dist).localeCompare(String(b.dist)));
        
        let targetIdx = 0;
        for (const upm of stratumFrame) {
            cumulative += upm.hogares;
            while (targetIdx < ppsTargets.length && cumulative >= ppsTargets[targetIdx]) {
                selected.push({...upm}); // Copy
                targetIdx++;
            }
        }
      }
      
      const res = {
        nTotal: totalHogares,
        sampleSize: n,
        nUpms: selected.length,
        selectedList: selected
      };
      
      setResults(res);
      onSampleGenerated(selected);
      setLoading(false);
    }, 300);
  };

  const downloadCSV = () => {
    if (!results || !results.selectedList.length) return;
    
    const headers = ['ID_UPM', 'TIPO', 'DEPARTAMENTO', 'DISTRITO', 'BARRIO_COMUNIDAD', 'MANZANA', 'HOGARES', 'LAT', 'LNG'];
    const rows = results.selectedList.map(u => 
      [u.id, u.tipo, u.dpto, u.dist, u.barrio, u.manzana, u.hogares, u.lat, u.lng].join(',')
    );
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + '\n' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Muestra_Viviendas_${targetDpto}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="sampling-modal-overlay">
      <div className="sampling-modal dark-theme">
        <div className="sm-header">
          <div className="sm-title">
            <Sparkles className="icon-accent" size={20} />
            <h2>Generador de Muestras (PPS)</h2>
          </div>
          <button className="sm-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="sm-body">
          <div className="sm-panel configuration">
            <div className="sm-section-title"><Settings2 size={16}/> Configuración Estadística</div>
            
            <div className="sm-field">
              <label>Población Objetivo (Dpto)</label>
              <select value={targetDpto} onChange={e => setTargetDpto(e.target.value)}>
                <option value="AMBOS">Concepción y Amambay</option>
                <option value="01">Concepción (01)</option>
                <option value="13">Amambay (13)</option>
              </select>
              <div className="sm-hint">Universo: {totalHogares.toLocaleString('es-PY')} hogares detectados en {frameData.length} UPMs.</div>
            </div>

            <div className="sm-field-group">
              <div className="sm-field">
                <label>Nivel de Confianza</label>
                <select value={confLevel} onChange={e => setConfLevel(e.target.value)}>
                  <option value="90">90%</option>
                  <option value="95">95% (Estándar)</option>
                  <option value="99">99%</option>
                </select>
              </div>
              <div className="sm-field">
                <label>Margen de Error (%)</label>
                <input type="number" min="1" max="15" value={errorMargin} onChange={e => setErrorMargin(Number(e.target.value))} />
              </div>
            </div>

            <div className="sm-field">
              <label>Tamaño objetivo del Clúster (UPM)</label>
              <input type="number" min="3" max="50" value={clusterSize} onChange={e => setClusterSize(Number(e.target.value))} />
              <div className="sm-hint">Cantidad de viviendas a entrevistar por manzana/comunidad.</div>
            </div>

            <div className="sm-field toggle">
              <label>
                <input type="checkbox" checked={stratify} onChange={e => setStratify(e.target.checked)} />
                Estratificación Explícita (Regular / Indígena)
              </label>
            </div>

            <button className="primary-button generate-btn" onClick={handleGenerate} disabled={loading || totalHogares === 0}>
              {loading ? 'Calculando...' : <><Calculator size={18} /> Generar Diseño Muestral</>}
            </button>
          </div>

          <div className="sm-panel results">
            {!results ? (
              <div className="sm-empty-state">
                <MapPin size={32} />
                <p>Configure los parámetros e inicie la generación.</p>
              </div>
            ) : (
              <div className="sm-results-content fade-in">
                <div className="sm-section-title text-success">Diseño Exitoso</div>
                
                <div className="sm-stats-grid">
                  <div className="sm-stat">
                    <span>Tamaño (n)</span>
                    <strong>{results.sampleSize.toLocaleString('es-PY')}</strong>
                  </div>
                  <div className="sm-stat">
                    <span>UPMs Extraídas</span>
                    <strong>{results.nUpms.toLocaleString('es-PY')}</strong>
                  </div>
                  <div className="sm-stat">
                    <span>Universo (N)</span>
                    <strong>{results.nTotal.toLocaleString('es-PY')}</strong>
                  </div>
                </div>

                <div className="sm-table-container">
                  <table className="sm-table">
                    <thead>
                      <tr><th>Tipo</th><th>Distrito</th><th>Barrio/Comunidad</th><th>Manz</th><th>Hogares</th></tr>
                    </thead>
                    <tbody>
                      {results.selectedList.slice(0, 15).map((u, i) => (
                        <tr key={i}>
                          <td>{u.tipo === 'indigena' ? 'Indígena' : 'Regular'}</td>
                          <td>{u.dist}</td>
                          <td>{u.barrio}</td>
                          <td>{u.manzana}</td>
                          <td>{u.hogares}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.selectedList.length > 15 && <div className="sm-table-footer">...y {results.selectedList.length - 15} UPMs más.</div>}
                </div>

                <button className="secondary-button w-full mt-4" onClick={downloadCSV}>
                  <Download size={16} /> Descargar Archivo Master (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
