'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { buildPucTree, formatValorContable, getNaturalezaLabel, getNaturalezaColor, getTipoCuentaLabel } from '@/lib/utils/contabilidad';
import { crearCuenta } from '@/actions/contabilidad';
import { exportarExcel } from '@/lib/utils/exportar';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function PUCPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [cuentas, setCuentas] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'activo',
    naturaleza: 'debito',
    nivel: 1,
    codigo_padre: '',
    activa: true,
    acepta_movimiento: true,
    descripcion: '',
    pide_tercero: false,
    pide_centro_costo: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [cuentasList, setCuentasList] = useState([]);

  useEffect(() => {
    async function loadCuentas() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase
          .from('plan_cuentas')
          .select('*')
          .order('codigo', { ascending: true });

        if (err) throw err;
        setCuentas(data || []);
        setCuentasList(data || []);
      } catch (err) {
        console.error('Error loading PUC:', err);
        try { addToast('Error al cargar el plan de cuentas', { type: 'error' }) } catch(e) {}
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCuentas();
  }, [supabase]);

  // Build tree and filter
  const treeData = buildPucTree(cuentas);

  // Recursive filter
  function filterTree(nodes, term) {
    if (!term) return nodes;
    return nodes
      .map((node) => {
        const matches = node.codigo.toLowerCase().includes(term.toLowerCase()) ||
                        node.nombre.toLowerCase().includes(term.toLowerCase());
        const filteredChildren = node.children ? filterTree(node.children, term) : [];
        if (matches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean);
  }

  const filteredTree = filterTree(treeData, search);

  function toggleExpand(codigo) {
    setExpanded((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  }

  // Auto-expand on first load: expand level 1 (first level after root)
  useEffect(() => {
    if (!loading && cuentas.length > 0 && Object.keys(expanded).length === 0) {
      const level1 = cuentas.filter(c => c.nivel === 1).map(c => c.codigo);
      if (level1.length > 0) {
        const exp = {};
        level1.forEach(c => { exp[c] = true; });
        setExpanded(exp);
      }
    }
  }, [loading, cuentas, expanded]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const result = await crearCuenta(formData);
      if (result.error) throw new Error(result.error);
      setShowForm(false);
      setFormData({
        codigo: '',
        nombre: '',
        tipo: 'activo',
        naturaleza: 'debito',
        nivel: 1,
        codigo_padre: '',
        activa: true,
        acepta_movimiento: true,
        descripcion: '',
        pide_tercero: false,
        pide_centro_costo: false,
      });
      // Reload
      const { data } = await supabase
        .from('plan_cuentas')
        .select('*')
        .order('codigo', { ascending: true });
      if (data) {
        setCuentas(data);
        setCuentasList(data);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  function renderNode(node, depth) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.codigo];
    const ml = depth * 24;

    return (
      <div key={node.codigo}>
        <div
          className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition cursor-pointer border-b border-gray-100 ${node.acepta_movimiento ? '' : 'text-gray-500'}`}
          style={{ paddingLeft: `${24 + ml}px` }}
          onClick={() => hasChildren && toggleExpand(node.codigo)}
        >
          {hasChildren ? (
            <span className="text-gray-400 flex-shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <span className="font-mono text-sm font-semibold text-gray-700">{node.codigo}</span>
          <span className="text-sm text-gray-900 font-medium">{node.nombre}</span>
          <span className={`ml-auto text-xs font-medium ${getNaturalezaColor(node.naturaleza)}`}>
            {getNaturalezaLabel(node.naturaleza)}
          </span>
          {node.activa === false && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Inactiva
            </span>
          )}
          {node.acepta_movimiento === false && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Agr.
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Cargando plan de cuentas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  async function exportarExcelFn() {
    const columns = [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Clase' },
      { key: 'naturaleza', label: 'Naturaleza' },
      { key: 'activa', label: 'Activa', formatter: (v) => v ? 'Sí' : 'No' },
    ];
    const data = cuentas.map(item => {
      const row = {};
      columns.forEach(col => {
        row[col.label] = col.formatter ? col.formatter(item[col.key], item) : (item[col.key] ?? '');
      });
      return row;
    });
    await exportarExcel(data, columns, 'puc', 'PUC - Serviequipos');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Único de Cuentas (PUC)</h1>
          <p className="text-sm text-gray-600">{cuentas.length} cuentas registradas</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); setFormError(null); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva Cuenta'}
          </button>
        )}
        <button
          onClick={exportarExcelFn}
          disabled={cuentas.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Exportar a Excel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {/* New Account Form */}
      {showForm && isAdmin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva Cuenta Contable</h2>
          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej: 110505"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre de la cuenta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="nivel"
                  value={formData.nivel}
                  onChange={handleFormChange}
                  required
                  min="1"
                  max="8"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="activo">Activo</option>
                  <option value="pasivo">Pasivo</option>
                  <option value="patrimonio">Patrimonio</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                  <option value="costo">Costo</option>
                  <option value="cuenta_orden">Cuenta de Orden</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naturaleza <span className="text-red-500">*</span></label>
                <select
                  name="naturaleza"
                  value={formData.naturaleza}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Padre</label>
                <select
                  name="codigo_padre"
                  value={formData.codigo_padre}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Sin padre (raíz)</option>
                  {cuentasList.map((c) => (
                    <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="activa"
                  checked={formData.activa}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Activa
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="acepta_movimiento"
                  checked={formData.acepta_movimiento}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Acepta movimiento
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="pide_tercero"
                  checked={formData.pide_tercero}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Pide tercero
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="pide_centro_costo"
                  checked={formData.pide_centro_costo}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Pide centro de costo
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o nombre de cuenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {search && (
          <p className="mt-2 text-sm text-gray-500">
            Resultados: {filteredTree.reduce((count, node) => count + countNodes(node), 0)} cuentas
          </p>
        )}
      </div>

      {/* Tree View */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredTree.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-400">
              {search ? 'No se encontraron cuentas con ese criterio' : 'No hay cuentas registradas'}
            </p>
            {!search && isAdmin && (
              <button
                onClick={() => { setShowForm(true); setFormError(null); }}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Crear primera cuenta
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
              <span className="w-4 flex-shrink-0" />
              <span className="w-20">Código</span>
              <span className="flex-1">Nombre</span>
              <span className="w-20 text-right">Naturaleza</span>
            </div>
            {filteredTree.map((node) => renderNode(node, 0))}
          </div>
        )}
      </div>
    </div>
  );
}

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}
