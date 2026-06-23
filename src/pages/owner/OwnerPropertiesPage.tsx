import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageLoader } from "@/components/ui/PageLoader";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/Table";
import { formatMoney } from "@/lib/format";
import { unitStatusLabel, unitStatusTone } from "@/lib/labels";
import type { CurrencyCode, Unit } from "@/lib/database.types";

interface OwnerProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  units: Unit[];
}

function useOwnerProperties() {
  return useQuery({
    queryKey: ["owner-properties"],
    queryFn: async (): Promise<OwnerProperty[]> => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, city, country, currency, units(*)")
        .order("name")
        .returns<OwnerProperty[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function OwnerPropertiesPage() {
  const { data, isLoading, isError, refetch } = useOwnerProperties();

  if (isLoading) return <PageLoader label="Loading your properties" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader title="Properties" subtitle="The buildings you own and their units." />
      {data.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Your manager has not assigned any properties to you yet."
        />
      ) : (
        <div className="space-y-6">
          {data.map((p) => {
            const occupied = p.units.filter((u) => u.status === "occupied").length;
            return (
              <div key={p.id}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
                    <p className="text-sm text-slate-600">
                      {p.address ? `${p.address}, ` : ""}
                      {p.city}, {p.country}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    {occupied} / {p.units.length} occupied
                  </div>
                </div>
                {p.units.length === 0 ? (
                  <p className="glass-card p-5 text-sm text-slate-600">No units yet.</p>
                ) : (
                  <Table>
                    <THead>
                      <TH>Unit</TH>
                      <TH>Beds / Baths</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Market rent</TH>
                    </THead>
                    <TBody>
                      {p.units.map((u) => (
                        <TR key={u.id}>
                          <TD className="font-medium text-slate-900">{u.label}</TD>
                          <TD>
                            {u.beds} bd · {u.baths} ba
                          </TD>
                          <TD>
                            <Badge tone={unitStatusTone[u.status]}>{unitStatusLabel[u.status]}</Badge>
                          </TD>
                          <TD className="text-right">{formatMoney(u.market_rent, p.currency)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
