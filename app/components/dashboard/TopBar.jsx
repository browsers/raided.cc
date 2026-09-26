"use client";

import "./TopBar.css";

export default function TopBar({ breadcrumb, title, saved = true, onSave = () => {} }) {
  return (
    <div className="dash-topbar">
      <div>
        <div className="dash-topbar__breadcrumb">{breadcrumb}</div>
        <h1 className="dash-topbar__title">{title}</h1>
      </div>
      <div className="dash-topbar__actions">
        <span className="dash-topbar__saved">
          {saved ? "ALL CHANGES SAVED" : "UNSAVED CHANGES"}
        </span>
        <button
          type="button"
          className="dash-save-btn"
          onClick={onSave}
          disabled={saved}
        >
          Save
        </button>
      </div>
    </div>
  );
}