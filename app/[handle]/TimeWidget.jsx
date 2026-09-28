"use client";

import { useEffect, useState } from "react";
import { sanitizeClockOptions } from "../lib/widgets";
import "./TimeWidget.css";

// Live clock in a chosen timezone, styled after time.is: big digits, the date
// underneath, and a small place + UTC offset line.
//
// The server can't know what time it is for the visitor, so the first render
// (server + first client paint) is a placeholder with the same size, and the
// real time fills in after mount. That avoids a hydration mismatch.

// "Australia/Melbourne" -> "Melbourne", "America/Argentina/Buenos_Aires" -> "Buenos Aires"
function placeFromZone(zone) {
  const last = String(zone).split("/").pop() ?? zone;
  return last.replace(/_/g, " ");
}

function formatParts(now, zone, opts) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: opts.seconds ? "2-digit" : undefined,
    hour12: opts.hour12,
  }).formatToParts(now);

  // Pull the pieces out so AM/PM can be drawn smaller than the digits.
  const digits = time
    .filter((p) => p.type === "hour" || p.type === "minute" || p.type === "second" || p.type === "literal")
    .map((p) => p.value)
    .join("")
    .trim();
  const dayPeriod = time.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() ?? null;

  const date = opts.date
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : null;

  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "";

  return { digits, dayPeriod, date, offset };
}

/**
 * @param {{
 *   zone: string,
 *   options?: { hour12?: boolean, seconds?: boolean, date?: boolean, label?: string } | null,
 *   boxStyle?: Record<string, string>,
 * }} props
 */
export default function TimeWidget({ zone, options = null, boxStyle }) {
  const opts = sanitizeClockOptions(options);
  const [now, setNow] = useState(null);

  useEffect(() => {
    let timer;
    // Tick on the second boundary so the clock never drifts half a second.
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  const place = opts.label || placeFromZone(zone);

  let view = null;
  if (now) {
    try {
      view = formatParts(now, zone, opts);
    } catch {
      view = null; // bad zone saved somehow — render nothing rather than crash the profile
    }
  }

  return (
    <div className="twg" style={boxStyle}>
      <div className="twg__time" aria-live="off">
        {view ? (
          <>
            {view.digits}
            {view.dayPeriod ? <span className="twg__period">{view.dayPeriod}</span> : null}
          </>
        ) : (
          <span className="twg__placeholder">{opts.seconds ? "--:--:--" : "--:--"}</span>
        )}
      </div>
      {opts.date ? <div className="twg__date">{view?.date ?? "\u00A0"}</div> : null}
      <div className="twg__place">
        {place}
        {view?.offset ? <span className="twg__offset">{view.offset}</span> : null}
      </div>
    </div>
  );
}
