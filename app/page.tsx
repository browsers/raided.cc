"use client";

import { useState } from "react";
import CodeSlots from "./components/CodeSlots";
import SpecularButton from "./components/SpecularButton";

export default function Home() {
  const [status, setStatus] = useState("idle");

  const handleComplete = async (code: string) => {
    // TODO: replace with a real check against your Supabase invite_codes table
    const ok = await verifyInviteCode(code);
    setStatus(ok ? "success" : "error");
  };

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
            digitColor="#12180f"
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
      </div>
      {/* nav goes here later */}
    </main>
  );
}

async function verifyInviteCode(code: string): Promise<boolean> {
  // Placeholder — wire this up to your Supabase invite_codes table.
  console.log("checking invite code:", code);
  return false;
}