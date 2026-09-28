"use client";

import TopBar from "./TopBar";
import Card from "./Card";
import "./Profile.css";
import "./Embed.css";

// Layout only — nothing on this page is wired up yet (and no Save button:
// like the other tabs, this will auto-save once it's hooked up). Inputs use
// defaultValue (uncontrolled) and the buttons have no handlers, so this
// just renders the final structure for us to hook up later.
const PLACEHOLDER = {
  title: "die",
  description: "Your description goes here",
  accent: "#2b2d31",
  buttons: [
    { label: "Open page", url: "https://raided.cc/die" },
    { label: "Discord", url: "https://discord.gg/" },
  ],
};

// Small "opens a link" arrow used on the link buttons, same idea as
// Discord's own link buttons.
function ExternalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export default function Embed() {
  return (
    <div className="dash-profile-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Embed" />

      <div className="dash-profile-body">
        <div className="dash-embed-body">
          {/* Left: editor */}
          <Card className="dash-profile-section">
            <div className="dash-card__eyebrow">EMBED</div>
            <h3 className="dash-profile-section__title">Share Preview</h3>

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

            <div className="embed-buttons">
              <div className="embed-buttons__header">
                <span className="embed-field__label">Buttons</span>
                <button type="button" className="embed-buttons__add">
                  + Add button
                </button>
              </div>

              {PLACEHOLDER.buttons.map((b, i) => (
                <div className="embed-button-row" key={i}>
                  <input
                    type="text"
                    className="embed-input embed-button-row__label"
                    defaultValue={b.label}
                    placeholder="Label"
                  />
                  <input
                    type="text"
                    className="embed-input embed-button-row__url"
                    defaultValue={b.url}
                    placeholder="https://"
                  />
                  <button
                    type="button"
                    className="embed-button-row__remove"
                    aria-label="Remove button"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Right: live preview */}
          <Card className="dash-profile-section">
            <div className="dash-card__eyebrow">PREVIEW</div>
            <h3 className="dash-profile-section__title">Social Embed</h3>

            <div className="embed-preview">
              <span
                className="embed-preview__bar"
                style={{ background: PLACEHOLDER.accent }}
              />
              <div className="embed-preview__content">
                <div className="embed-preview__top">
                  <div className="embed-preview__text">
                    <div className="embed-preview__title">{PLACEHOLDER.title}</div>
                    <div className="embed-preview__desc">{PLACEHOLDER.description}</div>
                  </div>
                  <div className="embed-preview__thumb" />
                </div>

                <div className="embed-preview__image" />

                <div className="embed-preview__divider" />

                <div className="embed-preview__buttons">
                  {PLACEHOLDER.buttons.map((b, i) => (
                    <button type="button" className="embed-preview__button" key={i}>
                      <span>{b.label}</span>
                      <ExternalIcon />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}