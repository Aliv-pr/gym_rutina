import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Dumbbell,
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Search,
  Download,
  Upload,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  X,
  Settings,
  Pencil,
  ListPlus,
} from "lucide-react";

/* =========================================================================
   DATA — edit this section to add exercises / muscle groups
   ========================================================================= */

const MUSCLES = [
  "Pecho",
  "Dorsales",
  "Espalda alta",
  "hHombro",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Isquiotibiales",
  "Glúteos",
  "Pantorrillas",
  "Erectores",
];

const SEED_EXERCISES = [
  { id: "ex-sentadilla", name: "Sentadilla", priority: 10, function: "Dominante de rodilla", muscles: ["Cuádriceps", "Glúteos"] },
  { id: "ex-dominadas", name: "Dominadas", priority: 9, function: "Tirón vertical", muscles: ["Dorsales", "Bíceps"] },
  { id: "ex-press-inclinado", name: "Press inclinado", priority: 8, function: "Press principal", muscles: ["Pecho", "Hombro", "Tríceps"] },
  { id: "ex-peso-muerto-rumano", name: "Peso muerto rumano", priority: 7, function: "Bisagra", muscles: ["Isquiosurales", "Glúteos", "Erectores"] },
  { id: "ex-remo-t", name: "Remo en T", priority: 6, function: "Tirón horizontal", muscles: ["Espalda alta", "Dorsales", "Bíceps"] },
  { id: "ex-elev-laterales", name: "Elevaciones laterales", priority: 5, function: "Aislamiento de hombro", muscles: ["Hombro"] },
  { id: "ex-curl-predicador", name: "Curl predicador", priority: 4, function: "Bíceps", muscles: ["Bíceps"] },
  { id: "ex-ext-triceps", name: "Extensión de tríceps sobre cabeza", priority: 3, function: "Tríceps", muscles: ["Tríceps"] },
  { id: "ex-bulgaras", name: "Búlgaras", priority: 2, function: "Unilateral / cuádriceps", muscles: ["Cuádriceps", "Glúteos"] },
  { id: "ex-curl-femoral", name: "Curl femoral sentado", priority: 1, function: "Flexión de rodilla", muscles: ["Isquiosurales"] },
  { id: "ex-fly-maquina", name: "Fly en máquina", priority: null, function: "Pecho", muscles: ["Pecho"] },
  { id: "ex-hip-thrust", name: "Hip thrust", priority: null, function: "Extensión de cadera / glúteo", muscles: ["Glúteos"] },
  { id: "ex-elev-talon", name: "Elevaciones de talón", priority: null, function: "Pantorrilla", muscles: ["Pantorrillas"] },
];

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};
const DAY_LABELS_SHORT = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

const STORAGE_KEY = "rutinas-fuerza-v1";

const defaultState = () => ({
  exercises: SEED_EXERCISES,
  days: [],
  schedule: DAY_KEYS.reduce((acc, k) => ({ ...acc, [k]: null }), {}),
  volumeRanges: { low: 8, moderate: 16 },
});

const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* =========================================================================
   VOLUME CALCULATIONS
   ========================================================================= */

function emptyMuscleMap() {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0]));
}

function volumeFromExerciseList(workoutExercises, exercises) {
  const map = emptyMuscleMap();
  (workoutExercises || []).forEach((we) => {
    const ex = exercises.find((e) => e.id === we.exerciseId);
    if (!ex) return;
    ex.muscles.forEach((m) => {
      if (map[m] === undefined) map[m] = 0;
      map[m] += Number(we.sets || 0);
    });
  });
  return map;
}

function volumeForDay(day, exercises) {
  return volumeFromExerciseList(day ? day.exercises : [], exercises);
}

function volumeForWeek(schedule, days, exercises) {
  const map = emptyMuscleMap();
  DAY_KEYS.forEach((k) => {
    const dayId = schedule[k];
    if (!dayId) return;
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    const dayMap = volumeForDay(day, exercises);
    MUSCLES.forEach((m) => {
      map[m] += dayMap[m] || 0;
    });
  });
  return map;
}

function volumeTier(value, ranges) {
  if (value <= 0) return { label: "Sin volumen", color: "#5B5F68" };
  if (value <= ranges.low) return { label: "Bajo", color: "#6FCF97" };
  if (value <= ranges.moderate) return { label: "Moderado", color: "#E3B23C" };
  return { label: "Alto", color: "#E4572E" };
}

