"use server";
import { auth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { authRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionError, type ActionState, validationActionError } from "@/lib/errors";
import { signupSchema, signinSchema } from "@/lib/validation";

export type AuthState = ActionState;

export async function signupAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await authRateLimit("signup"))) {
    return actionError("Trop de tentatives. Réessaie dans 15 minutes.");
  }

  if (formData.get("password") !== formData.get("confirmPassword")) {
    return actionError("Les mots de passe ne correspondent pas.");
  }

  const result = signupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return validationActionError(result.error);
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
        name: result.data.username,
      },
    });
  } catch {
    return actionError("Une erreur est survenue, réessaie.");
  }

  // Email envoyé en best-effort : une erreur ne bloque pas l'inscription
  sendWelcomeEmail(result.data.email, result.data.username).catch(() => null);

  redirect("/");
}

export async function signinAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!(await authRateLimit("signin"))) {
    return actionError("Trop de tentatives. Réessaie dans 15 minutes.");
  }

  const result = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return validationActionError(result.error);
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
    });
  } catch {
    return actionError("Email ou mot de passe incorrect.");
  }

  redirect("/");
}

export async function signoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/");
}
