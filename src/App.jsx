import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  ChefHat,
  Plus,
  Trash2,
  Wallet,
  ShoppingBasket,
  CalendarDays,
  Tag,
  Link2,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from "lucide-react";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MEALS = [
  { key: "pagi", label: "Pagi" },
  { key: "siang", label: "Siang" },
  { key: "malam", label: "Malam" },
];
const CATEGORIES = ["Sayur", "Buah", "Protein", "Bumbu", "Sembako", "Lainnya"];
const CAT_COLOR = {
  Sayur: "#4C7A4B",
  Buah: "#8B4B8C",
  Protein: "#C1440E",
  Bumbu: "#E0A72E",
  Sembako: "#7A5C3E",
  Lainnya: "#8A7F6D",
};

function emptyMeal() {
  return { title: "", ingredients: [] };
}
function emptyMenu() {
  const m = {};
  DAYS.forEach((d) => {
    m[d] = { pagi: emptyMeal(), siang: emptyMeal(), malam: emptyMeal() };
  });
  return m;
}
// migrate old string-based menu entries into { title, ingredients }
function normalizeMenu(raw) {
  const out = emptyMenu();
  DAYS.forEach((d) => {
    MEALS.forEach(({ key }) => {
      const v = raw?.[d]?.[key];
      if (typeof v === "string") out[d][key] = { title: v, ingredients: [] };
      else if (v && typeof v === "object")
        out[d][key] = { title: v.title || "", ingredients: Array.isArray(v.ingredients) ? v.ingredients : [] };
    });
  });
  return out;
}

function formatRp(n) {
  const v = Number(n) || 0;
  return "Rp" + v.toLocaleString("id-ID");
}

