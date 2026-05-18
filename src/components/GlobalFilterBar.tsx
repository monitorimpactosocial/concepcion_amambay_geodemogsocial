import {
  Calendar,
  Factory,
  Filter,
  MapPinned,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import type {
  DepartmentCode,
  DistrictOption,
  ImpactScenarioKey,
  ProjectionScenarioKey,
} from '../types';

interface GlobalFilterBarProps {
  activeDepartment: DepartmentCode;
  onDepartmentChange: (value: DepartmentCode) => void;
  selectedDistrictKey: string | null;
  onDistrictChange: (value: string | null) => void;
  districtOptions: DistrictOption[];
  projectionScenario: ProjectionScenarioKey;
  onProjectionScenarioChange: (value: ProjectionScenarioKey) => void;
  impactScenario: ImpactScenarioKey;
  onImpactScenarioChange: (value: ImpactScenarioKey) => void;
  horizonYear: number;
  onHorizonYearChange: (value: number) => void;
}

const projectionLabels: Record<ProjectionScenarioKey, string> = {
  optimista: 'Optimista',
  medio: 'Medio',
  pesimista: 'Pesimista',
};

const impactLabels: Record<ImpactScenarioKey, string> = {
  conservador: 'Conservador',
  medio: 'Medio',
  transformador: 'Transformador',
};

export default function GlobalFilterBar({
  activeDepartment,
  onDepartmentChange,
  selectedDistrictKey,
  onDistrictChange,
  districtOptions,
  projectionScenario,
  onProjectionScenarioChange,
  impactScenario,
  onImpactScenarioChange,
  horizonYear,
  onHorizonYearChange,
}: GlobalFilterBarProps) {
  const filteredDistricts = activeDepartment
    ? districtOptions.filter((d) => d.departmentCode === activeDepartment)
    : districtOptions;

  const reset = () => {
    onDepartmentChange(null);
    onDistrictChange(null);
    onProjectionScenarioChange('medio');
    onImpactScenarioChange('medio');
    onHorizonYearChange(2042);
  };

  return (
    <div className="global-filter-bar print-hide">
      <div className="global-filter-title">
        <Filter size={16} />
        <span>Filtros globales</span>
      </div>

      <div className="global-filter-group segmented" aria-label="Departamento">
        {[
          { label: 'Ambos', value: null },
          { label: 'Concepción', value: '01' as const },
          { label: 'Amambay', value: '13' as const },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={activeDepartment === item.value ? 'active' : ''}
            onClick={() => onDepartmentChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="global-filter-field">
        <MapPinned size={15} />
        <select
          value={selectedDistrictKey ?? ''}
          onChange={(e) => onDistrictChange(e.target.value || null)}
        >
          <option value="">Todos los distritos</option>
          {filteredDistricts.map((d) => (
            <option key={d.key} value={d.key}>
              {d.districtName}, {d.departmentName}
            </option>
          ))}
        </select>
      </label>

      <label className="global-filter-field compact">
        <TrendingUp size={15} />
        <select
          value={projectionScenario}
          onChange={(e) => onProjectionScenarioChange(e.target.value as ProjectionScenarioKey)}
        >
          {(Object.keys(projectionLabels) as ProjectionScenarioKey[]).map((key) => (
            <option key={key} value={key}>{projectionLabels[key]}</option>
          ))}
        </select>
      </label>

      <label className="global-filter-field compact">
        <Factory size={15} />
        <select
          value={impactScenario}
          onChange={(e) => onImpactScenarioChange(e.target.value as ImpactScenarioKey)}
        >
          {(Object.keys(impactLabels) as ImpactScenarioKey[]).map((key) => (
            <option key={key} value={key}>{impactLabels[key]}</option>
          ))}
        </select>
      </label>

      <label className="global-filter-field year-field">
        <Calendar size={15} />
        <input
          type="range"
          min={2027}
          max={2052}
          step={5}
          value={horizonYear}
          onChange={(e) => onHorizonYearChange(Number(e.target.value))}
        />
        <strong>{horizonYear}</strong>
      </label>

      <button className="global-reset" type="button" onClick={reset} title="Restablecer filtros">
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
