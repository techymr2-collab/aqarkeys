import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { PageLoader } from "@/components/ui/PageLoader";
import { ErrorState } from "@/components/ui/ErrorState";
import { UploadIcon, DownloadIcon } from "@/components/icons";
import { useImportContext, useBulkImportEntity } from "@/data/importData";
import { parseCsv, downloadCsv } from "@/lib/csv";
import { emptyContext, IMPORT_CONFIGS, type ImportContext, type ImportEntityKey, type ParsedRow } from "@/lib/importSchemas";
import { friendlyError } from "@/lib/errors";
import { pushToast } from "@/lib/toast";

interface TabState {
  parsed: ParsedRow<unknown>[] | null;
  deselected: Set<number>;
  result: { created: number } | null;
  error: string | null;
}

function emptyTabState(): TabState {
  return { parsed: null, deselected: new Set(), result: null, error: null };
}

export function ManagerImportPage() {
  const importCtxQuery = useImportContext();
  const bulkInsert = useBulkImportEntity();
  const ctxRef = useRef<ImportContext>(emptyContext());
  const [ctxReady, setCtxReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importCtxQuery.data && !ctxReady) {
      ctxRef.current = importCtxQuery.data;
      setCtxReady(true);
    }
  }, [importCtxQuery.data, ctxReady]);

  const [activeTab, setActiveTab] = useState<ImportEntityKey>("owners");
  const [tabStates, setTabStates] = useState<Record<ImportEntityKey, TabState>>({
    owners: emptyTabState(),
    properties: emptyTabState(),
    units: emptyTabState(),
    tenants: emptyTabState(),
    leases: emptyTabState(),
  });

  const activeConfig = IMPORT_CONFIGS.find((c) => c.key === activeTab)!;
  const state = tabStates[activeTab];

  function patchState(key: ImportEntityKey, patch: Partial<TabState>) {
    setTabStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleFile(file: File) {
    patchState(activeTab, { error: null });
    try {
      const text = await file.text();
      const { headers, rows } = await parseCsv(text);
      const matched = activeConfig.templateHeaders.filter((h) => headers.includes(h));
      if (matched.length === 0) {
        patchState(activeTab, {
          parsed: null,
          error: `This file doesn't look like the ${activeConfig.label} template. Download the template below and use its exact column headers.`,
        });
        return;
      }
      const seen = new Set<string>();
      const parsed: ParsedRow<unknown>[] = rows.map((raw, i) => {
        const { data, errors } = activeConfig.parseRow(raw, ctxRef.current, seen);
        return { rowNumber: i + 1, raw, data, errors };
      });
      patchState(activeTab, { parsed, deselected: new Set(), result: null, error: null });
    } catch (err) {
      patchState(activeTab, { error: friendlyError(err, "Could not read that file.") });
    }
  }

  async function handleImport() {
    if (!state.parsed) return;
    const rowsToImport = state.parsed
      .filter((r) => r.data && !state.deselected.has(r.rowNumber))
      .map((r) => r.data!);
    if (rowsToImport.length === 0) return;
    try {
      const created = await bulkInsert.mutateAsync({ key: activeTab, rows: rowsToImport });
      rowsToImport.forEach((d, i) => {
        activeConfig.registerInContext(d, created[i]!.id, ctxRef.current);
      });
      patchState(activeTab, { result: { created: created.length }, parsed: null, deselected: new Set() });
      pushToast(`Imported ${created.length} ${activeConfig.label.toLowerCase()}`, "success");
    } catch (err) {
      patchState(activeTab, { error: friendlyError(err, "Import failed.") });
    }
  }

  function toggleRow(rowNumber: number) {
    const next = new Set(state.deselected);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    patchState(activeTab, { deselected: next });
  }

  function toggleAllValid() {
    if (!state.parsed) return;
    const validRowNumbers = state.parsed.filter((r) => r.data).map((r) => r.rowNumber);
    const allSelected = validRowNumbers.every((n) => !state.deselected.has(n));
    patchState(activeTab, { deselected: allSelected ? new Set(validRowNumbers) : new Set() });
  }

  if (importCtxQuery.isLoading) return <PageLoader label="Loading your portfolio" />;
  if (importCtxQuery.isError) return <ErrorState onRetry={() => void importCtxQuery.refetch()} />;

  const validCount = state.parsed?.filter((r) => r.data).length ?? 0;
  const errorCount = state.parsed ? state.parsed.length - validCount : 0;
  const selectedCount = state.parsed
    ? state.parsed.filter((r) => r.data && !state.deselected.has(r.rowNumber)).length
    : 0;

  return (
    <div>
      <PageHeader
        title="Import data"
        subtitle="Bring your existing portfolio in from a spreadsheet instead of adding everything by hand."
      />

      <Tabs
        className="mb-6"
        value={activeTab}
        onChange={(v) => setActiveTab(v as ImportEntityKey)}
        tabs={IMPORT_CONFIGS.map((c, i) => ({ value: c.key, label: `${i + 1}. ${c.label}` }))}
      />

      <Card>
        <CardHeader
          title={activeConfig.label}
          subtitle={activeConfig.description}
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    `${activeConfig.key}-template.csv`,
                    activeConfig.templateHeaders,
                    activeConfig.templateExampleRows,
                  )
                }
              >
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                Template
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon className="mr-1.5 h-4 w-4" />
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleFile(file);
                }}
              />
            </div>
          }
        />

        {state.error && (
          <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
        )}

        {state.result && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Badge tone="green">Done</Badge>
            Imported {state.result.created} {activeConfig.label.toLowerCase()}. Switch tabs to continue, or
            upload another file here.
          </div>
        )}

        {!state.parsed && !state.result && !state.error && (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-600">No file uploaded yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Download the template, fill it in, then upload it here.
            </p>
          </div>
        )}

        {state.parsed && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-slate-900">{state.parsed.length}</span> rows ·{" "}
                <span className="font-semibold text-emerald-600">{validCount} ready</span>
                {errorCount > 0 && (
                  <>
                    {" "}
                    · <span className="font-semibold text-rose-600">{errorCount} with errors</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={toggleAllValid}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Select / deselect all valid
              </button>
              <span className="ml-auto" />
            </div>

            <div className="glass-card mb-4 overflow-hidden p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-900/[0.06] bg-white/95 backdrop-blur-sm">
                    <tr>
                      <th className="w-10 py-2.5 pl-4 pr-2 text-left">#</th>
                      {activeConfig.templateHeaders.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/[0.04]">
                    {state.parsed.map((row) => {
                      const valid = !!row.data;
                      const selected = valid && !state.deselected.has(row.rowNumber);
                      return (
                        <tr
                          key={row.rowNumber}
                          className={!valid ? "bg-rose-50/40" : selected ? undefined : "opacity-50"}
                        >
                          <td className="py-2.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!valid}
                              onChange={() => toggleRow(row.rowNumber)}
                              className="h-4 w-4 rounded accent-brand-500 disabled:cursor-not-allowed"
                            />
                          </td>
                          {activeConfig.templateHeaders.map((h) => (
                            <td key={h} className="px-3 py-2.5 text-slate-700">
                              {row.raw[h] ?? ""}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 pr-4">
                            {valid ? (
                              <Badge tone="green">Ready</Badge>
                            ) : (
                              <span className="text-xs text-rose-600">{row.errors.join(" ")}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                loading={bulkInsert.isPending}
                disabled={selectedCount === 0}
                onClick={() => void handleImport()}
              >
                Import {selectedCount > 0 ? `${selectedCount} ` : ""}
                {selectedCount === 1 ? "row" : "rows"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
