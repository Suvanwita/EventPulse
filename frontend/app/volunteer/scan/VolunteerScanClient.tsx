"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { LoadingState } from "@/components/LoadingState";
import { AccessResultPanel, GateFlowPanel, GlassPanel, ScannerCockpit } from "@/components/OpsUI";
import { NeonButton } from "@/components/NeonButton";
import { get, post } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { unwrapData } from "@/lib/adapters";

type ScanRecord = {
  id: string;
  attendee: string;
  pass: string;
  event: string;
  status: string;
  checkedInAt?: string;
};

type ScanResult = {
  token: string;
  gate: string;
  status: "ALLOWED" | "REJECTED";
  message: string;
  time: string;
  detail: string;
};

const gates = ["Main Gate", "North Entry", "Backstage Door", "Overflow Desk"];

export function VolunteerScanClient({ initialScans }: { initialScans: ScanRecord[] }) {
  const [token, setToken] = useState("");
  const [gate, setGate] = useState(gates[0]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [eventId, setEventId] = useState("");
  const [gateFlow, setGateFlow] = useState<any>(null);
  const [socketStatus, setSocketStatus] = useState("Live Sync Offline");
  const [recentScans, setRecentScans] = useState<ScanRecord[]>(
    initialScans.map((scan) => ({ ...scan, checkedInAt: scan.checkedInAt || "-" })),
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function markConnected() {
      setSocketStatus("Live Sync Active");
    }

    function markDisconnected() {
      setSocketStatus("Reconnecting...");
    }

    function onCheckin(payload: any) {
      setRecentScans((scans) => [
        {
          id: `socket-${Date.now()}`,
          attendee: payload?.student?.name || payload?.userId || "Live attendee",
          pass: payload?.registrationId || "socket",
          event: payload?.event?.title || payload?.eventId || "Live check-in",
          status: "ACCESS GRANTED",
          checkedInAt: new Date(payload?.timestamp || Date.now()).toLocaleTimeString(),
        },
        ...scans,
      ]);
    }

    socket.on("connect", markConnected);
    socket.on("disconnect", markDisconnected);
    socket.on("connect_error", () => setSocketStatus("Live Sync Offline"));
    socket.on("checkin-updated", onCheckin);
    if (socket.connected) markConnected();

    return () => {
      socket.off("connect", markConnected);
      socket.off("disconnect", markDisconnected);
      socket.off("checkin-updated", onCheckin);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !eventId) return;

    socket.emit("join-event-room", { eventId });
    get(`/api/events/${eventId}/checkins`)
      .then((payload) => {
        const records = unwrapData(payload, "checkIns") || unwrapData(payload, "checkins") || unwrapData(payload);
        if (Array.isArray(records)) {
          setRecentScans(records.map((item: any) => ({
            id: item.id,
            attendee: item.user?.name || item.student?.name || item.userId,
            pass: item.registration?.seatNumber || item.registrationId,
            event: item.eventId,
            status: "Checked in",
            checkedInAt: item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString() : "-",
          })));
        }
      })
      .catch(() => undefined);
    get(`/api/events/${eventId}/gates/flow`)
      .then((payload) => setGateFlow(unwrapData(payload)))
      .catch(() => setGateFlow(null));

    return () => {
      socket.emit("leave-event-room", { eventId });
    };
  }, [eventId]);

  const liveStats = useMemo(() => {
    const allowed = recentScans.filter((scan) => scan.status === "ACCESS GRANTED" || scan.status === "Checked in").length;
    const rejected = recentScans.filter((scan) => scan.status.startsWith("ACCESS DENIED")).length;
    const waitlisted = recentScans.filter((scan) => scan.status === "Waitlisted").length;

    return [
      { label: "Allowed entries", value: String(allowed), delta: "Valid scans today" },
      { label: "Rejected scans", value: String(rejected), delta: "Needs review" },
      { label: "Waitlist checks", value: String(waitlisted), delta: "Queue confirmations" },
      { label: "Active gate", value: gate, delta: "Current station" },
    ];
  }, [gate, recentScans]);

  async function scanToken() {
    const normalizedToken = token.trim();
    setIsScanning(true);

    try {
      const payload = await post("/api/checkin/scan", {
        qrToken: normalizedToken,
        gateName: gate,
      });
      const data = unwrapData(payload);
      const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(data?.checkIn?.scannedAt || Date.now()));
      const scanResult: ScanResult = {
        token: normalizedToken || "empty-token",
        gate,
        status: "ALLOWED",
        message: "ACCESS GRANTED",
        time,
        detail: `${data?.event?.title || "Event"} / ${data?.student?.name || "Student"} / seat ${data?.registration?.seatNumber || "-"}`,
      };

      setResult(scanResult);
      setRecentScans((scans) => [
        {
          id: `scan-${Date.now()}`,
          attendee: data?.student?.name || "Student",
          pass: scanResult.token,
          event: data?.event?.title || "Gate scan",
          status: "ACCESS GRANTED",
          checkedInAt: time,
        },
        ...scans,
      ]);
    } catch (err) {
      const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date());
      const reason = err instanceof Error ? err.message : "QR scan rejected";
      const scanResult: ScanResult = {
        token: normalizedToken || "empty-token",
        gate,
        status: "REJECTED",
        message: "ACCESS DENIED",
        time,
        detail: reason,
      };
      setResult(scanResult);
      setRecentScans((scans) => [
        {
          id: `scan-${Date.now()}`,
          attendee: "Unknown",
          pass: scanResult.token,
          event: "Gate scan",
          status: `ACCESS DENIED: ${reason}`,
          checkedInAt: time,
        },
        ...scans,
      ]);
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="grid gap-6">
      <GateFlowPanel stats={liveStats} />
      <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/60">{socketStatus}</p>
      <GlassPanel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Gate Flow Panel</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{gateFlow?.reason || "Select an event ID to sync gate load recommendations."}</p>
          </div>
          <span className="rounded-full border border-lime/25 bg-lime/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-lime">
            {gateFlow?.recommendedGate?.name || "No gate"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(gateFlow?.gates || []).map((gate: any) => (
            <div key={gate.id} className={`rounded-xl border p-4 ${gateFlow?.recommendedGate?.id === gate.id ? "border-lime/35 bg-lime/10" : "border-white/10 bg-white/5"}`}>
              <p className="font-black text-white">{gate.name}</p>
              <p className="mt-1 text-sm text-white/55">Load {gate.load} / distance {gate.distanceWeight}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <ScannerCockpit>
          <h2 className="text-xl font-black text-white">QR Access-Control Cockpit</h2>
          <div className="mt-5 grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl border border-cyan-300/18 bg-cyan-300/6">
            <div className="relative h-52 w-52 rounded-full border border-cyan-300/25">
              <div className="absolute inset-8 rounded-full border border-violet/25" />
              <div className="absolute left-1/2 top-0 h-full w-px origin-bottom bg-cyan-300/60 shadow-glow" style={{ animation: "beacon 2s ease-in-out infinite" }} />
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-white/75">
              QR token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste demo QR token"
                className="min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Gate name
              <select
                value={gate}
                onChange={(event) => setGate(event.target.value)}
                className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none transition focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              >
                {gates.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Event ID for recent gate activity
              <input
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Optional event id"
                className="min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
              />
            </label>
            <NeonButton type="button" onClick={scanToken} disabled={isScanning} className="w-full">
              {isScanning ? "Scanning..." : "Scan"}
            </NeonButton>
            {isScanning ? <LoadingState label="Checking token" /> : null}
          </div>
        </ScannerCockpit>

        <section className="grid gap-5">
          {!result ? (
            <AccessResultPanel />
          ) : (
            <AccessResultPanel status={result.status} message={result.message} detail={`Gate: ${result.gate}. Time: ${result.time}. ${result.detail}`} />
          )}
          {result ? (
            <GlassPanel className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/55">Token</span>
                <span className="break-all font-bold text-white">{result.token}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/55">Decision</span>
                <span className="font-bold text-white">{result.status === "ALLOWED" ? "ACCESS GRANTED" : "ACCESS DENIED"}</span>
              </div>
            </GlassPanel>
          ) : null}
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-black text-white">Recent scan activity</h2>
        <DataTable
          columns={["attendee", "pass", "event", "status", "checkedInAt"]}
          rows={recentScans.map(({ attendee, pass, event, status, checkedInAt }) => ({ attendee, pass, event, status, checkedInAt: checkedInAt || "-" }))}
          emptyMessage="Scans will appear here as volunteers process passes."
        />
      </section>
    </div>
  );
}
