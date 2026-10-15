"use client";

import { useState } from "react";
import { AttemptList } from "@/components/attempt-list";
import { Button } from "@/components/ui/button";
import type { AttemptSummary } from "@/lib/types";

const STEP = 15;

export function AttemptHistory({ attempts }: { attempts: AttemptSummary[] }) {
  const [visible, setVisible] = useState(STEP);

  return (
    <>
      <AttemptList attempts={attempts.slice(0, visible)} />
      {attempts.length > visible ? (
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-500">
            {visible} di {attempts.length} esercitazioni
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVisible((value) => value + STEP)}
          >
            Mostra altre
          </Button>
        </div>
      ) : null}
    </>
  );
}
