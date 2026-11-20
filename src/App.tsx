import { useState, useEffect, useRef } from "react";
import {
  DraftingCompass,
  LayoutDashboard,
  FolderKanban,
  Files,
  Images,
  Wrench,
  Award,
  FolderArchive,
  ChevronLeft,
  Plus,
  Upload,
  CalendarDays,
  HardDrive,
  Layers,
  MapPin,
  Menu,
  X,
  Download,
  Search,
  FileText,
  Check,
} from "lucide-react";
import SmartArchiveView from "./components/SmartArchiveView";
import { archiveStorage } from "./services/archiveStorage";

const tabs = [
  "نظرة عامة",
  "المشاريع",
  "مكتبة الملفات",
  "عينات الأعمال",
  "التشغيل والصيانة",
  "الشهادات",
  "الأرشيف الذكي",
];

const icons = [
  LayoutDashboard,
  FolderKanban,
  Files,
  Images,
  Wrench,
  Award,
  FolderArchive,
];

const seed = [
  ["مجمع النخيل السكني", "الرياض", "AutoCAD", 65, 1],
  ["فيلا الياسمين", "جدة", "Revit", 40, 2],
  ["صيانة مبنى الإدارة", "الدمام", "صيانة", 80, 3],
].map(([name, city, type, progress, art], i) => ({
  name: String(name),
  city: String(city),
  type: String(type),
  progress: Number(progress),
  art: Number(art),
  id: String(i),
}));

type P = (typeof seed)[number];
type F = {
  id: string;
  name: string;
  cat: string;
  project: string;
  size: number;
  date: number;
  art?: number;
};

const samples: F[] = seed.map((p, i) => ({
  id: "s" + i,
  name: ["المسقط الأفقي", "المنظور المعماري", "مخطط الخدمات"][i] + ".svg",
  cat: "عينات الأعمال",
  project: p.id,
  size: 0,
  date: 0,
  art: p.art,
}));

