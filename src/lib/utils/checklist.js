// ============================================
// CHECKLIST DIARIO DE MAQUINARIA
// Constantes compartidas entre el panel (TabChecklistDiario)
// y las versiones móviles por QR (/mantenimiento/checklist/[id])
// ============================================

export const CHECKLIST_ITEMS = [
  { key: 'aceite_motor', label: 'Nivel de Aceite Motor', icon: '🛢️' },
  { key: 'liquido_hidraulico', label: 'Líquido Hidráulico', icon: '💧' },
  { key: 'refrigerante', label: 'Refrigerante', icon: '🌡️' },
  { key: 'filtro_aire', label: 'Filtro de Aire', icon: '💨' },
  { key: 'llantas', label: 'Llantas / Neumáticos', icon: '⚙️' },
  { key: 'luces', label: 'Luces', icon: '💡' },
  { key: 'frenos', label: 'Frenos', icon: '🛑' },
  { key: 'bocina', label: 'Bocina / Alarma', icon: '🔊' },
  { key: 'espejos', label: 'Espejos', icon: '🔍' },
  { key: 'cinturon', label: 'Cinturón de Seguridad', icon: '🔗' },
  { key: 'extintor', label: 'Extintor', icon: '🧯' },
  { key: 'botiquin', label: 'Botiquín', icon: '💊' },
  { key: 'limpieza', label: 'Limpieza General', icon: '🧹' },
  { key: 'fugas', label: 'Fugas de Fluidos', icon: '🔧' },
  { key: 'estado_general', label: 'Estado General', icon: '✅' },
];

export const ESTADOS_CHECKLIST = [
  { value: 'bien', label: 'Bien', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'regular', label: 'Regular', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'mal', label: 'Mal', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const CHECKLIST_DEFAULT_STATE = 'bien';
