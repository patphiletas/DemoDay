"use server";
import { auth } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

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

  const response = await auth.api.signUpEmail({
    email: result.data.email,
    password: result.data.password,
    name: result.data.username,
  });

  return response.ok
    ? { success: true }
    : { success: false, error: "Une erreur est survenue, réessaie." };
}