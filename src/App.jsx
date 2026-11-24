import { useState, useEffect } from 'react';
import {
  Plus,
  Camera,
  Trash2,
  ArrowLeft,
  Calendar,
  User,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Copy,
  Users
} from 'lucide-react';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzuRANXakPT_Lk6zniJlJFC-sIjEMP1bhX02m8BY7Yag4kD9hidoDbVLZVck9utZt-_/exec';

const crearNuevoRegistroVacio = () => ({
  id: Date.now().toString(),
  nombreApellido: '',
  fecha: new Date().toISOString().split('T')[0],
  hora: new Date().toTimeString().slice(0, 5),
  turno: 'Día',
  seguridadCustodia: '',
  clima: 'Soleado',
  climaOtro: '',
  obraInfo: {
    titulo: 'Libro de Obra Bdp - Adecuacion Medios de Pagos',
    ubicacion: '',
    contratista: 'Picapiedra Constructora',
    jefeProyecto: '',
    residenteObra: '',
    adminBanco: ''
  },
  actividades: [
    { id: 1, item: '1', actividad: '', area: '', responsable: '', avance: '', observaciones: '' }
  ],
  materiales: [
    { id: 1, item: '1', material: '', cantidad: '', unidad: '', proveedor: '', observaciones: '' }
  ],
  personal: [
    { id: 1, cargo: 'Maestro', cantidad: '' },
    { id: 2, cargo: 'Oficiales', cantidad: '' }
  ],
  coordinaciones: {
    accesosControlados: 'Sí',
    fueraHorario: 'No',
    custodiaPresente: 'Sí',
    autorizacionesEspeciales: ''
  },
  acta: {
    fecha: new Date().toISOString().split('T')[0],
    participantes: '',
    supervisorBanco: '',
    acuerdo1: '',
    acuerdo2: '',
    acuerdo3: '',
    contratistaFirma: '',
    encargadoBancoFirma: ''
  },
  evidencias: []
});

const calcularTotalPersonal = (personal = []) =>
  personal.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);

