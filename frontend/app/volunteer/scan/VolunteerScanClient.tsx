"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { LoadingState } from "@/components/LoadingState";
import { AccessResultPanel, GateFlowPanel, GlassPanel, ScannerCockpit } from "@/components/OpsUI";
import { NeonButton } from "@/components/NeonButton";

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
};

const gates = ["Main Gate", "North Entry", "Backstage Door", "Overflow Desk"];

export function VolunteerScanClient({ initialScans }: { initialScans: ScanRecord[] }) {
  const [token, setToken] = useState("");
  const [gate, setGate] = useState(gates[0]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>(
    initialScans.map((scan) => ({ ...scan, checkedInAt: scan.checkedInAt || "-" })),
  );

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

  function scanToken() {
    const normalizedToken = token.trim();
    setIsScanning(true);

    window.setTimeout(() => {
      const allowed = normalizedToken.toLowerCase().includes("valid");
      const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date());
      const reason = allowed ? "valid token" : ["expired token", "duplicate entry", "wrong event", "fake token"][Math.floor(Math.random() * 4)];
      const scanResult: ScanResult = {
        token: normalizedToken || "empty-token",
        gate,
        status: allowed ? "ALLOWED" : "REJECTED",
        message: allowed ? "ACCESS GRANTED" : "ACCESS DENIED",
        time,
      };

      setResult(scanResult);
      setRecentScans((scans) => [
        {
          id: `scan-${Date.now()}`,
          attendee: allowed ? "Demo Student" : "Unknown",
          pass: scanResult.token,
          event: "Gate scan",
          status: allowed ? "ACCESS GRANTED" : `ACCESS DENIED: ${reason}`,
          checkedInAt: time,
        },
        ...scans,
      ]);
      setIsScanning(false);
    }, 550);
  }

  return (
    <div className="grid gap-6">
      <GateFlowPanel stats={liveStats} />

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
                placeholder='Try "valid-123" for ALLOWED'
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
            <AccessResultPanel status={result.status} message={result.message} detail={`Gate: ${result.gate}. Time: ${result.time}. Reason: ${result.status === "ALLOWED" ? "valid token" : "dummy token rejected"}.`} />
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
