"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import CodeSlots from "./components/CodeSlots";
import SpecularButton from "./components/SpecularButton";
import BrandTitle from "./components/BrandTitle";
import ClaimHandleForm from "./components/ClaimHandleForm";
import RedirectCard from "./components/RedirectCard";
import { supabase } from "./lib/supabaseClient";

// How long to let the checkmark sit on screen before the code step fades
// out and the claim-handle step takes over.
const REDIRECT_DELAY = 1200;

// How long the redirect card stays up before sending the user to
// their dashboard.
const REDIRECT_DURATION = 5000;

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  // 'code' -> entering the invite code
  // 'claim' -> claiming a handle + password (post Cloudflare Turnstile + Supabase)
  // 'redirect' -> account created, showing the redirect card
  const [step, setStep] = useState("code");
  // Whether the browser already holds a valid Supabase session, i.e. the
  // person has signed up/in before on this device. Starts null while we
  // check, so the button doesn't flash the wrong label.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const toClaimTimer = useRef<ReturnType<typeof setTimeout>>();
  const afterRedirectTimer = useRef<ReturnType<typeof setTimeout>>();

  // Check once on mount, then keep it live in case auth state changes
  // (e.g. they sign out in another tab).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(Boolean(session));
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

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
      router.push("/dashboard");
    }, REDIRECT_DURATION);
    return () => clearTimeout(afterRedirectTimer.current);
  }, [step, router]);

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
                onClick={() => {
                  if (hasSession) router.push("/dashboard");
                }}
              >
                {hasSession ? "Dashboard" : "Request access"}
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
  const { data, error } = await supabase.rpc("redeem_invite_code", {
    p_code: code,
  });

  if (error) {
    console.error(error);
    return false;
  }

  return Boolean(data);
}