// --- week/date helpers ---
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay(); // 0 = Sun ... 6 = Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d;
}
function shortDate(d) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function weekRangeLabel(mondayISO) {
  const start = addDays(mondayISO, 0);
  const end = addDays(mondayISO, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("id-ID", { day: "numeric", month: sameMonth ? undefined : "short" });
  const endStr = end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function useFonts() {
  useEffect(() => {
    const id = "dapur-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Karla:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function DapurTracker() {
  useFonts();

  const [tab, setTab] = useState("menu");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  const [menusByWeek, setMenusByWeek] = useState({});
  const [budget, setBudget] = useState(500000);
  const [items, setItems] = useState([]);
  const [weekStart, setWeekStart] = useState(toISODate(mondayOf(new Date())));

  const loaded = useRef(false);

  const menu = menusByWeek[weekStart] || emptyMenu();

  useEffect(() => {
    try {
      const mwRaw = localStorage.getItem("menus-by-week");
      const legacyRaw = localStorage.getItem("weekly-menu");
      const bRaw = localStorage.getItem("weekly-budget");
      const itRaw = localStorage.getItem("shopping-items");
      const wsRaw = localStorage.getItem("week-start");

      let initialWeekStart = toISODate(mondayOf(new Date()));
      if (wsRaw) {
        try {
          const val = JSON.parse(wsRaw);
          if (val) initialWeekStart = val;
        } catch {}
      }

      if (mwRaw) {
        try {
          const parsed = JSON.parse(mwRaw);
          const normalized = {};
          Object.keys(parsed).forEach((wk) => {
            normalized[wk] = normalizeMenu(parsed[wk]);
          });
          setMenusByWeek(normalized);
        } catch {}
      } else if (legacyRaw) {
        try {
          const parsedLegacy = normalizeMenu(JSON.parse(legacyRaw));
          setMenusByWeek({ [initialWeekStart]: parsedLegacy });
        } catch {}
      }

      setWeekStart(initialWeekStart);

      if (bRaw) {
        try {
          setBudget(JSON.parse(bRaw));
        } catch {}
      }
      if (itRaw) {
        try {
          setItems(JSON.parse(itRaw));
        } catch {}
      }
    } catch (e) {
      // fine on first run
    } finally {
      setLoading(false);
      loaded.current = true;
    }
  }, []);

  function persist(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaveError("");
    } catch (e) {
      setSaveError("Gagal menyimpan. Coba lagi.");
    }
  }

  useEffect(() => {
    if (!loaded.current) return;
    persist("menus-by-week", menusByWeek);
  }, [menusByWeek]);

  useEffect(() => {
    if (!loaded.current) return;
    persist("weekly-budget", budget);
  }, [budget]);

  useEffect(() => {
    if (!loaded.current) return;
    persist("shopping-items", items);
  }, [items]);

  useEffect(() => {
    if (!loaded.current) return;
    persist("week-start", weekStart);
  }, [weekStart]);

  function shiftWeek(delta) {
    setWeekStart((prev) => toISODate(addDays(prev, delta * 7)));
  }
  function goToday() {
    setWeekStart(toISODate(mondayOf(new Date())));
  }

  function exportToExcel() {
    const byId = Object.fromEntries(items.map((it) => [it.id, it]));
    const namesOf = (ids) => (ids || []).map((id) => byId[id]?.name).filter(Boolean).join(", ");

    // Sheet 1: Menu Mingguan
    const menuRows = [["Hari", "Tanggal", "Pagi", "Bahan Pagi", "Siang", "Bahan Siang", "Malam", "Bahan Malam"]];
    DAYS.forEach((day, i) => {
      const dateObj = addDays(weekStart, i);
      const m = menu[day] || emptyMenu()[day];
      menuRows.push([
        day,
        shortDate(dateObj),
        m.pagi?.title || "",
        namesOf(m.pagi?.ingredients),
        m.siang?.title || "",
        namesOf(m.siang?.ingredients),
        m.malam?.title || "",
        namesOf(m.malam?.ingredients),
      ]);
    });

    // usage map for stock sheet
    const usage = {};
    DAYS.forEach((day) => {
      MEALS.forEach(({ key, label }) => {
        const meal = menu[day]?.[key];
        (meal?.ingredients || []).forEach((id) => {
          if (!usage[id]) usage[id] = [];
          usage[id].push(`${day} (${label})`);
        });
      });
    });

    // Sheet 2: Stok & Belanjaan
    const stokRows = [["Nama", "Kategori", "Jumlah", "Satuan", "Harga (Rp)", "Dipakai di"]];
    items.forEach((it) => {
      stokRows.push([it.name, it.category, it.qty, it.unit, Number(it.price) || 0, (usage[it.id] || []).join(", ")]);
    });

    // Sheet 3: Ringkasan Anggaran
    const total = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
    const ringkasanRows = [
      ["Anggaran Minggu Ini (Rp)", budget],
      ["Total Terpakai (Rp)", total],
      ["Sisa / Lebih (Rp)", budget - total],
      ["Periode", weekRangeLabel(weekStart)],
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(menuRows), "Menu Mingguan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stokRows), "Stok & Belanjaan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasanRows), "Ringkasan");
    XLSX.writeFile(wb, `dapur-ku_${weekStart}.xlsx`);
  }

  const total = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const remaining = budget - total;
  const pct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;

  function updateMealTitle(day, mealKey, title) {
    setMenusByWeek((prev) => {
      const weekMenu = prev[weekStart] || emptyMenu();
      return {
        ...prev,
        [weekStart]: {
          ...weekMenu,
          [day]: { ...weekMenu[day], [mealKey]: { ...weekMenu[day][mealKey], title } },
        },
      };
    });
  }

  function toggleIngredient(day, mealKey, itemId) {
    setMenusByWeek((prev) => {
      const weekMenu = prev[weekStart] || emptyMenu();
      const meal = weekMenu[day][mealKey];
      const has = meal.ingredients.includes(itemId);
      const ingredients = has
        ? meal.ingredients.filter((id) => id !== itemId)
        : [...meal.ingredients, itemId];
      return {
        ...prev,
        [weekStart]: {
          ...weekMenu,
          [day]: { ...weekMenu[day], [mealKey]: { ...meal, ingredients } },
        },
      };
    });
  }

  function addItem(newItem) {
    setItems((prev) => [
      { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...newItem },
      ...prev,
    ]);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function resetWeek() {
    if (window.confirm("Kosongkan daftar belanja minggu ini? Menu tidak akan terhapus.")) {
      setItems([]);
    }
  }

  const fraunces = { fontFamily: "'Fraunces', serif" };
  const karla = { fontFamily: "'Karla', sans-serif" };
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  if (loading) {
    return (
      <div
        style={{ ...karla, background: "#FAF6ED", minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <div className="text-center" style={{ color: "#2B2118" }}>
          <ChefHat className="mx-auto mb-2 animate-pulse" size={32} />
          <p>Membuka dapur…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...karla, background: "#FAF6ED", minHeight: "100vh", color: "#2B2118" }}>
      <style>{`
        * { box-sizing: border-box; }
        .tab-btn { transition: all .15s ease; }
        input, textarea, select { font-family: inherit; }
        input:focus, textarea:focus, select:focus { outline: 2px solid #E0A72E; outline-offset: 1px; }
        ::placeholder { color: #A99B82; }
        .scrollx::-webkit-scrollbar { display: none; }
        .chip-btn { transition: transform .1s ease; }
        .chip-btn:active { transform: scale(0.96); }
      `}</style>

      <header style={{ background: "#2B2118", borderBottom: "3px solid #E0A72E" }} className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" style={{ color: "#FAF6ED" }}>
            <ChefHat size={22} style={{ color: "#E0A72E" }} />
            <h1 style={{ ...fraunces, fontWeight: 600, fontSize: "1.4rem" }}>Dapur Ku</h1>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5"
            style={{
              background: "#E0A72E",
              color: "#2B2118",
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 8,
            }}
          >
            <FileDown size={14} /> Excel
          </button>
        </div>
        <p style={{ color: "#C9BBA0", fontSize: "0.8rem", marginTop: "2px" }}>
          Menu mingguan, stok, dan uang belanja — dalam satu buku catatan.
        </p>
      </header>

      <nav className="flex px-3 pt-3 gap-1 scrollx" style={{ overflowX: "auto" }}>
        {[
          { key: "menu", label: "Menu Mingguan", icon: CalendarDays },
          { key: "belanja", label: "Belanja & Stok", icon: ShoppingBasket },
        ].map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="tab-btn flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap"
              style={{
                ...fraunces,
                fontWeight: 600,
                fontSize: "0.9rem",
                background: active ? "#FAF6ED" : "#EDE4CD",
                color: active ? "#C1440E" : "#7A6B4F",
                borderRadius: "10px 10px 0 0",
                border: active ? "2px solid #DDD0B0" : "2px solid transparent",
                borderBottom: active ? "2px solid #FAF6ED" : "none",
                marginBottom: active ? "-2px" : "0",
                position: "relative",
                zIndex: active ? 2 : 1,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <main
        style={{
          border: "2px solid #DDD0B0",
          borderRadius: "0 10px 10px 10px",
          margin: "0 12px 24px 12px",
          background: "#FAF6ED",
          padding: "18px 16px 28px",
        }}
      >
        {saveError && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2"
            style={{ background: "#FBEAE0", color: "#C1440E", borderRadius: 8, fontSize: "0.82rem" }}
          >
            {saveError}
          </div>
        )}

        {tab === "menu" ? (
          <MenuView
            menu={menu}
            items={items}
            updateMealTitle={updateMealTitle}
            toggleIngredient={toggleIngredient}
            fraunces={fraunces}
            mono={mono}
            weekStart={weekStart}
            shiftWeek={shiftWeek}
            goToday={goToday}
          />
        ) : (
          <BelanjaView
            items={items}
            menu={menu}
            addItem={addItem}
            removeItem={removeItem}
            budget={budget}
            setBudget={setBudget}
            total={total}
            remaining={remaining}
            pct={pct}
            resetWeek={resetWeek}
            fraunces={fraunces}
            mono={mono}
          />
        )}
      </main>
    </div>
  );
}

function MenuView({ menu, items, updateMealTitle, toggleIngredient, fraunces, mono, weekStart, shiftWeek, goToday }) {
  const [openPicker, setOpenPicker] = useState(null); // "day|mealKey" or null

  const byId = Object.fromEntries(items.map((it) => [it.id, it]));
  const todayISO = toISODate(new Date());

  return (
    <div className="flex flex-col gap-3">
      {/* week navigator */}
      <div
        className="flex items-center justify-between px-2 py-2"
        style={{ background: "#F1E8D2", border: "1px solid #DDD0B0", borderRadius: 10 }}
      >
        <button onClick={() => shiftWeek(-1)} style={{ padding: 6, color: "#7A6B4F" }} aria-label="Minggu lalu">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span style={{ ...fraunces, fontWeight: 600, fontSize: "0.92rem", color: "#5B4A2F" }}>
            {weekRangeLabel(weekStart)}
          </span>
          <button onClick={goToday} style={{ fontSize: "0.68rem", color: "#A05A2C", textDecoration: "underline", marginTop: 1 }}>
            minggu ini
          </button>
        </div>
        <button onClick={() => shiftWeek(1)} style={{ padding: 6, color: "#7A6B4F" }} aria-label="Minggu depan">
          <ChevronRight size={18} />
        </button>
      </div>

      {DAYS.map((day, dayIdx) => {
        const dateObj = addDays(weekStart, dayIdx);
        const isToday = toISODate(dateObj) === todayISO;
        return (
        <div
          key={day}
          style={{
            border: isToday ? "1px solid #C1440E" : "1px solid #DDD0B0",
            borderRadius: 10,
            overflow: "hidden",
            background: "#FFFDF8",
          }}
        >
          <div
            className="flex items-baseline justify-between"
            style={{ background: isToday ? "#F6E2D3" : "#F1E8D2", padding: "8px 12px", borderBottom: "1px solid #DDD0B0" }}
          >
            <span style={{ ...fraunces, fontWeight: 600, fontSize: "0.95rem", color: "#5B4A2F" }}>{day}</span>
            <span style={{ ...mono, fontSize: "0.72rem", color: isToday ? "#C1440E" : "#A08A5F", fontWeight: isToday ? 700 : 400 }}>
              {shortDate(dateObj)}
              {isToday ? " · hari ini" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1">
            {MEALS.map((meal, i) => {
              const cellKey = `${day}|${meal.key}`;
              const data = menu[day]?.[meal.key] || emptyMeal();
              const isOpen = openPicker === cellKey;
              return (
                <div
                  key={meal.key}
                  className="px-3 py-2.5"
                  style={{ borderTop: i === 0 ? "none" : "1px dashed #E4DAC3" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      style={{
                        width: 52,
                        flexShrink: 0,
                        fontSize: "0.72rem",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "#4C7A4B",
                        fontWeight: 700,
                        paddingTop: 6,
                      }}
                    >
                      {meal.label}
                    </span>
                    <input
                      value={data.title}
                      onChange={(e) => updateMealTitle(day, meal.key, e.target.value)}
                      placeholder="Belum diisi…"
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        fontSize: "0.9rem",
                        color: "#2B2118",
                        padding: "5px 2px",
                      }}
                    />
                  </div>

                  {/* selected ingredient chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1" style={{ paddingLeft: 52 }}>
                    {data.ingredients.map((id) => {
                      const it = byId[id];
                      if (!it) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => toggleIngredient(day, meal.key, id)}
                          className="chip-btn flex items-center gap-1"
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 8px 2px 6px",
                            borderRadius: 999,
                            background: "#FAF6ED",
                            border: `1px solid ${CAT_COLOR[it.category] || "#DDD0B0"}`,
                            color: "#5B4A2F",
                          }}
                          title="Klik untuk hapus"
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: CAT_COLOR[it.category] || "#8A7F6D",
                              display: "inline-block",
                            }}
                          />
                          {it.name}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setOpenPicker(isOpen ? null : cellKey)}
                      className="chip-btn flex items-center gap-1"
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isOpen ? "#E0A72E" : "#F1E8D2",
                        color: isOpen ? "#2B2118" : "#7A6B4F",
                        border: "1px solid #DDD0B0",
                      }}
                    >
                      <Link2 size={11} />
                      {isOpen ? "Selesai" : "Kaitkan bahan"}
                    </button>
                  </div>

                  {/* ingredient picker */}
                  {isOpen && (
                    <div
                      className="mt-2"
                      style={{
                        marginLeft: 52,
                        background: "#F8F2E1",
                        border: "1px solid #DDD0B0",
                        borderRadius: 8,
                        padding: "8px 10px",
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      {items.length === 0 ? (
                        <p style={{ fontSize: "0.78rem", color: "#A99B82" }}>
                          Belum ada bahan di stok. Tambahkan dulu di tab Belanja & Stok.
                        </p>
                      ) : (
                        CATEGORIES.map((cat) => {
                          const catItems = items.filter((it) => it.category === cat);
                          if (catItems.length === 0) return null;
                          return (
                            <div key={cat} className="mb-2">
                              <div
                                style={{
                                  fontSize: "0.68rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  color: CAT_COLOR[cat],
                                  fontWeight: 700,
                                  marginBottom: 3,
                                }}
                              >
                                {cat}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {catItems.map((it) => {
                                  const checked = data.ingredients.includes(it.id);
                                  return (
                                    <button
                                      key={it.id}
                                      onClick={() => toggleIngredient(day, meal.key, it.id)}
                                      className="chip-btn"
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "3px 9px",
                                        borderRadius: 999,
                                        background: checked ? CAT_COLOR[cat] : "#FFFDF8",
                                        color: checked ? "#FFFDF8" : "#5B4A2F",
                                        border: `1px solid ${CAT_COLOR[cat]}`,
                                      }}
                                    >
                                      {it.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function BelanjaView({
  items,
  menu,
  addItem,
  removeItem,
  budget,
  setBudget,
  total,
  remaining,
  pct,
  resetWeek,
  fraunces,
  mono,
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [budgetInput, setBudgetInput] = useState(String(budget));

  useEffect(() => setBudgetInput(String(budget)), [budget]);

  // build usage map: itemId -> [{day, mealLabel}]
  const usage = {};
  DAYS.forEach((day) => {
    MEALS.forEach(({ key, label }) => {
      const meal = menu[day]?.[key];
      if (!meal) return;
      (meal.ingredients || []).forEach((id) => {
        if (!usage[id]) usage[id] = [];
        usage[id].push(`${day} (${label})`);
      });
    });
  });

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    addItem({
      name: name.trim(),
      qty: qty.trim(),
      unit: unit.trim(),
      price: Number(price) || 0,
      category: cat,
    });
    setName("");
    setQty("");
    setUnit("");
    setPrice("");
  }

  const overBudget = remaining < 0;
  const jarColor = overBudget ? "#C1440E" : pct > 80 ? "#E0A72E" : "#4C7A4B";

  return (
    <div className="flex flex-col gap-5">
      <div style={{ border: "1px solid #DDD0B0", borderRadius: 10, background: "#FFFDF8", padding: "14px 14px 16px" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5" style={{ color: "#5B4A2F" }}>
            <Wallet size={16} />
            <span style={{ ...fraunces, fontWeight: 600, fontSize: "0.95rem" }}>Anggaran Minggu Ini</span>
          </div>
          <button onClick={resetWeek} style={{ fontSize: "0.75rem", color: "#A05A2C", textDecoration: "underline" }}>
            Reset minggu
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span style={{ ...mono, fontSize: "0.85rem", color: "#7A6B4F" }}>Rp</span>
          <input
            type="number"
            inputMode="numeric"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            onBlur={() => setBudget(Number(budgetInput) || 0)}
            style={{ ...mono, fontSize: "0.95rem", border: "1px solid #DDD0B0", borderRadius: 6, padding: "5px 8px", width: 130, background: "#fff" }}
          />
          <span style={{ fontSize: "0.75rem", color: "#A99B82" }}>per minggu</span>
        </div>

        <div style={{ height: 14, borderRadius: 7, background: "#F1E8D2", border: "1px solid #DDD0B0", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: jarColor, transition: "width .3s ease" }} />
        </div>

        <div className="flex justify-between mt-2" style={{ fontSize: "0.82rem" }}>
          <span style={mono}>
            Terpakai <strong>{formatRp(total)}</strong>
          </span>
          <span style={{ ...mono, color: overBudget ? "#C1440E" : "#4C7A4B", fontWeight: 700 }}>
            {overBudget ? "Lebih " : "Sisa "}
            {formatRp(Math.abs(remaining))}
          </span>
        </div>
      </div>

      <form onSubmit={submit} style={{ border: "1px solid #DDD0B0", borderRadius: 10, background: "#FFFDF8", padding: "14px" }} className="flex flex-col gap-2">
        <span style={{ ...fraunces, fontWeight: 600, fontSize: "0.95rem", color: "#5B4A2F" }}>Tambah Bahan</span>
        <input placeholder="Nama bahan (mis. bawang merah)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <div className="flex gap-2">
          <input placeholder="Jumlah" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder="Satuan (kg, ikat…)" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div className="flex gap-2">
          <input type="number" inputMode="numeric" placeholder="Harga (Rp)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5"
          style={{ background: "#4C7A4B", color: "#FAF6ED", borderRadius: 8, padding: "9px 0", fontWeight: 600, fontSize: "0.88rem", marginTop: 4 }}
        >
          <Plus size={16} /> Tambah ke stok
        </button>
      </form>

      <div>
        <span style={{ ...fraunces, fontWeight: 600, fontSize: "0.95rem", color: "#5B4A2F" }}>Stok & Belanjaan ({items.length})</span>
        {items.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#A99B82", marginTop: 8 }}>Belum ada bahan yang dicatat minggu ini.</p>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {items.map((it) => {
              const used = usage[it.id] || [];
              return (
                <div
                  key={it.id}
                  className="px-3 py-2.5"
                  style={{ background: "#FFFDF8", border: "1px solid #DDD0B0", borderLeft: `4px solid ${CAT_COLOR[it.category] || "#8A7F6D"}`, borderRadius: 8 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{it.name}</span>
                        <span style={{ fontSize: "0.72rem", color: "#A99B82" }}>{it.category}</span>
                      </div>
                      <div style={{ ...mono, fontSize: "0.78rem", color: "#7A6B4F" }}>
                        {it.qty} {it.unit} {it.price ? `· ${formatRp(it.price)}` : ""}
                      </div>
                    </div>
                    <button onClick={() => removeItem(it.id)} style={{ color: "#C1440E", flexShrink: 0 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {used.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5" style={{ fontSize: "0.72rem", color: "#4C7A4B" }}>
                      <Tag size={11} />
                      <span>Dipakai di: {used.join(", ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid #DDD0B0",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: "0.87rem",
  background: "#fff",
  width: "100%",
};
