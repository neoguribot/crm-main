"use client";

import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteCustomer,
  type DeleteCustomerState,
} from "@/app/customers/actions";

const INITIAL: DeleteCustomerState = { error: null };

export function DeleteCustomerButton({
  customerId,
  customerName,
  size = "sm",
}: {
  customerId: string;
  customerName: string;
  size?: "xs" | "sm" | "default";
}) {
  const action = deleteCustomer.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size={size}>
            삭제
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{customerName} 고객을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            고객 정보와 이 고객의 거래 기록이 모두 영구적으로 삭제됩니다. 되돌릴
            수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <form action={formAction}>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={pending}
            >
              {pending ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
