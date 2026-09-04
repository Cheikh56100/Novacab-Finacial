import React from "react";
export default function KpiCard({label,value,sub,tone=""}) {
  return <div className={`kpi ${tone}`}>
    <div className="kpiLabel">{label}</div>
    <div className="kpiValue">{value}</div>
    {sub && <div className="kpiSub">{sub}</div>}
  </div>;
}
