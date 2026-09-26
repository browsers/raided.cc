"use client";

import { useState } from "react";
import SpecularButton from "./SpecularButton";
import { supabase } from "../lib/supabaseClient";
import "./ClaimHandleForm.css";

const HANDLE_PATTERN = /^[a-z0-9_-]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;

// Password strength meter: 3 bars, scored 0-3.
// 1 = weak (red), 2 = medium (yellow), 3 = strong (green).
const STRENGTH_LEVELS = [
  null,
  { label: "Weak", color: "#ff5c4d" },
  { label: "Medium", color: "#ffcc4d" },
  { label: "Strong", color: "#4ade80" },
];

function getPasswordStrength(password) {
  if (!password) return 0;

  let score = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(
    Boolean
  ).length;

  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12 && variety >= 2) score++;
  if (password.length >= 12 && variety >= 3) score++;

  return Math.min(score, 3);
}

// Handles sign up with just a handle + password (no email field in this
// form). Supabase auth still needs *something* to sign up with, so we
// synthesize one from the handle. Swap this out if/when a real email
// gets collected (e.g. later in Settings).
const SYNTHETIC_EMAIL_DOMAIN = "users.raided.cc";

export default function ClaimHandleForm({ onComplete }) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [handleError, setHandleError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleValid = HANDLE_PATTERN.test(handle);
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = handleValid && passwordValid && !submitting;
  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setHandleError(null);
    setError(null);

    const result = await claimHandle(handle, password);

    if (!result.ok) {
      if (result.field === "handle") {
        setHandleError(result.message);
      } else {
        setError(result.message);
      }
      setSubmitting(false);
      return;
    }

    onComplete?.({ handle });
  };

  return (
    <form className="claim-form" onSubmit={handleSubmit}>
      <div className="claim-form__field">
        <label className="claim-form__label" htmlFor="claim-handle">
          Claim your handle
        </label>
        <div className="claim-form__handle-input">
          <span className="claim-form__prefix">raided.cc/</span>
          <input
            id="claim-handle"
            className="claim-form__input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="yourname"
            maxLength={20}
            value={handle}
            onChange={(e) => {
              setHandle(
                e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
              );
              if (handleError) setHandleError(null);
            }}
            disabled={submitting}
          />
        </div>
        {handleError ? (
          <span className="claim-form__error">{handleError}</span>
        ) : null}
      </div>

      <div className="claim-form__field">
        <label className="claim-form__label" htmlFor="claim-password">
          Choose a password
        </label>
        <input
          id="claim-password"
          className="claim-form__input"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
        {password ? (
          <div
            className="claim-form__strength"
            role="img"
            aria-label={`Password strength: ${
              STRENGTH_LEVELS[passwordStrength]?.label ?? "Too short"
            }`}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="claim-form__strength-bar"
                style={{
                  background:
                    i < passwordStrength
                      ? STRENGTH_LEVELS[passwordStrength].color
                      : "rgba(255, 255, 255, 0.14)",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {error ? <span className="claim-form__error">{error}</span> : null}

      {/*
        TODO: Cloudflare Turnstile widget goes here once the site key is
        wired up — render it above the submit button and hold the token
        in state so claimHandle() can send it along for server-side
        verification before the Supabase call goes through.
      */}

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
        {submitting ? "Creating account…" : "Continue"}
      </SpecularButton>
    </form>
  );
}

async function claimHandle(handle, password) {
  // TODO: once Cloudflare Turnstile is wired in above, verify the token
  // server-side (e.g. an API route) before letting this call through.

  const email = `${handle}@${SYNTHETIC_EMAIL_DOMAIN}`;

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    if (signUpError.message?.toLowerCase().includes("already registered")) {
      return {
        ok: false,
        field: "handle",
        message: "Username already taken.",
      };
    }
    return { ok: false, message: signUpError.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      ok: false,
      message: "Something went wrong creating your account. Try again.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, handle });

  if (profileError) {
    // 23505 = unique_violation — the handles unique constraint caught a race
    if (profileError.code === "23505") {
      return {
        ok: false,
        field: "handle",
        message: "Username already taken.",
      };
    }
    return { ok: false, message: profileError.message };
  }

  return { ok: true };
}