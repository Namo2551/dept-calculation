import { Button } from "@/components/ui/Button";
import { plansCopy } from "@/copy/plans";

const C = plansCopy.list;

const selectCls = "w-full h-12 bg-bg border border-field px-3 text-base";

// Pick two plans, then go to /plans/compare?a=..&b=.. (a plain GET form, works without JavaScript).
export function ComparePicker({ plans, a, b }: { plans: { id: string; name: string }[]; a?: string; b?: string }) {
  if (plans.length < 2) return <p className="text-muted">{C.compareNeedTwo}</p>;
  const options = plans.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));
  return (
    <form action="/plans/compare" method="get" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="min-w-0">
        <label htmlFor="compare-a" className="block text-sm font-medium mb-2">
          {C.compareA}
        </label>
        <select id="compare-a" name="a" defaultValue={a ?? plans[0].id} className={selectCls}>
          {options}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="compare-b" className="block text-sm font-medium mb-2">
          {C.compareB}
        </label>
        <select id="compare-b" name="b" defaultValue={b ?? plans[1].id} className={selectCls}>
          {options}
        </select>
      </div>
      <Button type="submit" variant="primary">
        {C.compareGo}
      </Button>
    </form>
  );
}