export default function App() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState('casillero');
  const [registroActual, setRegistroActual] = useState(null);
  const [pasoCreacion, setPasoCreacion] = useState('datos_iniciales');
  const [copiado, setCopiado] = useState(false);

  const cargarRegistrosDesdeDrive = async () => {
    setCargando(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
      const texto = await res.text();
      const data = JSON.parse(texto);
      if (data.ok && Array.isArray(data.registros)) {
        setRegistros(data.registros);
      }
    } catch (error) {
      console.error('Error al cargar desde Google Drive:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRegistrosDesdeDrive();
  }, []);

  const persistirRegistroEnDrive = async (reg) => {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'upsert', registro: reg })
    });
    const texto = await res.text();
    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error('Respuesta no JSON de Apps Script: ' + texto.slice(0, 180));
    }
    if (!data.ok) {
      throw new Error(data.error || 'Error al guardar en Drive');
    }
  };

  const abrirNuevoCasillero = () => {
    const nuevo = crearNuevoRegistroVacio();
    if (registros.length > 0 && registros[0].obraInfo) {
      nuevo.obraInfo = { ...registros[0].obraInfo };
    }
    setRegistroActual(nuevo);
    setPasoCreacion('datos_iniciales');
    setVista('formulario');
  };

  const abrirRegistroExistente = (reg) => {
    const copia = JSON.parse(JSON.stringify(reg));
    if (!copia.obraInfo) {
      copia.obraInfo = {
        titulo: 'Libro de Obra Bdp - Adecuacion Medios de Pagos',
        ubicacion: '',
        contratista: 'Picapiedra Constructora',
        jefeProyecto: '',
        residenteObra: '',
        adminBanco: ''
      };
    }
    setRegistroActual(copia);
    setPasoCreacion('libro_completo');
    setVista('formulario');
  };

  const duplicarRegistro = async (reg, e) => {
    e.stopPropagation();
    const clon = JSON.parse(JSON.stringify(reg));
    clon.id = Date.now().toString();
    clon.fecha = new Date().toISOString().split('T')[0];
    try {
      await persistirRegistroEnDrive(clon);
      await cargarRegistrosDesdeDrive();
    } catch (err) {
      alert('No se pudo duplicar: ' + (err?.message || err));
    }
  };

  const guardarRegistro = async () => {
    if (!registroActual.nombreApellido.trim()) {
      alert('Por favor ingresa tu Nombre y Apellido.');
      return;
    }
    setGuardando(true);
    try {
      await persistirRegistroEnDrive(registroActual);
      await cargarRegistrosDesdeDrive();
      setVista('casillero');
    } catch (err) {
      alert('Detalle del error: ' + (err?.message || String(err)));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarRegistro = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar este casillero del libro de obra?')) return;
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id })
      });
      const texto = await res.text();
      const data = JSON.parse(texto);
      if (!data.ok) throw new Error(data.error);
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('No se pudo eliminar: ' + (err?.message || err));
    }
  };

  const copiarResumen = () => {
    if (!registroActual) return;
    const acts = registroActual.actividades
      .filter((a) => a.actividad.trim())
      .map((a) => `- [${a.avance || '0%'}] ${a.actividad} (${a.area || 'Sin área'})`)
      .join('\n');

    const texto = [
      `${registroActual.obraInfo?.titulo || 'Libro de Obra'}`,
      `Fecha: ${registroActual.fecha} | Turno: ${registroActual.turno} | Responsable: ${registroActual.nombreApellido}`,
      `Ubicación: ${registroActual.obraInfo?.ubicacion || '-'} | Contratista: ${registroActual.obraInfo?.contratista || '-'}`,
      `Personal total: ${calcularTotalPersonal(registroActual.personal)} | Fotos: ${registroActual.evidencias.length}`,
      acts ? `Actividades:\n${acts}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const manejarSubidaFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const comprimida = canvas.toDataURL('image/jpeg', 0.65);

        setRegistroActual((prev) => ({
          ...prev,
          evidencias: [
            ...prev.evidencias,
            { id: Date.now().toString(), fotoUrl: comprimida, descripcion: '' }
          ]
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (vista === 'casillero') {
    const tituloCabecera =
      registros[0]?.obraInfo?.titulo || 'Libro de Obra Bdp - Adecuacion Medios de Pagos';
    return (
      <div className="min-h-screen bg-[#f4f5f8] text-[#575656] transition-colors duration-300">
        <header className="bg-[#26348B] text-white shadow-lg border-b-4 border-[#F8EA1B]">
          <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="transition-transform duration-300">
              <span className="text-xs uppercase tracking-wider text-[#F8EA1B] font-bold">
                {registros[0]?.obraInfo?.ubicacion || 'Obra'} •{' '}
                {registros[0]?.obraInfo?.contratista || 'Picapiedra Constructora'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold mt-0.5 text-white">{tituloCabecera}</h1>
            </div>
            <button
              onClick={abrirNuevoCasillero}
              className="inline-flex items-center justify-center gap-2 bg-[#F8EA1B] hover:brightness-95 active:scale-95 text-[#26348B] font-bold px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Nuevo Registro
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#26348B]">
              Casillero Diario ({registros.length} {registros.length === 1 ? 'registro' : 'registros'})
            </h2>
          </div>

          {cargando ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-[#575656]">
              Cargando registros desde Google Drive...
            </div>
          ) : registros.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-[#26348B]/30 p-12 text-center shadow-sm transition-all duration-300">
              <FileText className="w-12 h-12 text-[#26348B] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[#26348B]">
                Aún no hay registros en el casillero
              </h3>
              <p className="text-[#575656] text-sm mt-1 mb-5">
                Presiona "Nuevo Registro", ingresa tu nombre, apellido y fecha para llenar la bitácora del día.
              </p>
              <button
                onClick={abrirNuevoCasillero}
                className="inline-flex items-center gap-2 bg-[#26348B] hover:bg-[#1e2970] active:scale-95 text-[#F8EA1B] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Crear primer registro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {registros.map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => abrirRegistroExistente(reg)}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#26348B] transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#26348B] bg-[#F8EA1B]/35 border border-[#F8EA1B] px-3 py-1 rounded-full w-fit mb-3">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#26348B]" />
                      {reg.fecha} • Turno {reg.turno}
                    </div>
                    <div className="flex items-center gap-2 text-[#26348B] font-bold text-base">
                      <User className="w-4 h-4 text-[#575656] shrink-0" />
                      <span className="truncate">{reg.nombreApellido}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#575656] mt-2.5">
                      <span>{reg.actividades.filter((a) => a.actividad.trim()).length} actividades</span>
                      <span>•</span>
                      <span>{reg.evidencias.length} fotos</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[#26348B] font-semibold">
                        <Users className="w-3.5 h-3.5 text-[#575656]" />
                        {calcularTotalPersonal(reg.personal)} pers.
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#26348B]">Abrir hoja →</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => duplicarRegistro(reg, e)}
                        className="text-[#575656] hover:text-[#26348B] hover:bg-[#F8EA1B]/30 p-1.5 rounded-lg transition cursor-pointer"
                        title="Duplicar registro"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => eliminarRegistro(reg.id, e)}
                        className="text-[#575656] hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (pasoCreacion === 'datos_iniciales') {
    return (
      <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border-t-4 border-[#26348B] p-6 sm:p-8 transition-all duration-300">
          <button
            onClick={() => setVista('casillero')}
            className="inline-flex items-center gap-1.5 text-sm text-[#575656] hover:text-[#26348B] mb-4 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al casillero
          </button>

          <h2 className="text-xl font-bold text-[#26348B]">Nuevo Casillero Diario</h2>
          <p className="text-sm text-[#575656] mt-1 mb-6">
            Ingresa tus datos para abrir el formulario del Libro de Obra de hoy.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#575656] mb-1">
                Nombres y Apellidos *
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Mendoza"
                value={registroActual.nombreApellido}
                onChange={(e) =>
                  setRegistroActual({ ...registroActual, nombreApellido: e.target.value })
                }
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#575656] focus:outline-none focus:ring-2 focus:ring-[#26348B] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#575656] mb-1">
                Fecha del Reporte *
              </label>
              <input
                type="date"
                value={registroActual.fecha}
                onChange={(e) => setRegistroActual({ ...registroActual, fecha: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-[#575656] focus:outline-none focus:ring-2 focus:ring-[#26348B] transition"
              />
            </div>

            <button
              onClick={() => {
                if (!registroActual.nombreApellido.trim()) {
                  alert('Escribe tu nombre y apellido para continuar.');
                  return;
                }
                setPasoCreacion('libro_completo');
              }}
              className="w-full bg-[#26348B] hover:bg-[#1e2970] active:scale-[0.99] text-[#F8EA1B] font-bold py-3 rounded-xl mt-2 shadow-md transition-all duration-200 cursor-pointer"
            >
              Entrar al Libro de Obra →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-[#575656] pb-20">
      <div className="sticky top-0 z-20 bg-[#26348B] text-white shadow-md border-b-2 border-[#F8EA1B]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setVista('casillero')}
            className="inline-flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Casillero
          </button>
          <div className="text-center truncate">
            <p className="text-xs text-[#F8EA1B] font-semibold">{registroActual.fecha}</p>
            <p className="text-sm font-bold truncate">{registroActual.nombreApellido}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copiarResumen}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 text-[#26348B] font-bold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiado ? 'Copiado' : 'Resumen'}
            </button>
            <button
              onClick={guardarRegistro}
              disabled={guardando}
              className="inline-flex items-center gap-1.5 text-sm bg-[#F8EA1B] hover:brightness-95 active:scale-95 disabled:opacity-60 text-[#26348B] font-bold px-4 py-2 rounded-lg shadow transition-all duration-200 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#26348B] p-5 shadow-sm transition-all duration-200">
          <h2 className="font-bold text-[#26348B] text-base border-b border-slate-100 pb-2 mb-4">
            Información General de Obra
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#575656] mb-1">
                Título del Libro de Obra
              </label>
              <input
                type="text"
                value={registroActual.obraInfo.titulo}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, titulo: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Ubicación</label>
              <input
                type="text"
                placeholder="Ej: Manta - Ecuador"
                value={registroActual.obraInfo.ubicacion}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, ubicacion: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Contratista</label>
              <input
                type="text"
                placeholder="Nombre de la empresa contratista"
                value={registroActual.obraInfo.contratista}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, contratista: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Jefe de Proyecto</label>
              <input
                type="text"
                placeholder="Nombre del jefe de proyecto"
                value={registroActual.obraInfo.jefeProyecto}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, jefeProyecto: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Residente de Obra</label>
              <input
                type="text"
                placeholder="Nombre del residente de obra"
                value={registroActual.obraInfo.residenteObra}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, residenteObra: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#575656] mb-1">
                Administrador de parte del Banco
              </label>
              <input
                type="text"
                placeholder="Nombre del administrador del banco"
                value={registroActual.obraInfo.adminBanco}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    obraInfo: { ...registroActual.obraInfo, adminBanco: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-[#575656] mb-1">
                Responsable Registro
              </label>
              <input
                type="text"
                value={registroActual.nombreApellido}
                onChange={(e) =>
                  setRegistroActual({ ...registroActual, nombreApellido: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Fecha</label>
              <input
                type="date"
                value={registroActual.fecha}
                onChange={(e) => setRegistroActual({ ...registroActual, fecha: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Hora</label>
              <input
                type="time"
                value={registroActual.hora}
                onChange={(e) => setRegistroActual({ ...registroActual, hora: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Turno</label>
              <select
                value={registroActual.turno}
                onChange={(e) => setRegistroActual({ ...registroActual, turno: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              >
                <option>Día</option>
                <option>Tarde</option>
                <option>Noche</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#575656] mb-1">
                Seguridad Banco / Custodia
              </label>
              <input
                type="text"
                placeholder="Nombre del guardia o novedad"
                value={registroActual.seguridadCustodia}
                onChange={(e) =>
                  setRegistroActual({ ...registroActual, seguridadCustodia: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#575656] mb-1">Clima</label>
              <div className="flex gap-2">
                <select
                  value={registroActual.clima}
                  onChange={(e) => setRegistroActual({ ...registroActual, clima: e.target.value })}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#26348B]"
                >
                  <option>Soleado</option>
                  <option>Nublado</option>
                  <option>Lluvia</option>
                  <option>Otro</option>
                </select>
                {registroActual.clima === 'Otro' && (
                  <input
                    type="text"
                    placeholder="Especificar clima"
                    value={registroActual.climaOtro}
                    onChange={(e) =>
                      setRegistroActual({ ...registroActual, climaOtro: e.target.value })
                    }
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#26348B]"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#F8EA1B] p-5 shadow-sm transition-all duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="font-bold text-[#26348B] text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#26348B]" /> Evidencia Fotográfica del Día
              </h2>
              <p className="text-xs text-[#575656]">
                Toma fotos directo con la cámara o sube desde galería y añade descripción.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 bg-[#26348B] hover:bg-[#1e2970] active:scale-95 text-[#F8EA1B] text-sm font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all duration-200">
              <Camera className="w-4 h-4" />
              Tomar / Subir Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={manejarSubidaFoto}
                className="hidden"
              />
            </label>
          </div>

          {registroActual.evidencias.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay fotos agregadas aún en este día.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {registroActual.evidencias.map((ev, idx) => (
                <div
                  key={ev.id}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 transition-all duration-200 hover:shadow-md"
                >
                  <div className="relative">
                    <img
                      src={ev.fotoUrl}
                      alt={`Evidencia ${idx + 1}`}
                      className="w-full h-52 object-cover"
                    />
                    <button
                      onClick={() =>
                        setRegistroActual({
                          ...registroActual,
                          evidencias: registroActual.evidencias.filter((item) => item.id !== ev.id)
                        })
                      }
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg shadow transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs font-semibold text-[#575656] mb-1">
                      Descripción de la foto #{idx + 1}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describe qué trabajo o avance se observa..."
                      value={ev.descripcion}
                      onChange={(e) =>
                        setRegistroActual({
                          ...registroActual,
                          evidencias: registroActual.evidencias.map((item) =>
                            item.id === ev.id ? { ...item, descripcion: e.target.value } : item
                          )
                        })
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#26348B]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#26348B] p-5 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
            <h2 className="font-bold text-[#26348B] text-base">1. Actividades Ejecutadas</h2>
            <button
              onClick={() =>
                setRegistroActual({
                  ...registroActual,
                  actividades: [
                    ...registroActual.actividades,
                    {
                      id: Date.now(),
                      item: String(registroActual.actividades.length + 1),
                      actividad: '',
                      area: '',
                      responsable: '',
                      avance: '',
                      observaciones: ''
                    }
                  ]
                })
              }
              className="text-xs bg-[#F8EA1B] text-[#26348B] hover:brightness-95 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              + Agregar fila
            </button>
          </div>

          <div className="space-y-3">
            {registroActual.actividades.map((act, idx) => (
              <div
                key={act.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm transition-all duration-150"
              >
                <input
                  placeholder="Ítem"
                  value={act.item}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].item = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-1 border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                />
                <input
                  placeholder="Actividad ejecutada"
                  value={act.actividad}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].actividad = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-4 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Área"
                  value={act.area}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].area = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Responsable"
                  value={act.responsable}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].responsable = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Avance %"
                  value={act.avance}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].avance = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-1 border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                />
                <input
                  placeholder="Observaciones"
                  value={act.observaciones}
                  onChange={(e) => {
                    const copia = [...registroActual.actividades];
                    copia[idx].observaciones = e.target.value;
                    setRegistroActual({ ...registroActual, actividades: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#F8EA1B] p-5 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
            <h2 className="font-bold text-[#26348B] text-base">2. Materiales Ingresados</h2>
            <button
              onClick={() =>
                setRegistroActual({
                  ...registroActual,
                  materiales: [
                    ...registroActual.materiales,
                    {
                      id: Date.now(),
                      item: String(registroActual.materiales.length + 1),
                      material: '',
                      cantidad: '',
                      unidad: '',
                      proveedor: '',
                      observaciones: ''
                    }
                  ]
                })
              }
              className="text-xs bg-[#F8EA1B] text-[#26348B] hover:brightness-95 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              + Agregar material
            </button>
          </div>

          <div className="space-y-3">
            {registroActual.materiales.map((mat, idx) => (
              <div
                key={mat.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm transition-all duration-150"
              >
                <input
                  placeholder="Ítem"
                  value={mat.item}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].item = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-1 border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                />
                <input
                  placeholder="Material"
                  value={mat.material}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].material = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-3 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Cantidad"
                  value={mat.cantidad}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].cantidad = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Unidad"
                  value={mat.unidad}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].unidad = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Proveedor"
                  value={mat.proveedor}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].proveedor = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  placeholder="Observaciones"
                  value={mat.observaciones}
                  onChange={(e) => {
                    const copia = [...registroActual.materiales];
                    copia[idx].observaciones = e.target.value;
                    setRegistroActual({ ...registroActual, materiales: copia });
                  }}
                  className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#26348B] p-5 shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h2 className="font-bold text-[#26348B] text-base">
                3. Personal en Obra ({calcularTotalPersonal(registroActual.personal)})
              </h2>
              <button
                onClick={() =>
                  setRegistroActual({
                    ...registroActual,
                    personal: [
                      ...registroActual.personal,
                      { id: Date.now(), cargo: '', cantidad: '' }
                    ]
                  })
                }
                className="text-xs bg-[#F8EA1B] text-[#26348B] hover:brightness-95 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                + Cargo
              </button>
            </div>
            <div className="space-y-2.5 text-sm">
              {registroActual.personal.map((per, idx) => (
                <div key={per.id} className="flex gap-2">
                  <input
                    placeholder="Cargo (Ej: Maestro, Oficiales)"
                    value={per.cargo}
                    onChange={(e) => {
                      const copia = [...registroActual.personal];
                      copia[idx].cargo = e.target.value;
                      setRegistroActual({ ...registroActual, personal: copia });
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Cant."
                    value={per.cantidad}
                    onChange={(e) => {
                      const copia = [...registroActual.personal];
                      copia[idx].cantidad = e.target.value;
                      setRegistroActual({ ...registroActual, personal: copia });
                    }}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#F8EA1B] p-5 shadow-sm text-sm transition-all duration-200">
            <h2 className="font-bold text-[#26348B] text-base border-b border-slate-100 pb-2 mb-4">
              4. Coordinaciones con Banco
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Accesos controlados:</span>
                <select
                  value={registroActual.coordinaciones.accesosControlados}
                  onChange={(e) =>
                    setRegistroActual({
                      ...registroActual,
                      coordinaciones: {
                        ...registroActual.coordinaciones,
                        accesosControlados: e.target.value
                      }
                    })
                  }
                  className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Ingreso fuera de horario bancario:</span>
                <select
                  value={registroActual.coordinaciones.fueraHorario}
                  onChange={(e) =>
                    setRegistroActual({
                      ...registroActual,
                      coordinaciones: {
                        ...registroActual.coordinaciones,
                        fueraHorario: e.target.value
                      }
                    })
                  }
                  className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Custodia presente:</span>
                <select
                  value={registroActual.coordinaciones.custodiaPresente}
                  onChange={(e) =>
                    setRegistroActual({
                      ...registroActual,
                      coordinaciones: {
                        ...registroActual.coordinaciones,
                        custodiaPresente: e.target.value
                      }
                    })
                  }
                  className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#575656] mb-1">
                  Autorizaciones especiales:
                </label>
                <input
                  type="text"
                  value={registroActual.coordinaciones.autorizacionesEspeciales}
                  onChange={(e) =>
                    setRegistroActual({
                      ...registroActual,
                      coordinaciones: {
                        ...registroActual.coordinaciones,
                        autorizacionesEspeciales: e.target.value
                      }
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#26348B] p-5 shadow-sm text-sm transition-all duration-200">
          <h2 className="font-bold text-[#26348B] text-base border-b border-slate-100 pb-2 mb-4">
            5. Acta de Reunión de Coordinación
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Fecha Reunión</label>
              <input
                type="date"
                value={registroActual.acta.fecha}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    acta: { ...registroActual.acta, fecha: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Participantes</label>
              <input
                type="text"
                value={registroActual.acta.participantes}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    acta: { ...registroActual.acta, participantes: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">Supervisor Banco</label>
              <input
                type="text"
                value={registroActual.acta.supervisorBanco}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    acta: { ...registroActual.acta, supervisorBanco: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="block font-semibold text-[#575656]">Acuerdos Principales</label>
            <input
              placeholder="1.- Primer acuerdo..."
              value={registroActual.acta.acuerdo1}
              onChange={(e) =>
                setRegistroActual({
                  ...registroActual,
                  acta: { ...registroActual.acta, acuerdo1: e.target.value }
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              placeholder="2.- Segundo acuerdo..."
              value={registroActual.acta.acuerdo2}
              onChange={(e) =>
                setRegistroActual({
                  ...registroActual,
                  acta: { ...registroActual.acta, acuerdo2: e.target.value }
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
            <input
              placeholder="3.- Tercer acuerdo..."
              value={registroActual.acta.acuerdo3}
              onChange={(e) =>
                setRegistroActual({
                  ...registroActual,
                  acta: { ...registroActual.acta, acuerdo3: e.target.value }
                })
              }
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-[#575656] mb-1">
                Firma de Conformidad - Contratista
              </label>
              <input
                placeholder="Nombre / Firma Contratista"
                value={registroActual.acta.contratistaFirma}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    acta: { ...registroActual.acta, contratistaFirma: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#575656] mb-1">
                Firma de Conformidad - Encargado de Banco
              </label>
              <input
                placeholder="Nombre / Firma Encargado Banco"
                value={registroActual.acta.encargadoBancoFirma}
                onChange={(e) =>
                  setRegistroActual({
                    ...registroActual,
                    acta: { ...registroActual.acta, encargadoBancoFirma: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}