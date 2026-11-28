import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { dateKey, getMakkahTime, getMonthCells, getShiftStatus, shiftMonth } from "../services/workCalendar";

const WEEKDAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
const numbers = new Intl.NumberFormat("ar-SA");
const dateFormat = new Intl.DateTimeFormat("ar-SA", { calendar: "gregory", timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const monthFormat = new Intl.DateTimeFormat("ar-SA", { calendar: "gregory", timeZone: "UTC", month: "long", year: "numeric" });
function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${numbers.format(hours)} س` : "", rest ? `${numbers.format(rest)} د` : ""].filter(Boolean).join(" و ");
}

export default function WorkCalendar() {
  const [now, setNow] = useState(getMakkahTime);
  const [month, setMonth] = useState(() => ({ year: now.year, month: now.month }));
  const [selected, setSelected] = useState(() => ({ year: now.year, month: now.month, day: now.day }));
  useEffect(() => {
    const refresh = () => setNow(getMakkahTime());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const status = getShiftStatus(now.minutes);
  const selectedIsToday = dateKey(selected) === dateKey(now);
  const selectedLabel = dateFormat.format(new Date(Date.UTC(selected.year, selected.month, selected.day)));
  function navigate(delta: number) {
    const next = shiftMonth(month.year, month.month, delta);
    setMonth(next); setSelected({ ...next, day: 1 });
  }
  return <section className="mh-work-calendar" aria-label="تقويم الشهر ودوام الحرم" dir="rtl">
    <div className="mh-calendar-title"><div><small>تقويمك ودوامك</small><h2>{monthFormat.format(new Date(Date.UTC(month.year, month.month, 1)))}</h2></div>
      <div className="mh-calendar-controls">
        <button type="button" onClick={() => navigate(-1)} aria-label="الشهر السابق"><ChevronRight size={17} /></button>
        <button type="button" onClick={() => { const today = getMakkahTime(); setNow(today); setMonth({ year: today.year, month: today.month }); setSelected(today); }}>اليوم</button>
        <button type="button" onClick={() => navigate(1)} aria-label="الشهر التالي"><ChevronLeft size={17} /></button>
      </div>
    </div>
    <div className="mh-month-grid" role="group" aria-label="أيام الشهر">
      {WEEKDAYS.map((day) => <span key={day} className="mh-weekday">{day}</span>)}
      {getMonthCells(month.year, month.month).map((day, index) => {
        if (day === null) return <span key={`empty-${index}`} aria-hidden="true" />;
        const date = { ...month, day };
        const isToday = dateKey(date) === dateKey(now);
        const active = dateKey(date) === dateKey(selected);
        return <button key={day} type="button" className={`${isToday ? "today" : ""} ${active ? "selected" : ""}`}
          aria-current={isToday ? "date" : undefined} aria-pressed={active}
          aria-label={dateFormat.format(new Date(Date.UTC(month.year, month.month, day)))} onClick={() => setSelected(date)}>
          {numbers.format(day)}{isToday && <i aria-hidden="true" />}
        </button>;
      })}
    </div>
    <div className="mh-calendar-shift">
      <div className="mh-shift-place"><b><MapPin size={14} /> دوام الحرم</b><span>٨ ساعات</span></div>
      <div className="mh-shift-hours"><Clock3 size={15} /><strong>٩:٠٠ ص — ٥:٠٠ م</strong><small>بتوقيت مكة</small></div>
      <small className="mh-selected-date">{selectedIsToday ? "اليوم · " : ""}{selectedLabel}</small>
      {selectedIsToday ? <>
        <div className="mh-shift-progress" role="progressbar" aria-label="انقضاء وقت دوام اليوم" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.progress)}><span style={{ width: `${status.progress}%` }} /></div>
        <p className={`mh-shift-status ${status.phase}`}>
          {status.phase === "before" ? `باقي ${duration(status.remaining)} على بداية الدوام` : status.phase === "during" ? `وقت الدوام · باقي ${duration(status.remaining)}` : "انتهى وقت الدوام اليوم"}
        </p>
      </> : <p className="mh-shift-status">موعد الدوام المحدد: ٩ صباحًا إلى ٥ مساءً</p>}
      <small className="mh-calendar-note">الموعد اليومي دون احتساب إجازات؛ أيام راحتك لم تُحدَّد بعد.</small>
    </div>
  </section>;
}
