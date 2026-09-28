"use client";

import Card from "./Card";
import "./TopBar.css";
import "./Embed.css";

// Layout only — nothing on this page is wired up yet. Inputs use
// defaultValue (uncontrolled) and the buttons have no handlers, so this
// just renders the final structure for us to hook up later.
const PLACEHOLDER = {
  siteName: "RAIDED.CC",
  title: "die",
  description: "Your description goes here",
  accent: "#2b2d31",
};

export default function Embed() {
  return (
    <div className="dash-embed-shell">
      {/* Header: breadcrumb + title on the left, save state + button on the right */}
      <div className="dash-embed-header">
        <div>
          <div className="dash-topbar__breadcrumb">RAIDED.CC / EDIT</div>
          <h1 className="dash-topbar__title">Embed</h1>
        </div>

        <div className="dash-embed-save">
          <span className="dash-embed-save__status">All changes saved</span>
          <button type="button" className="dash-embed-save__btn">
            Save
          </button>
        </div>
      </div>

      <div className="dash-embed-body">
        {/* Left: editor */}
        <Card className="dash-embed-panel">
          <div className="dash-card__eyebrow">EMBED</div>
          <h3 className="dash-embed-panel__title">Share Preview</h3>

          <div className="embed-field">
            <span className="embed-field__label">Title</span>
            <input
              type="text"
              className="embed-input"
              defaultValue={PLACEHOLDER.title}
            />
          </div>

          <div className="embed-field">
            <span className="embed-field__label">Description</span>
            <textarea
              className="embed-textarea"
              defaultValue={PLACEHOLDER.description}
              rows={4}
            />
          </div>

          <div className="embed-row">
            <div className="embed-field embed-field--grow">
              <span className="embed-field__label">Accent Color</span>
              <div className="embed-color">
                <span
                  className="embed-color__swatch"
                  style={{ background: PLACEHOLDER.accent }}
                />
                <input
                  type="text"
                  className="embed-input"
                  defaultValue={PLACEHOLDER.accent}
                />
              </div>
            </div>

            <div className="embed-field">
              <span className="embed-field__label">Image Layout</span>
              <div className="embed-toggle">
                <button type="button" className="embed-toggle__btn">
                  Small
                </button>
                <button
                  type="button"
                  className="embed-toggle__btn embed-toggle__btn--active"
                >
                  Large
                </button>
              </div>
            </div>
          </div>

          <div className="embed-image-tile" role="button" tabIndex={0}>
            <button
              type="button"
              className="embed-image-tile__clear"
              aria-label="Remove embed image"
            >
              X
            </button>
            <div className="embed-image-tile__body">
              <span className="embed-image-tile__label">Embed Image</span>
              <span className="embed-image-tile__hint">Click to replace image</span>
            </div>
          </div>
        </Card>

        {/* Right: live preview */}
        <Card className="dash-embed-panel">
          <div className="dash-card__eyebrow">PREVIEW</div>
          <h3 className="dash-embed-panel__title">Social Embed</h3>

          <div className="embed-preview">
            <div className="embed-preview__image" />
            <div className="embed-preview__footer">
              <span
                className="embed-preview__bar"
                style={{ background: PLACEHOLDER.accent }}
              />
              <div className="embed-preview__text">
                <div className="embed-preview__site">{PLACEHOLDER.siteName}</div>
                <div className="embed-preview__title">{PLACEHOLDER.title}</div>
                <div className="embed-preview__desc">{PLACEHOLDER.description}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
