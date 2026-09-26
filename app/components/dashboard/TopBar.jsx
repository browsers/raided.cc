"use client";

import "./TopBar.css";

export default function TopBar({ breadcrumb, title }) {
  return (
    <div className="dash-topbar">
      <div>
        <div className="dash-topbar__breadcrumb">{breadcrumb}</div>
        <h1 className="dash-topbar__title">{title}</h1>
      </div>
    </div>
  );
}