/* =========================================================================
   PERSISTENCE — localStorage (per-browser, private)
   ========================================================================= */

function useAppState() {
  const [state, setState] = useState(defaultState());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...defaultState(), ...parsed, volumeRanges: { ...defaultState().volumeRanges, ...(parsed.volumeRanges || {}) } });
      }
    } catch (e) {
      // no hay datos guardados todavía — se usa el estado por defecto
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setError(null);
      } catch (e) {
        setError("No se pudieron guardar los datos.");
      }
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded]);

  return [state, setState, loaded, error];
}

/* =========================================================================
   SMALL UI PRIMITIVES
   ========================================================================= */

function PriorityBadge({ priority }) {
  if (priority === null || priority === undefined) {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3A3F47] text-[11px] font-mono text-[#6C7178]">
        —
      </span>
    );
  }
  const tier = priority >= 8 ? "high" : priority >= 4 ? "mid" : "low";
  const styles = {
    high: "bg-[#E3B23C] text-[#1A1B1E] border-[#E3B23C]",
    mid: "bg-transparent text-[#E3B23C] border-[#E3B23C]",
    low: "bg-transparent text-[#8A8F98] border-[#3A3F47]",
  };
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold ${styles[tier]}`}>
      {priority}
    </span>
  );
}

function MuscleChips({ muscles }) {
  return (
    <div className="flex flex-wrap gap-1">
      {muscles.map((m) => (
        <span key={m} className="rounded-sm bg-[#262A31] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#9A9EA6]">
          {m}
        </span>
      ))}
    </div>
  );
}

function VolumeBar({ label, value, ranges }) {
  const tier = volumeTier(value, ranges);
  const max = Math.max(ranges.moderate * 1.5, value, 4);
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 shrink-0 truncate text-[13px] text-[#C7CAD1] sm:w-36">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#24272D]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tier.color }} />
      </div>
      <div className="w-10 shrink-0 text-right font-mono text-[13px] text-[#EDEDEE]">{value}</div>
      <div className="hidden w-20 shrink-0 text-[11px] sm:block" style={{ color: tier.color }}>
        {tier.label}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-[#E3B23C] text-[#1A1B1E]" : "text-[#9A9EA6] hover:bg-[#22252B] hover:text-[#EDEDEE]"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

/* =========================================================================
   RADAR CHART
   ========================================================================= */

function MuscleRadar({ data }) {
  const maxVal = Math.max(4, ...data.map((d) => d.series));
  const domainMax = Math.ceil((maxVal * 1.25) / 4) * 4;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#2C3037" />
        <PolarAngleAxis dataKey="muscle" tick={{ fill: "#9A9EA6", fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, domainMax]} tick={{ fill: "#5B5F68", fontSize: 9 }} tickCount={4} />
        <Radar name="Series" dataKey="series" stroke="#E3B23C" fill="#E3B23C" fillOpacity={0.35} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: "#1D2025", border: "1px solid #2C3037", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "#EDEDEE" }}
          itemStyle={{ color: "#E3B23C" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* =========================================================================
   EXERCISE PICKER (search + sort by priority + custom exercise editor)
   ========================================================================= */

function ExercisePicker({ exercises, onAdd, onCreate, onClose }) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", priority: "", function: "", muscles: [] });
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;
    return [...list].sort((a, b) => {
      const pa = a.priority === null || a.priority === undefined ? -1 : a.priority;
      const pb = b.priority === null || b.priority === undefined ? -1 : b.priority;
      return pb - pa;
    });
  }, [exercises, query]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  const toggleMuscle = (m) => {
    setForm((f) => ({
      ...f,
      muscles: f.muscles.includes(m) ? f.muscles.filter((x) => x !== m) : [...f.muscles, m],
    }));
  };

  const submitCreate = () => {
    if (!form.name.trim() || form.muscles.length === 0) return;
    onCreate({
      name: form.name.trim(),
      priority: form.priority === "" ? null : Number(form.priority),
      function: form.function.trim() || "Personalizado",
      muscles: form.muscles,
    });
    setForm({ name: "", priority: "", function: "", muscles: [] });
    setShowCreate(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0B0D]/90 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full overflow-y-auto overscroll-contain rounded-t-xl border border-[#3A3F47] bg-[#1D2025] shadow-2xl [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:max-h-[85vh] sm:max-w-lg sm:rounded-xl"
        style={{ maxHeight: "88vh" }}
        ref={listRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2C3037] bg-[#1D2025] px-4 py-3">
          <h3 className="font-display text-lg tracking-wide text-[#EDEDEE]">Añadir ejercicio</h3>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-md border border-[#3A3F47] px-2.5 py-1.5 text-sm text-[#C7CAD1] hover:border-[#E4572E] hover:bg-[#3A1E1E] hover:text-[#E4572E]"
          >
            <X size={16} /> Cerrar
          </button>
        </div>

        <div className="border-b border-[#2C3037] p-3">
          <div className="flex items-center gap-2 rounded-md border border-[#2C3037] bg-[#14161A] px-3 py-2">
            <Search size={15} className="text-[#5B5F68]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-transparent text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68]"
            />
          </div>
        </div>

        <div className="px-2 py-2">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onAdd(ex.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-[#262A31]"
            >
              <PriorityBadge priority={ex.priority} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#EDEDEE]">{ex.name}</div>
                <div className="truncate text-xs text-[#8A8F98]">{ex.function}</div>
              </div>
              <Plus size={16} className="shrink-0 text-[#5B5F68]" />
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-sm text-[#5B5F68]">Sin resultados.</div>}
        </div>

        <div className="border-t border-[#2C3037] p-3">
          {!showCreate ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-[#3A3F47] py-2.5 text-sm text-[#9A9EA6] hover:border-[#E3B23C] hover:text-[#E3B23C]"
              >
                <ListPlus size={16} /> Agregar ejercicio personalizado
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-[#3A3F47] px-4 py-2.5 text-sm text-[#C7CAD1] hover:bg-[#262A31]"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre"
                  className="col-span-2 rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
                />
                <input
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="Prioridad"
                  className="rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
                />
              </div>
              <input
                value={form.function}
                onChange={(e) => setForm((f) => ({ ...f, function: e.target.value }))}
                placeholder="Función (ej. Press principal)"
                className="w-full rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
              />
              <div>
                <div className="mb-1.5 text-xs text-[#8A8F98]">Músculos trabajados</div>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLES.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMuscle(m)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        form.muscles.includes(m)
                          ? "border-[#E3B23C] bg-[#E3B23C] text-[#1A1B1E]"
                          : "border-[#3A3F47] text-[#9A9EA6] hover:border-[#5B5F68]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-md border border-[#2C3037] py-2 text-sm text-[#9A9EA6] hover:bg-[#262A31]"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitCreate}
                  disabled={!form.name.trim() || form.muscles.length === 0}
                  className="flex-1 rounded-md bg-[#E3B23C] py-2 text-sm font-medium text-[#1A1B1E] disabled:opacity-40"
                >
                  Crear y usar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   EXERCISE EDIT MODAL (rename / re-tag / delete a custom exercise)
   ========================================================================= */

function ExerciseEditModal({ exercise, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: exercise.name,
    priority: exercise.priority === null || exercise.priority === undefined ? "" : String(exercise.priority),
    function: exercise.function || "",
    muscles: exercise.muscles || [],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleMuscle = (m) => {
    setForm((f) => ({
      ...f,
      muscles: f.muscles.includes(m) ? f.muscles.filter((x) => x !== m) : [...f.muscles, m],
    }));
  };

  const submit = () => {
    if (!form.name.trim() || form.muscles.length === 0) return;
    onSave({
      name: form.name.trim(),
      priority: form.priority === "" ? null : Number(form.priority),
      function: form.function.trim() || "Personalizado",
      muscles: form.muscles,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0B0D]/90 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full overflow-y-auto overscroll-contain rounded-t-xl border border-[#3A3F47] bg-[#1D2025] shadow-2xl [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:max-h-[85vh] sm:max-w-lg sm:rounded-xl"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2C3037] bg-[#1D2025] px-4 py-3">
          <h3 className="font-display text-lg tracking-wide text-[#EDEDEE]">Editar ejercicio</h3>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-md border border-[#3A3F47] px-2.5 py-1.5 text-sm text-[#C7CAD1] hover:border-[#E4572E] hover:bg-[#3A1E1E] hover:text-[#E4572E]"
          >
            <X size={16} /> Cerrar
          </button>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre"
              className="col-span-2 rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
            />
            <input
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="Prioridad"
              className="rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
            />
          </div>
          <input
            value={form.function}
            onChange={(e) => setForm((f) => ({ ...f, function: e.target.value }))}
            placeholder="Función (ej. Press principal)"
            className="w-full rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none placeholder:text-[#5B5F68] focus:border-[#E3B23C]"
          />
          <div>
            <div className="mb-1.5 text-xs text-[#8A8F98]">Músculos trabajados</div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    form.muscles.includes(m)
                      ? "border-[#E3B23C] bg-[#E3B23C] text-[#1A1B1E]"
                      : "border-[#3A3F47] text-[#9A9EA6] hover:border-[#5B5F68]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {!confirmDelete ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[#3A1E1E] px-3 py-2 text-sm text-[#E4572E] hover:bg-[#3A1E1E]"
              >
                <Trash2 size={15} /> Eliminar
              </button>
              <button
                onClick={submit}
                disabled={!form.name.trim() || form.muscles.length === 0}
                className="flex-1 rounded-md bg-[#E3B23C] py-2 text-sm font-medium text-[#1A1B1E] disabled:opacity-40"
              >
                Guardar cambios
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-[#E4572E]/40 bg-[#3A1E1E]/40 p-2.5">
              <p className="text-xs text-[#F0B8AC]">
                Esto elimina "{exercise.name}" de todos los días donde aparece. ¿Confirmar?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-md border border-[#2C3037] py-1.5 text-sm text-[#9A9EA6] hover:bg-[#262A31]"
                >
                  Cancelar
                </button>
                <button onClick={onDelete} className="flex-1 rounded-md bg-[#E4572E] py-1.5 text-sm font-medium text-[#1A1B1E]">
                  Sí, eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   WORKOUT EXERCISE ROW (drag & drop reorder)
   ========================================================================= */

function ExerciseRow({ we, exercise, index, onUpdate, onRemove, onEditDefinition, onDeleteDefinition, onDragStart, onDragOver, onDrop, dragging }) {
  const [editing, setEditing] = useState(false);
  if (!exercise) return null;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`flex flex-col gap-2 rounded-lg border border-[#2C3037] bg-[#1D2025] p-3 transition-opacity sm:flex-row sm:items-center ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="cursor-grab text-[#4A4F58] active:cursor-grabbing">
          <GripVertical size={16} />
        </span>
        <PriorityBadge priority={exercise.priority} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[#EDEDEE]">{exercise.name}</div>
          <MuscleChips muscles={exercise.muscles} />
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
        <label className="flex items-center gap-1.5 text-[11px] text-[#8A8F98]">
          Series
          <input
            type="number"
            min={0}
            value={we.sets}
            onChange={(e) => onUpdate({ sets: Number(e.target.value) })}
            className="w-12 rounded-md border border-[#2C3037] bg-[#14161A] px-1.5 py-1 text-center font-mono text-sm text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[#8A8F98]">
          Reps
          <input
            type="number"
            min={0}
            value={we.repsMin}
            onChange={(e) => onUpdate({ repsMin: Number(e.target.value) })}
            className="w-11 rounded-md border border-[#2C3037] bg-[#14161A] px-1 py-1 text-center font-mono text-sm text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
          />
          <span className="text-[#4A4F58]">–</span>
          <input
            type="number"
            min={0}
            value={we.repsMax}
            onChange={(e) => onUpdate({ repsMax: Number(e.target.value) })}
            className="w-11 rounded-md border border-[#2C3037] bg-[#14161A] px-1 py-1 text-center font-mono text-sm text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[#8A8F98]">
          RIR
          <input
            type="text"
            value={we.rir}
            onChange={(e) => onUpdate({ rir: e.target.value })}
            placeholder="—"
            className="w-11 rounded-md border border-[#2C3037] bg-[#14161A] px-1 py-1 text-center font-mono text-sm text-[#EDEDEE] outline-none placeholder:text-[#4A4F58] focus:border-[#E3B23C]"
          />
        </label>
        <button
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-[#6C7178] hover:bg-[#262A31] hover:text-[#E3B23C]"
          title="Editar ejercicio"
        >
          <Pencil size={15} />
        </button>
        <button onClick={onRemove} className="rounded-md p-1.5 text-[#6C7178] hover:bg-[#3A1E1E] hover:text-[#E4572E]" title="Quitar de este día">
          <Trash2 size={15} />
        </button>
      </div>

      {editing && (
        <ExerciseEditModal
          exercise={exercise}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            onEditDefinition(patch);
            setEditing(false);
          }}
          onDelete={() => {
            onDeleteDefinition();
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   DAY EDITOR CARD
   ========================================================================= */

function DayCard({ day, exercises, onRename, onDuplicate, onDelete, onAddExercise, onRemoveExercise, onUpdateExercise, onEditExerciseDefinition, onDeleteExerciseDefinition, onReorder, expanded, onToggle }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(day.name);

  const totalSets = day.exercises.reduce((a, we) => a + Number(we.sets || 0), 0);

  const handleDragStart = (e, idx) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    onReorder(dragIndex, idx);
    setDragIndex(null);
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();
    onRename(trimmed || day.name);
    setEditingName(false);
  };

  return (
    <div className="rounded-xl border border-[#2C3037] bg-[#181A1F]">
      <div className="flex items-center justify-between gap-2 p-4">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#22252B] text-[#E3B23C]">
            <Dumbbell size={16} />
          </span>
          <div className="min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === "Enter" && commitName()}
                className="rounded border border-[#3A3F47] bg-[#14161A] px-2 py-1 font-display text-base tracking-wide text-[#EDEDEE] outline-none"
              />
            ) : (
              <h3 className="truncate font-display text-base tracking-wide text-[#EDEDEE]">{day.name}</h3>
            )}
            <p className="text-xs text-[#8A8F98]">
              {day.exercises.length} ejercicio{day.exercises.length !== 1 ? "s" : ""} · {totalSets} series
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNameDraft(day.name);
              setEditingName(true);
            }}
            className="rounded-md p-2 text-[#6C7178] hover:bg-[#262A31] hover:text-[#EDEDEE]"
            title="Editar nombre"
          >
            <Pencil size={15} />
          </button>
          <button onClick={onDuplicate} className="rounded-md p-2 text-[#6C7178] hover:bg-[#262A31] hover:text-[#EDEDEE]" title="Duplicar día">
            <Copy size={15} />
          </button>
          <button onClick={onDelete} className="rounded-md p-2 text-[#6C7178] hover:bg-[#3A1E1E] hover:text-[#E4572E]" title="Eliminar día">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-[#2C3037] p-4">
          {day.exercises.map((we, idx) => (
            <ExerciseRow
              key={we.id}
              we={we}
              index={idx}
              exercise={exercises.find((e) => e.id === we.exerciseId)}
              onUpdate={(patch) => onUpdateExercise(we.id, patch)}
              onRemove={() => onRemoveExercise(we.id)}
              onEditDefinition={(patch) => onEditExerciseDefinition(we.exerciseId, patch)}
              onDeleteDefinition={() => onDeleteExerciseDefinition(we.exerciseId)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragging={dragIndex === idx}
            />
          ))}
          {day.exercises.length === 0 && (
            <p className="rounded-lg border border-dashed border-[#2C3037] py-6 text-center text-sm text-[#5B5F68]">
              Todavía no hay ejercicios en este día.
            </p>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#3A3F47] py-2.5 text-sm text-[#9A9EA6] hover:border-[#E3B23C] hover:text-[#E3B23C]"
          >
            <Plus size={16} /> Añadir ejercicio
          </button>
        </div>
      )}

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onAdd={(exId) => onAddExercise(exId)}
          onCreate={(ex) => onAddExercise(null, ex)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   TABS: DASHBOARD / RUTINAS / SEMANA / ANÁLISIS
   ========================================================================= */

function DashboardTab({ state }) {
  const weekVolume = useMemo(() => volumeForWeek(state.schedule, state.days, state.exercises), [state]);
  const radarData = MUSCLES.map((m) => ({ muscle: m, series: weekVolume[m] || 0 }));
  const trainedDays = DAY_KEYS.filter((k) => state.schedule[k]).length;
  const totalExercises = state.days.reduce((a, d) => a + d.exercises.length, 0);
  const totalSets = state.days.reduce((a, d) => a + d.exercises.reduce((b, we) => b + Number(we.sets || 0), 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Días entrenados" value={trainedDays} />
        <StatCard label="Ejercicios" value={totalExercises} />
        <StatCard label="Series totales" value={totalSets} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
          <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-[#8A8F98]">Mi rutina</h3>
          {state.days.length === 0 && <EmptyHint text="Crea tu primer día en la pestaña Rutinas." />}
          <div className="space-y-2">
            {state.days.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-[#14161A] px-3 py-2">
                <span className="text-sm text-[#EDEDEE]">{d.name}</span>
                <span className="font-mono text-xs text-[#6C7178]">{d.exercises.length} ej.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
          <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-[#8A8F98]">Semana</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_KEYS.map((k) => {
              const day = state.days.find((d) => d.id === state.schedule[k]);
              return (
                <div key={k} className="flex flex-col items-center gap-1 rounded-lg bg-[#14161A] px-1 py-2 text-center">
                  <span className="text-[10px] uppercase text-[#5B5F68]">{DAY_LABELS_SHORT[k]}</span>
                  <span className={`text-[11px] font-medium leading-tight ${day ? "text-[#E3B23C]" : "text-[#4A4F58]"}`}>
                    {day ? day.name : "Descanso"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
        <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[#8A8F98]">Volumen semanal</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <MuscleRadar data={radarData} />
          <div className="flex flex-col justify-center">
            {radarData.map((d) => (
              <VolumeBar key={d.muscle} label={d.muscle} value={d.series} ranges={state.volumeRanges} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4 text-center">
      <div className="font-mono text-2xl font-semibold text-[#E3B23C]">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-[#8A8F98]">{label}</div>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#2C3037] py-6 text-center">
      <Dumbbell size={22} className="text-[#3A3F47]" />
      <p className="text-sm text-[#5B5F68]">{text}</p>
    </div>
  );
}

function RutinasTab({ state, handlers }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide text-[#EDEDEE]">Rutinas</h2>
        <button
          onClick={() => {
            const id = handlers.addDay();
            setExpandedId(id);
          }}
          className="flex items-center gap-1.5 rounded-md bg-[#E3B23C] px-3 py-2 text-sm font-medium text-[#1A1B1E] hover:brightness-95"
        >
          <Plus size={16} /> Nuevo día
        </button>
      </div>

      {state.days.length === 0 && <EmptyHint text="Todavía no has creado ningún día de entrenamiento." />}

      <div className="space-y-3">
        {state.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            exercises={state.exercises}
            expanded={expandedId === day.id}
            onToggle={() => setExpandedId(expandedId === day.id ? null : day.id)}
            onRename={(name) => handlers.renameDay(day.id, name)}
            onDuplicate={() => handlers.duplicateDay(day.id)}
            onDelete={() => handlers.removeDay(day.id)}
            onAddExercise={(exId, customEx) => handlers.addExerciseToDay(day.id, exId, customEx)}
            onRemoveExercise={(weId) => handlers.removeExerciseFromDay(day.id, weId)}
            onUpdateExercise={(weId, patch) => handlers.updateWorkoutExercise(day.id, weId, patch)}
            onEditExerciseDefinition={(exId, patch) => handlers.updateExerciseDefinition(exId, patch)}
            onDeleteExerciseDefinition={(exId) => handlers.deleteExerciseDefinition(exId)}
            onReorder={(from, to) => handlers.reorderExercises(day.id, from, to)}
          />
        ))}
      </div>
    </div>
  );
}

function SemanaTab({ state, handlers }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg tracking-wide text-[#EDEDEE]">Semana</h2>
      <p className="text-sm text-[#8A8F98]">Asigna una rutina a cada día de la semana, o déjalo en descanso.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {DAY_KEYS.map((k) => (
          <div key={k} className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-3.5">
            <div className="mb-2 font-display text-sm uppercase tracking-wide text-[#E3B23C]">{DAY_LABELS[k]}</div>
            <select
              value={state.schedule[k] || ""}
              onChange={(e) => handlers.setScheduleDay(k, e.target.value)}
              className="w-full rounded-md border border-[#2C3037] bg-[#14161A] px-2 py-2 text-sm text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
            >
              <option value="">Descanso</option>
              {state.days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalisisTab({ state, handlers }) {
  const [scope, setScope] = useState("week");
  const [showSettings, setShowSettings] = useState(false);

  const data = useMemo(() => {
    if (scope === "week") return volumeForWeek(state.schedule, state.days, state.exercises);
    const day = state.days.find((d) => d.id === scope);
    return volumeForDay(day, state.exercises);
  }, [scope, state]);

  const radarData = MUSCLES.map((m) => ({ muscle: m, series: data[m] || 0 }));
  const selectedDay = scope !== "week" ? state.days.find((d) => d.id === scope) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg tracking-wide text-[#EDEDEE]">Análisis</h2>
        <div className="flex items-center gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-md border border-[#2C3037] bg-[#14161A] px-2.5 py-2 text-sm text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
          >
            <option value="week">Semana completa</option>
            {state.days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-md border border-[#2C3037] p-2 text-[#9A9EA6] hover:bg-[#262A31]"
            title="Configurar rangos de volumen"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
          <span className="text-sm text-[#8A8F98]">Umbrales de volumen (series por músculo):</span>
          <label className="flex items-center gap-2 text-sm text-[#6FCF97]">
            Bajo hasta
            <input
              type="number"
              min={0}
              value={state.volumeRanges.low}
              onChange={(e) => handlers.updateVolumeRanges({ low: Number(e.target.value) })}
              className="w-16 rounded-md border border-[#2C3037] bg-[#14161A] px-2 py-1 text-center font-mono text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#E3B23C]">
            Moderado hasta
            <input
              type="number"
              min={0}
              value={state.volumeRanges.moderate}
              onChange={(e) => handlers.updateVolumeRanges({ moderate: Number(e.target.value) })}
              className="w-16 rounded-md border border-[#2C3037] bg-[#14161A] px-2 py-1 text-center font-mono text-[#EDEDEE] outline-none focus:border-[#E3B23C]"
            />
          </label>
          <span className="text-sm text-[#E4572E]">Alto en adelante</span>
        </div>
      )}

      {selectedDay && (
        <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
          <h3 className="mb-2 font-display text-base tracking-wide text-[#EDEDEE]">{selectedDay.name}</h3>
          <div className="space-y-1.5">
            {selectedDay.exercises.map((we) => {
              const ex = state.exercises.find((e) => e.id === we.exerciseId);
              if (!ex) return null;
              const reps = we.repsMin === we.repsMax ? we.repsMin : `${we.repsMin}–${we.repsMax}`;
              return (
                <div key={we.id} className="flex items-center justify-between rounded-md bg-[#14161A] px-3 py-2 text-sm">
                  <span className="text-[#EDEDEE]">{ex.name}</span>
                  <span className="font-mono text-[#8A8F98]">
                    {we.sets} × {reps}
                    {we.rir ? ` · RIR ${we.rir}` : ""}
                  </span>
                </div>
              );
            })}
            {selectedDay.exercises.length === 0 && <EmptyHint text="Este día no tiene ejercicios." />}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#2C3037] bg-[#181A1F] p-4">
        <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[#8A8F98]">Volumen muscular</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <MuscleRadar data={radarData} />
          <div className="flex flex-col justify-center">
            {radarData.map((d) => (
              <VolumeBar key={d.muscle} label={d.muscle} value={d.series} ranges={state.volumeRanges} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function App() {
  const [state, setState, loaded, saveError] = useAppState();
  const [tab, setTab] = useState("dashboard");
  const fileInputRef = useRef(null);

  const handlers = {
    addDay: () => {
      const id = uid("day");
      setState((s) => ({ ...s, days: [...s.days, { id, name: `Día ${s.days.length + 1}`, exercises: [] }] }));
      return id;
    },
    removeDay: (dayId) =>
      setState((s) => ({
        ...s,
        days: s.days.filter((d) => d.id !== dayId),
        schedule: Object.fromEntries(DAY_KEYS.map((k) => [k, s.schedule[k] === dayId ? null : s.schedule[k]])),
      })),
    duplicateDay: (dayId) =>
      setState((s) => {
        const day = s.days.find((d) => d.id === dayId);
        if (!day) return s;
        const copy = { id: uid("day"), name: `${day.name} (copia)`, exercises: day.exercises.map((we) => ({ ...we, id: uid("we") })) };
        const idx = s.days.findIndex((d) => d.id === dayId);
        const days = [...s.days];
        days.splice(idx + 1, 0, copy);
        return { ...s, days };
      }),
    renameDay: (dayId, name) => setState((s) => ({ ...s, days: s.days.map((d) => (d.id === dayId ? { ...d, name } : d)) })),
    addExerciseToDay: (dayId, exerciseId, customEx) =>
      setState((s) => {
        let exercises = s.exercises;
        let realId = exerciseId;
        if (!exerciseId && customEx) {
          realId = uid("ex");
          exercises = [...s.exercises, { ...customEx, id: realId }];
        }
        const days = s.days.map((d) =>
          d.id !== dayId
            ? d
            : {
                ...d,
                exercises: [
                  ...d.exercises,
                  { id: uid("we"), exerciseId: realId, sets: 3, repsMin: 8, repsMax: 12, rir: "", notes: "", order: d.exercises.length },
                ],
              }
        );
        return { ...s, exercises, days };
      }),
    removeExerciseFromDay: (dayId, weId) =>
      setState((s) => ({
        ...s,
        days: s.days.map((d) => (d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((we) => we.id !== weId) })),
      })),
    updateWorkoutExercise: (dayId, weId, patch) =>
      setState((s) => ({
        ...s,
        days: s.days.map((d) =>
          d.id !== dayId ? d : { ...d, exercises: d.exercises.map((we) => (we.id !== weId ? we : { ...we, ...patch })) }
        ),
      })),
    reorderExercises: (dayId, fromIdx, toIdx) =>
      setState((s) => ({
        ...s,
        days: s.days.map((d) => {
          if (d.id !== dayId) return d;
          const arr = [...d.exercises];
          const [moved] = arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, moved);
          return { ...d, exercises: arr };
        }),
      })),
    updateExerciseDefinition: (exerciseId, patch) =>
      setState((s) => ({
        ...s,
        exercises: s.exercises.map((e) => (e.id !== exerciseId ? e : { ...e, ...patch })),
      })),
    deleteExerciseDefinition: (exerciseId) =>
      setState((s) => ({
        ...s,
        exercises: s.exercises.filter((e) => e.id !== exerciseId),
        days: s.days.map((d) => ({ ...d, exercises: d.exercises.filter((we) => we.exerciseId !== exerciseId) })),
      })),
    setScheduleDay: (dayKey, workoutDayId) => setState((s) => ({ ...s, schedule: { ...s.schedule, [dayKey]: workoutDayId || null } })),
    updateVolumeRanges: (patch) => setState((s) => ({ ...s, volumeRanges: { ...s.volumeRanges, ...patch } })),
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rutinas-datos.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setState({ ...defaultState(), ...parsed, volumeRanges: { ...defaultState().volumeRanges, ...(parsed.volumeRanges || {}) } });
      } catch (err) {
        alert("El archivo no es un JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
    { id: "rutinas", label: "Rutinas", icon: Dumbbell },
    { id: "semana", label: "Semana", icon: CalendarDays },
    { id: "analisis", label: "Análisis", icon: BarChart3 },
  ];

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#14161A]">
        <div className="flex items-center gap-2 text-[#8A8F98]">
          <Dumbbell className="animate-pulse" size={20} />
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#14161A] pb-16 text-[#EDEDEE]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #2C3037; border-radius: 4px; }
        input:focus, select:focus, button:focus-visible { outline: none; }
        select { color-scheme: dark; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-[#2C3037] bg-[#14161A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E3B23C] text-[#1A1B1E]">
              <Dumbbell size={18} />
            </span>
            <div>
              <h1 className="font-display text-lg leading-tight tracking-wide">Rutinas</h1>
              <p className="text-[11px] leading-tight text-[#6C7178]">Entrenamiento de fuerza</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={exportData} className="rounded-md p-2 text-[#9A9EA6] hover:bg-[#22252B]" title="Exportar datos">
              <Download size={17} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-md p-2 text-[#9A9EA6] hover:bg-[#22252B]" title="Importar datos">
              <Upload size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files[0] && importData(e.target.files[0])}
            />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 pb-3">
          {tabs.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>
              {t.label}
            </TabButton>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {saveError && <div className="mb-4 rounded-md border border-[#E4572E]/40 bg-[#3A1E1E]/40 px-3 py-2 text-xs text-[#E4572E]">{saveError}</div>}
        {tab === "dashboard" && <DashboardTab state={state} />}
        {tab === "rutinas" && <RutinasTab state={state} handlers={handlers} />}
        {tab === "semana" && <SemanaTab state={state} handlers={handlers} />}
        {tab === "analisis" && <AnalisisTab state={state} handlers={handlers} />}
      </main>
    </div>
  );
}
