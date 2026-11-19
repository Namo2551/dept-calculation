"use client";
import { useRouter } from "next/navigation";
import { useCalc } from "@/components/calculator/CalcContext";
import { useRequired } from "@/components/calculator/RequiredPayment";
import { Button } from "@/components/ui/Button";
import { closedFormFixed, closedFormPct, simulate, verifyClosedForm } from "@/lib/debt";
import { durationText, explainFirstMonths, formatBaht } from "@/lib/format";
import { InductionLadder } from "./InductionLadder";
import { Bsub, Check, Formula, Tag } from "./parts";
import { RecurrenceWalk } from "./RecurrenceWalk";

function Card({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="raised-sm rounded-panel p-5 sm:p-6 min-w-0">
      {children}
    </section>
  );
}
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-lg font-semibold tracking-tight mb-2">{children}</h3>;

export function MathExplainer() {
  const { t, single, runExample } = useCalc();
  const M = t.math;
  const S2 = M.step2;
  const { v, B, pB } = single;
  const B0 = v.bal, r = B.r, p = v.p, m = v.m / 100, rs = r.toFixed(6);
  const need = useRequired();
  const router = useRouter();

  // Claim 1 check data
  const nB = B.months === null ? B.rows.length : B.months;
  const diff1 = verifyClosedForm(pB, nB);
  const n1 = Math.max(1, Math.min(12, nB - 1));
  // Claim 2 uses floor = 0, as the formula assumes
  const A0 = simulate({ balance: B0, apr: v.apr, strategy: "pct", m, floor: 0 });
  const n2 = Math.min(12, A0.rows.length);
  const factor = 1 + r - m;
  // Claim 3
  const rB0 = r * B0;
  const cond3 = p <= rB0;

  return (
    <section id="why" className="raised rounded-panel p-5 sm:p-7 min-w-0">
      <p className="mt-4 max-w-[75ch]">{M.intro(formatBaht(B0), String(v.apr), rs, formatBaht(p), String(v.m))}</p>

      <div className="grid gap-6 mt-6">
        <Card>
          <Tag>{M.tagRec}</Tag>
          <H3>{M.step1.title}</H3>
          <p>{M.step1.every}</p>
          <p className="mt-2">{M.step1.asFormula}</p>
          <Formula>
            {M.step1.methodB} B<sub>n</sub> = (1+r)·B<sub>n−1</sub> − p
            <br />
            {M.step1.methodA} B<sub>n</sub> = (1+r−m)·B<sub>n−1</sub>
          </Formula>
          <p>{M.step1.likeCompound}</p>
          <p className="mt-2">{M.step1.tryB}</p>
          <ul className="num list-disc pl-6 text-sm my-2 grid gap-1">
            {explainFirstMonths(pB, 3).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>{M.step1.pattern}</p>
          <RecurrenceWalk />
        </Card>

        <Card>
          <Tag>{M.tagInd}</Tag>
          <H3>{S2.title}</H3>
          <p>{S2.ladderIdea}</p>

          <div data-testid="proof1" className="mt-4">
            <H3>{S2.p1.title}</H3>
            <Formula>
              B<sub>n</sub> = (1+r)<sup>n</sup>·B<sub>0</sub> − p·((1+r)<sup>n</sup> − 1)/r
            </Formula>
            <p><b>{S2.meaning}</b> {S2.p1.meaning}</p>
            <p className="mt-2">
              <b>{S2.basis}</b> n = 0: (1+r)<sup>0</sup>·B<sub>0</sub> − p·(1−1)/r = B<sub>0</sub> {S2.p1.basisTail}
            </p>
            <p className="mt-2"><b>{S2.inductive}</b> {S2.p1.assume}</p>
            <Formula>
              B<sub>k+1</sub> = (1+r)·B<sub>k</sub> − p
              <br />= (1+r)<sup>k+1</sup>·B<sub>0</sub> − p·(1+r)·((1+r)<sup>k</sup> − 1)/r − p
              <br />= (1+r)<sup>k+1</sup>·B<sub>0</sub> − p·((1+r)<sup>k+1</sup> − (1+r) + r)/r
              <br />= (1+r)<sup>k+1</sup>·B<sub>0</sub> − p·((1+r)<sup>k+1</sup> − 1)/r
            </Formula>
            <p>{S2.p1.soTrue}</p>
            <p className="mt-2 text-sm text-muted">{S2.p1.note}</p>
            <Check>{S2.p1.check(n1, formatBaht(closedFormFixed(B0, r, p, n1)), formatBaht(B.rows[n1 - 1].end), formatBaht(diff1))}</Check>
            <InductionLadder />
          </div>

          <div className="mt-6">
            <H3>{S2.p2.title}</H3>
            <Formula>
              B<sub>n</sub> = B<sub>0</sub>·(1+r−m)<sup>n</sup> &gt; 0 {S2.p2.everyN}
            </Formula>
            <p><b>{S2.meaning}</b> {S2.p2.meaning}</p>
            <p className="mt-2"><b>{S2.basis}</b> B<sub>0</sub> &gt; 0</p>
            <p className="mt-2">
              <b>{S2.inductive}</b> B<sub>k</sub> &gt; 0 ⇒ B<sub>k+1</sub> = (1+r−m)·B<sub>k</sub> &gt; 0 {S2.p2.because}
            </p>
            <Check>{S2.p2.check(factor.toFixed(6), factor > 0, n2, formatBaht(closedFormPct(B0, r, m, n2)), formatBaht(A0.rows[n2 - 1].end))}</Check>
            {v.floor ? <p className="text-sm text-muted">{S2.p2.floorNote}</p> : null}
          </div>

          <div data-testid="proof3" className="mt-6">
            <H3>{S2.p3.title}</H3>
            <Formula>
              B<sub>n</sub> ≥ B<sub>0</sub> {S2.p3.everyN}
            </Formula>
            <p><b>{S2.meaning}</b> {S2.p3.meaning}</p>
            <p className="mt-2"><b>{S2.basis}</b> B<sub>0</sub> ≥ B<sub>0</sub></p>
            <p className="mt-2">
              <b>{S2.inductive}</b> B<sub>k</sub> ≥ B<sub>0</sub> ⇒ B<sub>k+1</sub> = (1+r)·B<sub>k</sub> − p ≥ (1+r)·B<sub>0</sub> − p = B<sub>0</sub> + (r·B<sub>0</sub> − p) ≥ B<sub>0</sub>
            </p>
            <Check>{S2.p3.check(formatBaht(rB0), formatBaht(p), cond3, cond3 ? formatBaht(B.rows[11].end) : "")}</Check>
          </div>
        </Card>

        <Card>
          <Tag>{M.tagRec}</Tag>
          <H3>{M.step3.title}</H3>
          <p>{M.step3.setZero}</p>
          <Formula>
            p = r·<Bsub i={0} /> / (1 − (1+r)<sup>−n</sup>)
          </Formula>
          <p>{M.step3.usedBy}</p>
          <Check>
            {M.step3.check(String(v.n), rs, formatBaht(B0), need.rp.exact.toFixed(4), formatBaht(need.rp.roundedUp), durationText(need.sim))}
          </Check>
        </Card>

        <Card>
          <Tag>{M.tagInd}</Tag>
          <H3>{M.real.title}</H3>
          <ul className="grid gap-3">
            {M.real.items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-3">
                <span className="flex-1 min-w-[16rem]">{it.text}</span>
                <Button
                  onClick={() => {
                    runExample(it.id);
                    router.push(it.id === "exMulti" ? "/multi" : "/calculator#results-sec");
                  }}
                >{M.real.tryIt}</Button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <H3>{M.summaryTitle}</H3>
            <ol className="list-decimal pl-5 grid gap-1">
              {M.summaryItems.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Card>
          <Card>
            <H3>{M.vocabTitle}</H3>
            <ul className="list-disc pl-5 grid gap-1">
              {M.vocab.map(([term, def]) => (
                <li key={term}>
                  <b>{term}</b>
                  {def}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
