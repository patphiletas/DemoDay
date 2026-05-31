import type { ZodError } from "zod";

export type ActionState = { error: string } | null;

export function actionError(message: string): Exclude<ActionState, null> {
  return { error: message };
}

export function validationActionError(error: ZodError): Exclude<ActionState, null> {
  return actionError(error.issues[0]?.message ?? "Données invalides.");
}
