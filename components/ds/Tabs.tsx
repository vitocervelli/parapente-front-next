"use client";

import { useState, type ReactNode } from "react";

type Props = {
  tabs: string[];
  panels: ReactNode[];
};

export function Tabs({ tabs, panels }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div className="pbv-tabs">
      <div className="pbv-tabs__list" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={i === active}
            className={`pbv-tabs__tab${i === active ? " pbv-tabs__tab--on" : ""}`}
            onClick={() => setActive(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="pbv-tabs__panel">{panels[active]}</div>
    </div>
  );
}
