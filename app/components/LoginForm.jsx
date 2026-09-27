"use client";

import { useState } from "react";
import SpecularButton from "./SpecularButton";
import { supabase } from "../lib/supabaseClient";
// Reuses ClaimHandleForm's styling (same "claim-form" classes) so this
// looks identical to the claim-handle step — just wired to sign in
// instead of sign up.
import "./ClaimHandleForm.css";
import "./LoginForm.css";

// Same synthetic email scheme ClaimHandleForm signs up with, so a
// handle + password created there logs back in here.
const SYNTHETIC_EMAIL_DOMAIN = "users.raided.cc";

export default function LoginForm({ onComplete, onBack }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = handle.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const email = `${handle.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Incorrect username or password.");
      setSubmitting(false);
      return;
    }

    onComplete?.();
  }

  return (
    <form className="claim-form" onSubmit={handleSubmit}>
      <div className="claim-form__field">
        <label className="claim-form__label" htmlFor="login-handle">
          Username
        </label>
        <div className="claim-form__handle-input">
          <span className="claim-form__prefix">raided.cc/</span>
          <input
            id="login-handle"
            className="claim-form__input"
            type="text"
            inputMode="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="yourname"
            maxLength={20}
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
            }
            disabled={submitting}
          />
        </div>
      </div>

      <div className="claim-form__field">
        <label className="claim-form__label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className="claim-form__input"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
      </div>

      {error ? <span className="claim-form__error">{error}</span> : null}

      <SpecularButton
        type="submit"
        className="claim-form__submit request-access-btn"
        size="sm"
        radius={10}
        textColor="#f5f5f5"
        lineColor="#ffffff"
        baseColor="#8a8a8a"
        intensity={1}
        shineSize={10}
        shineFade={40}
        thickness={1}
        speed={0.35}
        followMouse
        proximity={220}
        tintOpacity={0}
        disabled={!canSubmit}
      >
        {submitting ? "Logging in…" : "Log in"}
      </SpecularButton>

      <button
        type="button"
        className="login-form__back"
        onClick={onBack}
        disabled={submitting}
      >
        Back
      </button>
    </form>
  );
}
