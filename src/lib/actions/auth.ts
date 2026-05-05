"use server";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signupSchema, signinSchema } from "@/lib/validation";

export type AuthState = { error: string } | null;

function forwardCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  headers: Headers
) {
  headers.getSetCookie().forEach((raw) => {
    const parts = raw.split("; ");
    const [nameRaw, ...valueParts] = parts[0].split("=");
    const value = valueParts.join("=");
    const opts: Parameters<typeof cookieStore.set>[2] = {};
    for (const part of parts.slice(1)) {
      const [k, v] = part.split("=");
      switch (k.toLowerCase().trim()) {
        case "httponly": opts.httpOnly = true; break;
        case "secure": opts.secure = true; break;
        case "path": opts.path = v; break;
        case "samesite": opts.sameSite = v?.toLowerCase() as "lax" | "strict" | "none"; break;
        case "max-age": opts.maxAge = parseInt(v); break;
        case "expires": opts.expires = new Date(v); break;
      }
    }
    cookieStore.set(nameRaw, value, opts);
  });
}

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

  let response: Response;
  try {
    response = await auth.api.signUpEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
        name: result.data.username,
      },
      asResponse: true,
    });
  } catch {
    return { error: "Une erreur est survenue, réessaie." };
  }

  if (!response.ok) {
    return { error: "Une erreur est survenue, réessaie." };
  }

  const cookieStore = await cookies();
  forwardCookies(cookieStore, response.headers);
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

  let response: Response;
  try {
    response = await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
      asResponse: true,
    });
  } catch {
    return { error: "Email ou mot de passe incorrect." };
  }

  if (!response.ok) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  forwardCookies(cookieStore, response.headers);
  redirect("/");
}

export async function signoutAction() {
  const response = await auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });

  const cookieStore = await cookies();
  forwardCookies(cookieStore, response.headers);
  redirect("/");
}
