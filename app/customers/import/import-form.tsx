"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { importCustomers } from "@/app/customers/import/actions";
import { initialImportState } from "@/app/customers/import/form-state";

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importCustomers,
    initialImportState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="file"
        name="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/70"
      />

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "불러오는 중…" : "불러오기"}
      </Button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.status === "done" ? (
        <div className="flex flex-col gap-2 rounded-md border bg-card p-4 text-sm">
          <p className="font-medium">{state.message}</p>
          <div className="flex gap-4 text-muted-foreground">
            <span>등록 {state.inserted}건</span>
            <span>중복 건너뜀 {state.skipped}건</span>
            <span>오류 {state.errors.length}건</span>
          </div>
          {state.errors.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-0.5 text-destructive">
              {state.errors.map((e) => (
                <li key={e.row}>
                  {e.row}행: {e.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
