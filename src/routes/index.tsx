import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  ScanSearch,
  Type,
  LayoutGrid,
  Sigma,
  GitMerge,
  MapPin,
  MessageSquareText,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Download,
  Loader2,
} from "lucide-react";
import sampleInvoice from "@/assets/sample-invoice.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeriDoc — Multimodal Document Fraud Verification" },
      {
        name: "description",
        content:
          "Upload invoices, certificates and receipts. VeriDoc fuses visual, textual, layout and logical evidence into an explainable authenticity verdict.",
      },
      { property: "og:title", content: "VeriDoc — Multimodal Document Fraud Verification" },
      {
        property: "og:description",
        content:
          "Upload invoices, certificates and receipts. Get an explainable authenticity verdict with highlighted suspicious regions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Stage = "idle" | "analyzing" | "done";

interface PipelineStep {
  label: string;
  icon: typeof ScanSearch;
  detail: string;
}

const PIPELINE: PipelineStep[] = [
  { label: "Preprocessing", icon: FileText, detail: "Render pages, deskew, denoise, normalize" },
  { label: "OCR & field extraction", icon: Type, detail: "Text, confidence and bounding boxes" },
  { label: "Visual forensics", icon: ScanSearch, detail: "Noise, compression and editing traces" },
  { label: "Layout analysis", icon: LayoutGrid, detail: "Spatial structure and template match" },
  { label: "Logical consistency", icon: Sigma, detail: "Arithmetic, dates, cross-field checks" },
  { label: "Adaptive fusion", icon: GitMerge, detail: "Gated combination of all modalities" },
  { label: "Localization & explanation", icon: MessageSquareText, detail: "Suspicious regions + readable evidence" },
];

interface Region {
  x: number; // percent
  y: number;
  w: number;
  h: number;
  label: string;
  severity: "high" | "medium";
}

interface FieldRow {
  field: string;
  value: string;
  confidence: number;
  flag?: string;
}

interface AnalysisResult {
  score: number; // 0-100 authenticity
  verdict: "genuine" | "suspicious" | "fraudulent";
  regions: Region[];
  fields: FieldRow[];
  modalityScores: { name: string; weight: number; score: number }[];
  explanation: string[];
}

const MOCK_RESULT: AnalysisResult = {
  score: 41,
  verdict: "suspicious",
  regions: [
    { x: 55, y: 60.5, w: 40, h: 4.5, label: "Total amount edited", severity: "high" },
    { x: 66, y: 20.5, w: 24, h: 4, label: "Date field re-typed", severity: "medium" },
    { x: 76, y: 83, w: 20, h: 7, label: "Signature pasted", severity: "medium" },
  ],
  fields: [
    { field: "Invoice No.", value: "INV-2041", confidence: 0.99 },
    { field: "Date", value: "15 Apr 2025", confidence: 0.87, flag: "Font mismatch vs body" },
    { field: "Subtotal", value: "₹78,550.00", confidence: 0.98 },
    { field: "CGST (9%)", value: "₹7,069.50", confidence: 0.98 },
    { field: "SGST (9%)", value: "₹7,069.50", confidence: 0.98 },
    { field: "Total Amount", value: "₹92,689.00", confidence: 0.72, flag: "Arithmetic: expected ₹92,689.00 — noise pattern inconsistent" },
    { field: "GSTIN", value: "07ABCDE1234F1Z5", confidence: 0.95 },
  ],
  modalityScores: [
    { name: "Visual forensics", weight: 0.38, score: 34 },
    { name: "Text / OCR", weight: 0.22, score: 58 },
    { name: "Layout", weight: 0.15, score: 71 },
    { name: "Logical consistency", weight: 0.25, score: 46 },
  ],
  explanation: [
    "The total amount region shows a noise and compression pattern that differs from the rest of the page, indicating the value was likely re-typed after scanning.",
    "The invoice date uses a glyph shape inconsistent with the body font, suggesting the field was edited.",
    "Arithmetic checks pass (subtotal + CGST + SGST = total), so the forgery is visually subtle — a single-modality text check would have missed it.",
    "The signature region has a sharp pasted boundary typical of copy-paste insertion.",
  ],
};

function verdictStyle(v: AnalysisResult["verdict"]) {
  if (v === "genuine") return { text: "Likely Genuine", cls: "text-verdict-safe", bar: "bg-verdict-safe" };
  if (v === "fraudulent") return { text: "Likely Fraudulent", cls: "text-verdict-danger", bar: "bg-verdict-danger" };
  return { text: "Suspicious — Manual Review", cls: "text-verdict-warn", bar: "bg-verdict-warn" };
}

function Index() {
  const [stage, setStage] = useState<Stage>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = useCallback((name: string, url: string | null) => {
    setFileName(name);
    setPreviewUrl(url);
    setStage("analyzing");
    setStepIndex(0);
  }, []);

  useEffect(() => {
    if (stage !== "analyzing") return;
    if (stepIndex >= PIPELINE.length) {
      const t = setTimeout(() => setStage("done"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 650);
    return () => clearTimeout(t);
  }, [stage, stepIndex]);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const url = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    startAnalysis(f.name, url);
  };

  const reset = () => {
    setStage("idle");
    setFileName(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const result = MOCK_RESULT;
  const vs = verdictStyle(result.verdict);
  const docImage = previewUrl ?? sampleInvoice;

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-none">VeriDoc</p>
              <p className="text-xs text-muted-foreground">Multimodal fraud verification</p>
            </div>
          </div>
          <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Frontend demo · analysis mocked
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {stage === "idle" && (
          <>
            {/* Hero */}
            <section className="py-16 text-center">
              <h1 className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                Is this document <span className="text-primary">authentic</span>?
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                VeriDoc fuses visual forensics, OCR text, layout structure and logical-consistency
                checks with an adaptive gating mechanism — and explains its verdict in plain language.
              </p>
            </section>

            {/* Upload */}
            <section
              className={`glow-primary mx-auto max-w-2xl rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors ${
                dragOver ? "border-primary" : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onFiles(e.dataTransfer.files);
              }}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-4 font-medium">Drop an invoice, certificate or receipt</p>
              <p className="mt-1 text-sm text-muted-foreground">PDF, PNG or JPG up to 20 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Choose file
                </button>
                <button
                  onClick={() => startAnalysis("sample-invoice.jpg", null)}
                  className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                >
                  Try the sample invoice
                </button>
              </div>
            </section>

            {/* Modality cards */}
            <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ScanSearch, title: "Visual forensics", desc: "Noise, compression and editing traces in the pixels." },
                { icon: Type, title: "Text / OCR", desc: "Extracted fields with confidence and bounding boxes." },
                { icon: LayoutGrid, title: "Layout", desc: "Spatial structure compared against known templates." },
                { icon: Sigma, title: "Logical consistency", desc: "Arithmetic, dates and cross-field validation." },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-border bg-card p-5">
                  <c.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-display font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </section>
          </>
        )}

        {stage === "analyzing" && (
          <section className="mx-auto max-w-2xl py-20">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-display font-semibold">Analyzing {fileName}</p>
                  <p className="text-xs text-muted-foreground">Multimodal evidence pipeline</p>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {PIPELINE.map((s, i) => {
                  const done = i < stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                        active
                          ? "border-primary/50 bg-accent animate-pulse-ring"
                          : done
                            ? "border-border bg-secondary/50"
                            : "border-border/50 opacity-40"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-verdict-safe" />
                      ) : (
                        <s.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {stage === "done" && (
          <section className="py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Verification report</h2>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" /> New document
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Download className="h-4 w-4" /> Export PDF
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              {/* Document with region overlays */}
              <div className="lg:col-span-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" /> Localized suspicious regions
                  </p>
                  <div className="relative overflow-hidden rounded-lg">
                    <img src={docImage} alt="Analyzed document" className="w-full" width={1024} height={1408} loading="lazy" />
                    <div className="animate-scanline absolute left-0 h-0.5 w-full bg-primary/40" />
                    {result.regions.map((r) => (
                      <div
                        key={r.label}
                        className={`absolute rounded border-2 ${
                          r.severity === "high"
                            ? "border-verdict-danger bg-verdict-danger/15"
                            : "border-verdict-warn bg-verdict-warn/15"
                        }`}
                        style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
                        title={r.label}
                      />
                    ))}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {result.regions.map((r) => (
                      <div key={r.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            r.severity === "high" ? "bg-verdict-danger" : "bg-verdict-warn"
                          }`}
                        />
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score + modalities */}
              <div className="space-y-6 lg:col-span-2">
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">Authenticity score</p>
                  <p className={`font-display mt-2 text-6xl font-bold ${vs.cls}`}>{result.score}</p>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full ${vs.bar}`} style={{ width: `${result.score}%` }} />
                  </div>
                  <p className={`mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold ${vs.cls}`}>
                    <AlertTriangle className="h-4 w-4" /> {vs.text}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <p className="text-sm font-medium">Adaptive modality weights</p>
                  <div className="mt-4 space-y-4">
                    {result.modalityScores.map((m) => (
                      <div key={m.name}>
                        <div className="flex justify-between text-xs">
                          <span>{m.name}</span>
                          <span className="font-mono-data text-muted-foreground">
                            w={m.weight.toFixed(2)} · score {m.score}
                          </span>
                        </div>
                        <div className="mt-1.5 flex h-1.5 gap-1">
                          <div className="rounded-full bg-primary" style={{ width: `${m.weight * 100}%` }} />
                          <div className="flex-1 rounded-full bg-secondary" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    The gate raised visual-forensics weight for this document because pixel-level
                    evidence was stronger than textual evidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Fields table */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium">Extracted fields</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Field</th>
                      <th className="pb-2 pr-4 font-medium">Value</th>
                      <th className="pb-2 pr-4 font-medium">Confidence</th>
                      <th className="pb-2 font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fields.map((f) => (
                      <tr key={f.field} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground">{f.field}</td>
                        <td className="py-2.5 pr-4 font-mono-data">{f.value}</td>
                        <td className={`py-2.5 pr-4 font-mono-data ${f.confidence < 0.8 ? "text-verdict-warn" : "text-verdict-safe"}`}>
                          {(f.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 text-xs text-verdict-warn">{f.flag ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanation */}
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <p className="flex items-center gap-2 text-sm font-medium">
                <MessageSquareText className="h-4 w-4 text-primary" /> Explanation
              </p>
              <ul className="mt-4 space-y-3">
                {result.explanation.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="font-mono-data mt-0.5 text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                    {e}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                The explanation module only narrates structured evidence — it never makes the decision.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        VeriDoc · Intelligent multimodal document fraud & authenticity verification · BE Project, PICT Pune
      </footer>
    </div>
  );
}
