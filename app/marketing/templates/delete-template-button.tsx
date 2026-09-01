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
  deleteTemplate,
  type DeleteTemplateState,
} from "@/app/marketing/templates/actions";

const INITIAL: DeleteTemplateState = { error: null };

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const action = deleteTemplate.bind(null, templateId);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="xs">
            삭제
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{templateName} 템플릿을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            이 템플릿으로 보낸 발송 이력은 남고, 템플릿 연결만 해제됩니다.
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
