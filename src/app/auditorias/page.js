'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { getFrentesTrabajo, getDatosAuditoria } from '@/lib/supabase/auditoria';
import {
  calcularCumplimientoEmpleado,
  calcularCumplimientoMaquinaria,
  calcularCumplimientoGlobal,
  getRangoCumplimiento,
  CATEGORIAS_AUDITORIA,
  CATEGORIAS_ORDER,
} from '@/lib/utils/auditoria';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Building2,
  Users,
  Wrench,
  FileText,
  ShieldCheck,
  GraduationCap,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

// ─── ÍCONOS POR CATEGORÍA ────────────────────────────────────
const CAT_ICONS = {
  empleados_documentacion: FileText,
  empleados_seguridad_social: ShieldCheck,
  empleados_capacitacion: GraduationCap,
  maquinaria_documentacion: FileText,
  maquinaria_mantenimiento: Wrench,
  maquinaria_operacion: Settings,
};

// ─── COMPONENTE: Anillo de progreso circular ─────────────────
function ProgressRing({ percentage, size = 160, strokeWidth = 12, color, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const rango = getRangoCumplimiento(percentage);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="transparent"
          stroke={color || rango.color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-4xl font-bold" style={{ color: rango.color }}>{percentage}%</span>
      </div>
      <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: rango.color + '20', color: rango.color }}>
        {rango.label}
      </span>
      <p className="text-xs text-gray-500 text-center max-w-[200px]">{rango.desc}</p>
    </div>
  );
}

// ─── COMPONENTE: Badge de estado ─────────────────────────────
function EstadoBadge({ estado }) {
  const config = {
    vigente: { label: 'Vigente', cls: 'bg-green-100 text-green-700 border-green-300' },
    proximo: { label: 'Próximo a vencer', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-700 border-red-300' },
    critico: { label: 'Crítico', cls: 'bg-red-100 text-red-700 border-red-300' },
    sin_dato: { label: 'Sin dato', cls: 'bg-gray-100 text-gray-500 border-gray-300' },
    ausente: { label: 'Ausente', cls: 'bg-gray-100 text-gray-500 border-gray-300' },
  };
  const c = config[estado] || config.ausente;
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${c.cls}`}>{c.label}</span>;
}

// ─── COMPONENTE: Barra de progreso simple ────────────────────
function ProgresoBar({ porcentaje, color }) {
  const rango = getRangoCumplimiento(porcentaje);
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${porcentaje}%`, backgroundColor: color || rango.color }} />
    </div>
  );
}

