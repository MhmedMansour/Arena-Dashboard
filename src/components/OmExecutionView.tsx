import { useState, useMemo } from "react";
import {
  Zap,
  Wrench,
  Flame,
  Network,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Trash2,
  ClipboardList,
  MapPin,
  X,
} from "lucide-react";
import {
  OmPriority,
  OmStatus,
  OmSystemType,
  OmWorkOrder,
  OmWorkType,
} from "../types/mhmed";

interface OmExecutionViewProps {
  workOrders: OmWorkOrder[];
  onChangeWorkOrders: (next: OmWorkOrder[]) => void;
  onNotify: (msg: string) => void;
}

const SYSTEMS: OmSystemType[] = [
  "كهرباء (Electrical)",
  "ميكانيكا وتكييف (HVAC / Mechanical)",
  "سباكة ومكافحة حريق (Plumbing & FF)",
  "شبكات واتصالات (ELV & Network)",
];

const WORK_TYPES: OmWorkType[] = [
  "تشغيل وصيانة وقائية (PM)",
  "صيانة تصحيحية (CM)",
  "إشراف تنفيذ (Execution)",
  "فحص واستلام (Inspection)",
];

const STATUSES: OmStatus[] = [
  "جاري التنفيذ",
  "مجدول",
  "بانتظار الاعتماد",
  "مكتمل",
];

const PRIORITIES: OmPriority[] = ["عاجل", "مرتفع", "متوسط", "منخفض"];

function SystemIcon({ system }: { system: OmSystemType }) {
  if (system.startsWith("كهرباء")) return <Zap size={17} />;
  if (system.startsWith("ميكانيكا")) return <Wrench size={17} />;
  if (system.startsWith("سباكة")) return <Flame size={17} />;
  return <Network size={17} />;
}

