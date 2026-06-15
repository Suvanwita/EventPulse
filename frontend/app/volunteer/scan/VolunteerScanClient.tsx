"use client";

import { useMemo, useState } from "react";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";

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
    const allowed = recentScans.filter((scan) => scan.status === "ALLOWED" || scan.status === "Checked in").length;
    const rejected = recentScans.filter((scan) => scan.status === "REJECTED").length;
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
      const scanResult: ScanResult = {
        token: normalizedToken || "empty-token",
        gate,
        status: allowed ? "ALLOWED" : "REJECTED",
        message: allowed ? "Pass accepted. Student may enter." : "Pass rejected. Token did not match the dummy validation rule.",
        time,
      };

      setResult(scanResult);
      setRecentScans((scans) => [
        {
          id: `scan-${Date.now()}`,
          attendee: allowed ? "Demo Student" : "Unknown",
          pass: scanResult.token,
          event: "Gate scan",
          status: scanResult.status,
          checkedInAt: time,
        },
        ...scans,
      ]);
      setIsScanning(false);
    }, 550);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {liveStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">QR token check</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-ink/75">
              QR token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder='Try "valid-123" for ALLOWED'
                className="min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-campus focus:ring-4 focus:ring-campus/10"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink/75">
              Gate name
              <select
                value={gate}
                onChange={(event) => setGate(event.target.value)}
                className="min-h-11 rounded-md border border-ink/15 bg-white px-3 text-ink outline-none transition focus:border-campus focus:ring-4 focus:ring-campus/10"
              >
                {gates.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <Button type="button" onClick={scanToken} disabled={isScanning} className="w-full">
              {isScanning ? "Scanning..." : "Scan"}
            </Button>
            {isScanning ? <LoadingState label="Checking token" /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Scan result</h2>
          <div className="mt-5">
            {!result ? (
              <div className="rounded-lg border border-dashed border-ink/15 bg-mist p-6 text-sm leading-6 text-ink/60">
                Enter a QR token and scan it. Tokens containing <span className="font-bold text-ink">valid</span> are allowed; everything else is rejected.
              </div>
            ) : result.status === "ALLOWED" ? (
              <SuccessAlert title="ALLOWED">
                {result.message} Gate: {result.gate}. Time: {result.time}.
              </SuccessAlert>
            ) : (
              <ErrorAlert title="REJECTED">
                {result.message} Gate: {result.gate}. Time: {result.time}.
              </ErrorAlert>
            )}
          </div>
          {result ? (
            <div className="mt-5 grid gap-3 rounded-md bg-mist p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink/55">Token</span>
                <span className="break-all font-bold text-ink">{result.token}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/55">Decision</span>
                <span className="font-bold text-ink">{result.status}</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Recent scans</h2>
        <DataTable
          columns={["attendee", "pass", "event", "status", "checkedInAt"]}
          rows={recentScans.map(({ attendee, pass, event, status, checkedInAt }) => ({ attendee, pass, event, status, checkedInAt: checkedInAt || "-" }))}
          emptyMessage="Scans will appear here as volunteers process passes."
        />
      </section>
    </div>
  );
}