// ─── COMPONENTE: Tarjeta de categoría ────────────────────────
function CategoriaCard({ categoria, puntaje, maxPosible }) {
  const Icon = CAT_ICONS[categoria.id] || ClipboardCheck;
  const catPct = maxPosible > 0 ? Math.round((puntaje / maxPosible) * 100) : 0;
  const rango = getRangoCumplimiento(catPct);

  return (
    <div className={`rounded-lg border-2 p-4 bg-white ${rango.bgColor}`} style={{ borderColor: rango.color + '40' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: rango.color + '15' }}>
            <Icon className="w-5 h-5" style={{ color: rango.color }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">{categoria.label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color: rango.color }}>{catPct}%</span>
      </div>
      <ProgresoBar porcentaje={catPct} color={rango.color} />
      <div className="mt-2 text-xs text-gray-500"><span className="font-medium">{Math.round(puntaje * 10) / 10}</span> / {maxPosible} pts</div>
    </div>
  );
}

// ─── COMPONENTE: Mini tabla de items de cumplimiento ─────────
function DetalleItems({ detalle }) {
  return (
    <div className="divide-y divide-gray-100">
      {detalle.map((item, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{
              backgroundColor: item.estado === 'vigente' ? '#22c55e' :
                item.estado === 'proximo' ? '#eab308' :
                item.estado === 'critico' ? '#f97316' : '#ef4444'
            }} />
            <span className="text-sm text-gray-700">{item.tipo}</span>
          </div>
          <EstadoBadge estado={item.estado} />
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE: Tabla expandible de empleados ───────────────
function TablaEmpleados({ empleados }) {
  const [expanded, setExpanded] = useState(null);
  if (empleados.length === 0) {
    return <div className="text-center py-8 text-gray-400"><Users className="mx-auto h-10 w-10 mb-2" /><p className="text-sm">No hay empleados asignados a este frente</p></div>;
  }
  return (
    <div className="space-y-2">
      {empleados.map((emp) => {
        const c = emp._cumplimiento;
        const isOpen = expanded === emp.id;
        const rango = getRangoCumplimiento(c.promedio);
        return (
          <div key={emp.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setExpanded(isOpen ? null : emp.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rango.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {emp.nombre} {emp.primer_apellido} {emp.segundo_apellido || ''}
                  </p>
                  <p className="text-xs text-gray-500">{emp.cedula || '—'} · {emp.cargo?.nombre || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-sm font-bold" style={{ color: rango.color }}>{c.promedio}%</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {isOpen && <div className="border-t border-gray-100 bg-gray-50 px-4 py-3"><DetalleItems detalle={c.detalle} /></div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── COMPONENTE: Tabla expandible de maquinaria ─────────────
function TablaMaquinaria({ maquinaria }) {
  const [expanded, setExpanded] = useState(null);
  if (maquinaria.length === 0) {
    return <div className="text-center py-8 text-gray-400"><Wrench className="mx-auto h-10 w-10 mb-2" /><p className="text-sm">No hay maquinaria asignada a este frente</p></div>;
  }
  return (
    <div className="space-y-2">
      {maquinaria.map((maq) => {
        const c = maq._cumplimiento;
        const isOpen = expanded === maq.id;
        const rango = getRangoCumplimiento(c.promedio);
        return (
          <div key={maq.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setExpanded(isOpen ? null : maq.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rango.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{maq.codigo_interno || '—'} — {maq.nombre || '—'}</p>
                  <p className="text-xs text-gray-500">{maq.tipos_maquinaria?.nombre || '—'} · {maq.marca || ''} {maq.modelo || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-sm font-bold" style={{ color: rango.color }}>{c.promedio}%</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {isOpen && <div className="border-t border-gray-100 bg-gray-50 px-4 py-3"><DetalleItems detalle={c.detalle} /></div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────
export default function AuditoriasPage() {
  const supabase = createClient();
  const { user } = useRole();
  const router = useRouter();

  const [frentes, setFrentes] = useState([]);
  const [selectedFrenteId, setSelectedFrenteId] = useState('');
  const [frente, setFrente] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [maquinaria, setMaquinaria] = useState([]);
  const [cumplimiento, setCumplimiento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFrentes, setLoadingFrentes] = useState(true);
  const [error, setError] = useState(null);

  // Cargar solo Santa Rosa + auditoría
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getFrentesTrabajo();
        const santaRosa = (data || []).filter(f => f.codigo === 'FT-SR');
        if (!mounted) return;
        setFrentes(santaRosa);

        if (santaRosa.length > 0) {
          const srId = String(santaRosa[0].id);
          setSelectedFrenteId(srId);
          setLoading(true);
          try {
            const datos = await getDatosAuditoria(santaRosa[0].id);
            if (!mounted) return;
            setFrente(datos.frente);
            const empScore = (datos.empleados || []).map(emp => ({ ...emp, _cumplimiento: calcularCumplimientoEmpleado(emp) }));
            setEmpleados(empScore);
            const maqScore = (datos.maquinaria || []).map(maq => ({ ...maq, _cumplimiento: calcularCumplimientoMaquinaria(maq) }));
            setMaquinaria(maqScore);
            setCumplimiento(calcularCumplimientoGlobal(empScore, maqScore));
          } catch (err) {
            if (!mounted) return;
            console.error('Error cargando auditoría:', err);
            setError(err.message || 'Error al cargar los datos de auditoría');
          } finally {
            if (mounted) setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error cargando frentes:', err);
      } finally {
        if (mounted) setLoadingFrentes(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loadingFrentes) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 animate-pulse" />
          <p className="mt-4 text-gray-500 font-medium">Cargando frentes de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditorías</h1>
          <p className="text-sm text-gray-600">Evaluación de cumplimiento por frente de trabajo</p>
        </div>
      </div>

      {/* SELECTOR DE FRENTE (solo Santa Rosa) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Building2 className="h-5 w-5 text-gray-900" />
            <div>
              <span className="text-sm font-semibold text-gray-900">Santa Rosa</span>
              <span className="ml-2 text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">FT-SR</span>
            </div>
          </div>
          {selectedFrenteId && (
            <span className="text-xs text-gray-400">{empleados.length} empleados · {maquinaria.length} equipos</span>
          )}
        </div>
      </div>

      {/* Cargando */}
      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Analizando el frente de trabajo...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {!loading && !error && frente && cumplimiento && (
        <>
          {/* FRENTE HEADER */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{frente.nombre}</h2>
                  <span className="text-sm font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{frente.codigo}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  {frente.ciudad && <span>{frente.ciudad}{frente.departamento ? `, ${frente.departamento}` : ''}</span>}
                  {frente.ubicacion && <span className="text-gray-400"> · {frente.ubicacion}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center"><span className="block text-lg font-bold text-gray-900">{empleados.length}</span><span className="text-gray-500">Empleados</span></div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center"><span className="block text-lg font-bold text-gray-900">{maquinaria.length}</span><span className="text-gray-500">Equipos</span></div>
              </div>
            </div>
          </div>

          {/* CUMPLIMIENTO GLOBAL + CATEGORÍAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex items-center justify-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <ProgressRing percentage={cumplimiento.porcentaje} size={180} />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIAS_ORDER.map((cat) => {
                const catData = cumplimiento.categorias[cat.id];
                return <CategoriaCard key={cat.id} categoria={cat} puntaje={catData?.puntaje || 0} maxPosible={catData?.maxPosible || 1} />;
              })}
            </div>
          </div>

          {/* TABLA DE EMPLEADOS */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-800">Empleados del Frente</h3>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{empleados.length}</span>
              </div>
            </div>
            <div className="p-4"><TablaEmpleados empleados={empleados} /></div>
          </div>

          {/* TABLA DE MAQUINARIA */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-800">Maquinaria del Frente</h3>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{maquinaria.length}</span>
              </div>
            </div>
            <div className="p-4"><TablaMaquinaria maquinaria={maquinaria} /></div>
          </div>
        </>
      )}
    </div>
  );
}
