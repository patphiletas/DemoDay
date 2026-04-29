"use server";
import { auth } from "@/lib/auth";
import { signupSchema, signinSchema } from "@/lib/validation";

export type AuthState = {
  success: boolean;
  error?: string;
};

export async function signupAction(
  _prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const result = signupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
        name: result.data.username,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Une erreur est survenue, réessaie." };
  }
}

export async function signinAction(
  _prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const result = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Email ou mot de passe incorrect." };
  }
}