"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signupSchema, signinSchema } from "@/lib/validation";

export type AuthState = { error: string } | null;

export async function signupAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (formData.get("password") !== formData.get("confirmPassword")) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const result = signupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
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
    return { error: "Une erreur est survenue, réessaie." };
  }

  redirect("/");
}

export async function signinAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const result = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
    });
  } catch {
    return { error: "Email ou mot de passe incorrect." };
  }

  redirect("/");
}

export async function signoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/");
}
