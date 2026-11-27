import { useState } from "react";
import { ArrowUp, ArrowDown, RotateCcw, Check } from "lucide-react";
import { WorkspacePreferences, MainTabId } from "../types/mhmed";
import { buildNavTabs, DEFAULT_TAB_ORDER, NAV_ICON_OPTIONS } from "./navIcons";

export default function NavigationSettings({ workspace, onChange }: {
  workspace: WorkspacePreferences;
  onChange: (patch: Partial<WorkspacePreferences>) => void;
}) {
  const [picking, setPicking] = useState<MainTabId | null>(null);
  const tabs = buildNavTabs({ order: workspace.navOrder, iconOverrides: workspace.navIcons });
  function move(index: number, delta: number) {
    const order = tabs.map((t) => t.id);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    onChange({ navOrder: order });
  }
  return <div className="mh-edit-subsection">
    <h4 className="mh-small-head">تخصيص القائمة ومكانها وأيقوناتها</h4>
    <p className="mh-help-text">التغييرات فورية وتُحفظ تلقائيًا. استخدم الأسهم لترتيب الأقسام. على الهاتف تظهر القائمة كدرج جانبي.</p>
    <div className="mh-nav-position" role="group" aria-label="مكان القائمة">
      {([['right', 'يمين'], ['left', 'يسار'], ['top', 'أعلى']] as const).map(([id, label]) =>
        <button type="button" key={id} className={`mh-choice-pill ${workspace.navPosition === id ? 'active' : ''}`}
          aria-pressed={workspace.navPosition === id} onClick={() => onChange({ navPosition: id })}>{label}</button>)}
      <button type="button" className="mh-choice-pill" onClick={() => {
        onChange({ navOrder: [...DEFAULT_TAB_ORDER], navIcons: {}, navPosition: 'right' });
        setPicking(null);
      }}><RotateCcw size={14} /> استعادة القائمة الأصلية</button>
    </div>
    <ol className="mh-nav-editor">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return <li key={tab.id}>
          <div className="mh-nav-editor-row">
            <Icon size={20} /><span>{tab.label}</span>
            <button type="button" title={`نقل ${tab.label} لأعلى`} aria-label={`نقل ${tab.label} لأعلى`}
              disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button type="button" title={`نقل ${tab.label} لأسفل`} aria-label={`نقل ${tab.label} لأسفل`}
              disabled={index === tabs.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button type="button" className="mh-icon-select" aria-expanded={picking === tab.id}
              onClick={() => setPicking(picking === tab.id ? null : tab.id)}>تغيير الأيقونة</button>
          </div>
          {picking === tab.id && <div className="mh-nav-icon-grid" role="group" aria-label={`أيقونة ${tab.label}`}>
            {NAV_ICON_OPTIONS.map(({ name, label, icon: OptionIcon }) => <button type="button" key={name}
              title={label} aria-label={label} aria-pressed={tab.iconName === name}
              className={tab.iconName === name ? 'active' : ''} onClick={() => {
                onChange({ navIcons: { ...workspace.navIcons, [tab.id]: name } }); setPicking(null);
              }}><OptionIcon size={20} />{tab.iconName === name && <Check size={10} />}</button>)}
          </div>}
        </li>;
      })}
    </ol>
  </div>;
}
