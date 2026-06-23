import type { SelectOption } from "@/components/ui/Select";
import {
  frequencyLabel,
  invoiceStatusLabel,
  leadStageLabel,
  leaseStatusLabel,
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
  paymentMethodLabel,
  pdcStatusLabel,
  unitStatusLabel,
} from "@/lib/labels";

function toOptions<T extends string>(map: Record<T, string>): SelectOption[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}

export const currencyOptions: SelectOption[] = [
  { value: "AED", label: "AED — United Arab Emirates Dirham" },
];

export const countryOptions: SelectOption[] = [
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

export const unitStatusOptions = toOptions(unitStatusLabel);
export const maintenanceCategoryOptions = toOptions(maintenanceCategoryLabel);
export const maintenancePriorityOptions = toOptions(maintenancePriorityLabel);
export const maintenanceStatusOptions = toOptions(maintenanceStatusLabel);
// Annual-first order reflects UAE market convention (annual leases are the norm)
export const frequencyOptions: SelectOption[] = [
  { value: "annual", label: frequencyLabel.annual },
  { value: "quarterly", label: frequencyLabel.quarterly },
  { value: "semiannual", label: frequencyLabel.semiannual },
  { value: "monthly", label: frequencyLabel.monthly },
];
export const leaseStatusOptions = toOptions(leaseStatusLabel);
export const invoiceStatusOptions = toOptions(invoiceStatusLabel);
export const paymentMethodOptions = toOptions(paymentMethodLabel);
export const pdcStatusOptions = toOptions(pdcStatusLabel);

export const leadStageOptions = toOptions(leadStageLabel);

export const leadSourceOptions: SelectOption[] = [
  { value: "Website", label: "Website" },
  { value: "Property Finder", label: "Property Finder" },
  { value: "Bayut", label: "Bayut" },
  { value: "Dubizzle", label: "Dubizzle" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Referral", label: "Referral" },
  { value: "Other", label: "Other" },
];
