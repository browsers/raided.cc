"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import CodeSlots from "./components/CodeSlots";
import SpecularButton from "./components/SpecularButton";
import BrandTitle from "./components/BrandTitle";
import ClaimHandleForm from "./components/ClaimHandleForm";
import RedirectCard from "./components/RedirectCard";

// How long to let the checkmark sit on screen before the code step fades
// out and the claim-handle step takes over.
const REDIRECT_DELAY = 1200;

// How long the redirect card stays up. Nothing happens when this
// fires yet — wire in the real navigation (e.g. router.push) here
// once there's somewhere to send people.
const REDIRECT_DURATION = 5000;

export default function Home() {
  const [status, setStatus] = useState("idle");
  // 'code' -> entering the invite code
  // 'claim' -> claiming a handle + password (post Cloudflare Turnstile + Supabase)
  // 'redirect' -> account created, showing the redirect card
  const [step, setStep] = useState("code");
  const toClaimTimer = useRef<ReturnType<typeof setTimeout>>();
  const afterRedirectTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleComplete = async (code: string) => {
    // TODO: replace with a real check against your Supabase invite_codes table
    const ok = await verifyInviteCode(code);
    setStatus(ok ? "success" : "error");

    if (ok) {
      toClaimTimer.current = setTimeout(() => {
        setStep("claim");
      }, REDIRECT_DELAY);
    }
  };

  const handleClaimed = () => {
    setStep("redirect");
  };

  useEffect(() => {
    if (step !== "redirect") return;
    afterRedirectTimer.current = setTimeout(() => {
      // TODO: actually redirect once there's a destination, e.g.
      // window.location.href = "https://...";
    }, REDIRECT_DURATION);
    return () => clearTimeout(afterRedirectTimer.current);
  }, [step]);

  useEffect(() => {
    return () => {
      clearTimeout(toClaimTimer.current);
      clearTimeout(afterRedirectTimer.current);
    };
  }, []);

  return (
    <main>
      <div className="bg-video-wrap">
        <video
          className="bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/grass-bg.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="center-content">
        <AnimatePresence mode="wait">
          {step === "code" ? (
            <motion.div
              key="form"
              className="auth-stack"
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
              <BrandTitle />
              <div style={{ marginTop: 48 }}>
                <CodeSlots
                  length={6}
                  value={undefined}
                  status={status}
                  onChange={() => setStatus("idle")}
                  onComplete={handleComplete}
                  autoFocus
                  accentColor="rgb(254, 254, 254)"
                  inkColor="#eaf0e6"
                  slotColor="rgba(20, 24, 18, 0.45)"
                  digitColor="#f5f5f5"
                  dangerColor="#ff5c4d"
                  slotSize={36}
                  gap={8}
                  radius={8}
                />
              </div>
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
                onClick={() => {}}
              >
                Request access
              </SpecularButton>
            </motion.div>
          ) : step === "claim" ? (
            <motion.div
              key="claim"
              className="auth-stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
              <ClaimHandleForm onComplete={handleClaimed} />
            </motion.div>
          ) : (
            <motion.div
              key="redirect"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <RedirectCard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* nav goes here later */}
    </main>
  );
}

async function verifyInviteCode(code: string): Promise<boolean> {
  // Placeholder — wire this up to your Supabase invite_codes table.
  // Temporary valid code for testing: 123123
  return code === "123123";
}