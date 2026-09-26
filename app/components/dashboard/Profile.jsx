"use client";

import TopBar from "./TopBar";
import Card from "./Card";
import AssetsUploader from "./AssetsUploader";
import Identity from "./Identity";
import "./Profile.css";

export default function Profile() {
  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Profile" saved />

      <div className="dash-profile-body">
        <Card className="dash-profile-section">
          <div className="dash-card__eyebrow">ASSETS</div>
          <h3 className="dash-profile-section__title">Assets Uploader</h3>
          <AssetsUploader />
        </Card>

        <Card className="dash-profile-section">
          <div className="dash-card__eyebrow">IDENTITY</div>
          <h3 className="dash-profile-section__title">Identity</h3>
          <Identity />
        </Card>
      </div>
    </div>
  );
}