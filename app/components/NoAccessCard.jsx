"use client";

import { useRouter } from "next/navigation";
import SpecularButton from "./SpecularButton";
import "./NoAccessCard.css";

export default function NoAccessCard() {
  const router = useRouter();

  return (
    <div className="no-access-card">
      <span className="no-access-card__title">You don't have access</span>
      <span className="no-access-card__subtitle">
        raided.cc is invite-only. Request access to get a dashboard of your
        own.
      </span>

      <div className="no-access-card__actions">
        <SpecularButton
          className="request-access-btn"
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
          onClick={() => {
            // TODO: point this at the real request-access page once it exists.
          }}
        >
          Request access
        </SpecularButton>

        <button
          type="button"
          className="no-access-card__home"
          onClick={() => router.push("/")}
        >
          Go home
        </button>
      </div>
    </div>
  );
}