const db = new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("mimar-files", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

export default function App() {
  const [tab, T] = useState(0);
  const [projects, Pset] = useState<P[]>(
    () => JSON.parse(localStorage.getItem("mimar-projects") || "null") || seed
  );
  const [files, Fset] = useState<F[]>(samples);
  const [smartArchiveCount, setSmartArchiveCount] = useState(0);
  const [modal, M] = useState("");
  const [pid, Pid] = useState("");
  const [q, Q] = useState("");
  const [mobile, B] = useState(false);
  const [msg, S] = useState("");
  const [busy, U] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const project = projects.find((p) => p.id === pid);

  useEffect(() => {
    db.then((d) => {
      const r = d.transaction("files").objectStore("files").getAll();
      r.onsuccess = () =>
        Fset([...r.result.map(({ blob: _blob, ...m }) => m).reverse(), ...samples]);
    }).catch(() => S("تعذر فتح التخزين المحلي"));

    archiveStorage
      .listMetadata()
      .then((list) => setSmartArchiveCount(list.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => S(""), 4000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  function nav(i: number) {
    T(i);
    Q("");
    M("");
    B(false);
  }

  function save(p: P[]) {
    localStorage.setItem("mimar-projects", JSON.stringify(p));
    Pset(p);
  }

  async function download(f: F) {
    let href = `./art/${f.art}.svg`;
    if (!f.art) {
      const d = await db;
      const r = d.transaction("files").objectStore("files").get(f.id);
      const item: { blob: Blob } = await new Promise(
        (ok) => (r.onsuccess = () => ok(r.result))
      );
      href = URL.createObjectURL(item.blob);
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = f.name;
    a.click();
    if (!f.art) setTimeout(() => URL.revokeObjectURL(href), 3000);
  }

  const rows = (list: F[]) =>
    list.length ? (
      list.map((f) => (
        <div className="row" key={f.id}>
          <span className="fileicon">
            <FileText />
          </span>
          <div>
            <b>{f.name}</b>
            <small>{projects.find((p) => p.id === f.project)?.name || f.cat}</small>
          </div>
          <label>{f.name.split(".").pop()?.toUpperCase()}</label>
          <button title="تنزيل الملف" onClick={() => download(f)}>
            <Download size={17} />
          </button>
        </div>
      ))
    ) : (
      <p className="empty">لا توجد ملفات هنا بعد.</p>
    );

  const stat = [
    projects.filter((p) => p.progress < 100).length,
    files.length + smartArchiveCount,
    files.filter((f) => f.cat === tabs[3]).length,
    files.filter((f) => f.cat === tabs[5]).length,
  ];

  return (
    <>
      <aside className={mobile ? "open" : ""}>
        <div className="brand">
          <i>
            <DraftingCompass size={30} />
          </i>
          <div>
            <strong>مِعمار</strong>
            <small>مساحة العمل الهندسية</small>
          </div>
        </div>
        <small className="navtitle">مساحة العمل</small>
        {tabs.map((t, i) => {
          const I = icons[i];
          return (
            <button
              key={t}
              className={"nav " + (tab === i ? "active" : "")}
              onClick={() => nav(i)}
            >
              <I size={19} />
              {t}
            </button>
          );
        })}
        <div className="local">
          <HardDrive size={18} /> تخزين محلي <em>IndexedDB</em>
          <small>محفوظ على هذا الجهاز فقط دون مزامنة بين الأجهزة</small>
        </div>
      </aside>

      <main>
        <header>
          <button className="menu" onClick={() => B(!mobile)}>
            <Menu />
          </button>
          <span>مساحة العمل</span>
          <ChevronLeft size={14} />
          <b>{tabs[tab]}</b>
          <div className="date">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("ar-EG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="avatar">م</div>
        </header>

        <article>
          {tab === 0 ? (
            <>
              <section className="hero">
                <figure className="blueprint">
                  <b>FIG. 01 / ISOMETRIC STUDY</b>
                  <img
                    src="./art/0.svg"
                    alt="رسم معماري بمنظور متساوي القياس"
                  />
                  <figcaption>
                    AXONOMETRIC VIEW <span>1 : 200</span>
                  </figcaption>
                </figure>
                <div>
                  <label>● &nbsp; مساحة العمل الشخصية</label>
                  <h1>لوحة التحكم الهندسية</h1>
                  <p>مشاريعك، ملفاتك وخبراتك المهنية في مكان واحد.</p>
                  <div className="actions">
                    <button className="cream" onClick={() => M("new")}>
                      <Plus /> مشروع جديد
                    </button>
                    <button
                      className="outline"
                      onClick={() => {
                        Pid("");
                        M("upload");
                      }}
                    >
                      <Upload /> رفع ملفات
                    </button>
                    <button className="outline" onClick={() => nav(6)}>
                      <FolderArchive /> الأرشيف الذكي
                    </button>
                  </div>
                </div>
              </section>
              <div className="stats">
                {stat.map((n, i) => {
                  const I = [FolderKanban, Files, Images, Award][i];
                  return (
                    <button key={i} onClick={() => nav([1, 2, 3, 5][i])}>
                      <i className={"c" + i}>
                        <I />
                      </i>
                      <div>
                        <strong>{String(n).padStart(2, "0")}</strong>
                        <small>
                          {
                            [
                              "مشاريع جارية",
                              "إجمالي الملفات",
                              "عينات الأعمال",
                              "الشهادات",
                            ][i]
                          }
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {(tab <= 1 || tab === 4) && (
            <>
              <div className="heading">
                <div>
                  <small className="eyebrow">PROJECT INDEX</small>
                  <h2>
                    {tab === 4
                      ? tabs[4]
                      : tab === 1
                        ? "فهرس المشاريع"
                        : "المشاريع الحالية"}
                  </h2>
                </div>
                <button onClick={() => (tab === 0 ? nav(1) : M("new"))}>
                  {tab === 0 ? "عرض كل المشاريع" : "مشروع جديد"}
                  <ChevronLeft size={15} />
                </button>
              </div>
              <div className="cards">
                {projects
                  .filter((p) =>
                    tab === 4
                      ? p.type === "صيانة"
                      : tab === 0
                        ? p.progress < 100
                        : true
                  )
                  .slice(0, tab === 0 ? 3 : undefined)
                  .map((p) => (
                    <button
                      key={p.id}
                      className="card"
                      onClick={() => {
                        Pid(p.id);
                        M("detail");
                      }}
                    >
                      <div
                        className="drawing"
                        style={{ backgroundImage: `url(./art/${p.art}.svg)` }}
                      >
                        <label>
                          ● &nbsp; {p.progress === 100 ? "مكتمل" : "قيد التنفيذ"}
                        </label>
                      </div>
                      <div className="cardbody">
                        <small className="tech">
                          <Layers size={13} />
                          {p.type}
                        </small>
                        <h3>{p.name}</h3>
                        <small>
                          <MapPin size={13} />
                          {p.city}
                        </small>
                        <div className="progress">
                          <span>نسبة الإنجاز</span>
                          <b>{p.progress}%</b>
                        </div>
                        <div className="track">
                          <i style={{ width: p.progress + "%" }} />
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}

          {(tab === 0 || (tab >= 2 && tab <= 5)) && (
            <>
              <div className="heading">
                <div>
                  <small className="eyebrow">FILE ARCHIVE</small>
                  <h2>
                    {tab === 0
                      ? "أحدث الملفات"
                      : tab === 4
                        ? "ملفات المواقع"
                        : tabs[tab]}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (!tab) nav(2);
                    else {
                      Pid("");
                      M("upload");
                    }
                  }}
                >
                  {tab === 0 ? "عرض المكتبة" : "رفع ملفات"}{" "}
                  <ChevronLeft size={15} />
                </button>
              </div>
              {tab > 0 && (
                <div className="search">
                  <Search size={17} />
                  <input
                    placeholder="ابحث باسم الملف…"
                    value={q}
                    onChange={(e) => Q(e.target.value)}
                  />
                </div>
              )}
              <div className="list">
                {rows(
                  files
                    .filter(
                      (f) =>
                        (tab < 3 ||
                          f.cat === tabs[tab] ||
                          (tab === 4 &&
                            projects.some(
                              (p) => p.type === "صيانة" && p.id === f.project
                            ))) &&
                        f.name.includes(q)
                    )
                    .slice(0, tab === 0 ? 4 : undefined)
                )}
              </div>
            </>
          )}

          {tab === 6 && (
            <SmartArchiveView
              projects={projects}
              onNotify={S}
              onArchiveCountChange={setSmartArchiveCount}
            />
          )}
        </article>
      </main>

      {modal && (
        <div className="overlay">
          <section className="dialog" role="dialog">
            <button className="close" onClick={() => !busy && M("")}>
              <X />
            </button>
            <h2>
              {modal === "new"
                ? "مشروع جديد"
                : modal === "upload"
                  ? "رفع ملفات"
                  : project?.name}
            </h2>
            {modal === "new" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const type = String(f.get("type"));
                  save([
                    {
                      id: crypto.randomUUID(),
                      name: String(f.get("name")),
                      city: String(f.get("city")),
                      type,
                      art: type === "Revit" ? 2 : type === "صيانة" ? 3 : 1,
                      progress: 0,
                    },
                    ...projects,
                  ]);
                  M("");
                  S("تمت إضافة المشروع");
                }}
              >
                <label>
                  اسم المشروع
                  <input name="name" required />
                </label>
                <label>
                  الموقع
                  <input name="city" required />
                </label>
                <label>
                  نوع المشروع
                  <select
                    name="type"
                    defaultValue={tab === 4 ? "صيانة" : "AutoCAD"}
                  >
                    <option>AutoCAD</option>
                    <option>Revit</option>
                    <option>صيانة</option>
                  </select>
                </label>
                <button className="primary">إضافة المشروع</button>
              </form>
            ) : modal === "upload" ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  U(true);
                  try {
                    const d = await db;
                    for (const blob of Array.from(input.current!.files || [])) {
                      const m = {
                        id: crypto.randomUUID(),
                        name: blob.name,
                        date: Date.now(),
                        size: blob.size,
                        cat: String(data.get("cat")),
                        project: String(data.get("pid")),
                      };
                      await new Promise((ok, no) => {
                        const t = d.transaction("files", "readwrite");
                        t.objectStore("files").put({ ...m, blob });
                        t.oncomplete = () => ok(true);
                        t.onabort = () => no(t.error);
                      });
                      Fset((prev) => [m, ...prev]);
                    }
                    M("");
                    S("تم حفظ الملفات على جهازك");
                  } catch {
                    S("تعذر الحفظ. تحقق من مساحة التخزين المتاحة.");
                  } finally {
                    U(false);
                  }
                }}
              >
                <p>كل الصيغ مدعومة، حسب المساحة المتاحة في متصفحك.</p>
                <input ref={input} type="file" multiple required />
                <label>
                  التصنيف
                  <select
                    name="cat"
                    defaultValue={tabs[Math.min(5, Math.max(2, tab))]}
                  >
                    {tabs.slice(2, 6).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  المشروع
                  <select name="pid" defaultValue={pid}>
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? "جارٍ الحفظ…" : "حفظ الملفات"}
                </button>
              </form>
            ) : (
              project && (
                <>
                  <p>
                    {project.city} · {project.type}
                  </p>
                  <label>
                    نسبة الإنجاز — {project.progress}%
                    <input
                      type="range"
                      value={project.progress}
                      onChange={(e) =>
                        save(
                          projects.map((p) =>
                            p.id === pid
                              ? { ...p, progress: +e.target.value }
                              : p
                          )
                        )
                      }
                    />
                  </label>
                  <h3>ملفات المشروع</h3>
                  {rows(files.filter((f) => f.project === pid))}
                  <button className="primary" onClick={() => M("upload")}>
                    <Upload /> رفع ملفات للمشروع
                  </button>
                </>
              )
            )}
          </section>
        </div>
      )}

      {msg && (
        <div className="toast">
          <Check size={18} />
          {msg}
        </div>
      )}
    </>
  );
}
