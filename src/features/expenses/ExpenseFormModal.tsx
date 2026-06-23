import { useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  EXPENSE_CATEGORIES,
  useCreateExpense,
  useUpdateExpense,
} from "@/data/expenses";
import { todayISO } from "@/lib/format";
import type { CurrencyCode, Expense } from "@/lib/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  currency: CurrencyCode;
  expense?: Expense;
}

export function ExpenseFormModal({ open, onClose, propertyId, currency, expense }: Props) {
  const editing = !!expense;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const listId = useId();

  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [note, setNote] = useState(expense?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const busy = createExpense.isPending || updateExpense.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category.trim()) {
      setError("Give the expense a category.");
      return;
    }
    const input = {
      property_id: propertyId,
      category: category.trim(),
      amount: Number(amount) || 0,
      date,
      note: note.trim() || null,
    };
    try {
      if (editing) {
        await updateExpense.mutateAsync({ id: expense.id, input });
      } else {
        await createExpense.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit expense" : "Add an expense"}
      description="Expenses show up on the owner statement for this property."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${listId}-cat`} className="text-sm font-medium text-slate-700">
            Category
          </label>
          <input
            id={`${listId}-cat`}
            list={listId}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Maintenance"
            className="h-11 rounded-xl border border-slate-900/10 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <datalist id={listId}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Amount (${currency})`}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Input
          label="Note (optional)"
          placeholder="Replaced AC compressor"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