export default function OmExecutionView({
  workOrders,
  onChangeWorkOrders,
  onNotify,
}: OmExecutionViewProps) {
  const [sysFilter, setSysFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workOrders.filter((w) => {
      if (sysFilter !== "all" && w.system !== sysFilter) return false;
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (
        q &&
        !`${w.code} ${w.title} ${w.site} ${w.maximoRef || ""} ${w.notes}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [workOrders, sysFilter, statusFilter, query]);

  const kpis = useMemo(() => {
    const electrical = workOrders.filter((w) => w.system.startsWith("كهرباء")).length;
    const mechanical = workOrders.filter((w) => w.system.startsWith("ميكانيكا")).length;
    const active = workOrders.filter((w) => w.status !== "مكتمل").length;
    const done = workOrders.filter((w) => w.status === "مكتمل").length;
    return { electrical, mechanical, active, done };
  }, [workOrders]);

  function cycleStatus(order: OmWorkOrder) {
    const idx = STATUSES.indexOf(order.status);
    const nextStatus = STATUSES[(idx + 1) % STATUSES.length];
    onChangeWorkOrders(
      workOrders.map((w) => (w.id === order.id ? { ...w, status: nextStatus } : w))
    );
    onNotify(`تم تحديث حالة ${order.code} إلى: ${nextStatus}`);
  }

  function deleteOrder(id: string) {
    onChangeWorkOrders(workOrders.filter((w) => w.id !== id));
    onNotify("تم حذف أمر العمل");
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const system = String(f.get("system")) as OmSystemType;
    const prefix = system.startsWith("كهرباء")
      ? "ELC"
      : system.startsWith("ميكانيكا")
        ? "MEP"
        : system.startsWith("سباكة")
          ? "FF"
          : "NET";
    const num = String(workOrders.length + 101).slice(-3);
    const newOrder: OmWorkOrder = {
      id: "wo-" + Date.now(),
      code: `WO-${prefix}-2026-${num}`,
      title: String(f.get("title")).trim(),
      system,
      workType: String(f.get("workType")) as OmWorkType,
      site: String(f.get("site")).trim(),
      priority: String(f.get("priority")) as OmPriority,
      status: String(f.get("status")) as OmStatus,
      maximoRef: String(f.get("maximoRef") || "").trim() || undefined,
      dueDate: String(f.get("dueDate")) || new Date().toISOString().slice(0, 10),
      notes: String(f.get("notes") || "").trim(),
    };
    onChangeWorkOrders([newOrder, ...workOrders]);
    setShowAdd(false);
    onNotify(`تمت إضافة أمر العمل ${newOrder.code}`);
  }

  return (
    <div className="mh-stack">
      <div className="heading" style={{ marginTop: 4 }}>
        <div>
          <small className="eyebrow">MEP O&M & EXECUTION SUPERVISION · MAXIMO</small>
          <h2>إشراف التشغيل والصيانة وتنفيذ الكهرباء والميكانيكا</h2>
        </div>
        <button
          type="button"
          className="primary mh-btn-nomargin"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} /> أمر عمل / متابعة جديدة
        </button>
      </div>

      {/* KPI Strip */}
      <div className="stats" style={{ marginTop: 0 }}>
        <button type="button" onClick={() => setSysFilter("كهرباء (Electrical)")}>
          <i className="c3">
            <Zap />
          </i>
          <div>
            <strong>{String(kpis.electrical).padStart(2, "0")}</strong>
            <small>أعمال كهرباء (Electrical)</small>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSysFilter("ميكانيكا وتكييف (HVAC / Mechanical)")}
        >
          <i className="c1">
            <Wrench />
          </i>
          <div>
            <strong>{String(kpis.mechanical).padStart(2, "0")}</strong>
            <small>ميكانيكا وتكييف (HVAC)</small>
          </div>
        </button>
        <button type="button" onClick={() => setStatusFilter("جاري التنفيذ")}>
          <i className="c0">
            <Clock />
          </i>
          <div>
            <strong>{String(kpis.active).padStart(2, "0")}</strong>
            <small>أوامر عمل نشطة</small>
          </div>
        </button>
        <button type="button" onClick={() => setStatusFilter("مكتمل")}>
          <i className="c2">
            <CheckCircle2 />
          </i>
          <div>
            <strong>{String(kpis.done).padStart(2, "0")}</strong>
            <small>مهام مكتملة ومستلمة</small>
          </div>
        </button>
      </div>

      {/* Filters */}
      <section className="mh-panel" style={{ padding: 14 }}>
        <div className="mh-om-filters">
          <div className="search" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <Search size={16} />
            <input
              placeholder="ابحث بالكود، الموقع، رقم Maximo أو الوصف..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="mh-select"
            value={sysFilter}
            onChange={(e) => setSysFilter(e.target.value)}
          >
            <option value="all">كل الأنظمة (كهرباء وميكانيكا)</option>
            {SYSTEMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="mh-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(sysFilter !== "all" || statusFilter !== "all" || query) && (
            <button
              type="button"
              className="sa-reset-btn"
              onClick={() => {
                setSysFilter("all");
                setStatusFilter("all");
                setQuery("");
              }}
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </section>

      {/* Work Orders List */}
      <div className="mh-stack-sm">
        {filtered.length === 0 ? (
          <div className="mh-panel sa-empty-state">
            <ClipboardList size={28} className="sa-copper-icon" />
            <p className="empty">لا توجد أوامر عمل مطابقة للفلتر الحالي.</p>
          </div>
        ) : (
          filtered.map((wo) => (
            <div key={wo.id} className="mh-panel mh-wo-card">
              <div className="mh-wo-icon">
                <SystemIcon system={wo.system} />
              </div>
              <div className="mh-wo-body">
                <div className="mh-wo-top">
                  <span className="mh-pill accent" dir="ltr">
                    {wo.code}
                  </span>
                  {wo.maximoRef && (
                    <span className="mh-pill" dir="ltr">
                      Maximo: {wo.maximoRef}
                    </span>
                  )}
                  <span className="mh-pill">{wo.workType}</span>
                  <span
                    className={`mh-pill ${
                      wo.priority === "عاجل"
                        ? "danger"
                        : wo.priority === "مرتفع"
                          ? "accent"
                          : ""
                    }`}
                  >
                    {wo.priority === "عاجل" && <AlertTriangle size={11} />}
                    {wo.priority}
                  </span>
                </div>
                <h3>{wo.title}</h3>
                <div className="mh-wo-meta">
                  <span>
                    <MapPin size={13} /> {wo.site}
                  </span>
                  <span>· {wo.system}</span>
                  <span>· الاستحقاق: {wo.dueDate}</span>
                </div>
                {wo.notes && <p className="mh-wo-notes">{wo.notes}</p>}
              </div>
              <div className="mh-wo-actions">
                <button
                  type="button"
                  className={`mh-status-btn ${wo.status === "مكتمل" ? "done" : ""}`}
                  onClick={() => cycleStatus(wo)}
                  title="اضغط لتبديل الحالة"
                >
                  {wo.status}
                </button>
                <button
                  type="button"
                  className="sa-del-folder"
                  onClick={() => deleteOrder(wo.id)}
                  title="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Work Order Modal */}
      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <section
            className="dialog sa-wide-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="close" onClick={() => setShowAdd(false)}>
              <X />
            </button>
            <h2>إضافة أمر عمل — تشغيل وصيانة أو تنفيذ MEP</h2>
            <form onSubmit={handleCreate}>
              <div className="mh-form-grid">
                <label className="mh-span-2">
                  عنوان العمل / المهمة الهندسية
                  <input
                    name="title"
                    required
                    placeholder="مثال: فحص لوحة توزيع MDB أو استلام مجاري التكييف..."
                  />
                </label>
                <label>
                  التخصص / النظام
                  <select name="system" defaultValue={SYSTEMS[0]}>
                    {SYSTEMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  نوع العمل
                  <select name="workType" defaultValue={WORK_TYPES[0]}>
                    {WORK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الموقع / المشروع
                  <input
                    name="site"
                    required
                    placeholder="مثال: مستشفى الملك فيصل — الرياض"
                  />
                </label>
                <label>
                  مرجع Maximo (اختياري)
                  <input name="maximoRef" dir="ltr" placeholder="MX-88520" />
                </label>
                <label>
                  الأولوية
                  <select name="priority" defaultValue="مرتفع">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الحالة
                  <select name="status" defaultValue="جاري التنفيذ">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  تاريخ الاستحقاق
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label className="mh-span-2">
                  ملاحظات فنية وميدانية
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="تفاصيل الفحص، القياسات المطلوبة، أو ربطها بمخطط AutoCAD / Revit..."
                  />
                </label>
              </div>
              <button className="primary">حفظ أمر العمل</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
