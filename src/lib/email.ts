import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
// TODO: remplacer par ton domaine vérifié dans Resend (ex: noreply@alternative-mag.fr)
const FROM = "AlterNative <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function h(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Bienvenue sur AlterNative !",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;margin-bottom:8px">Bienvenue, ${h(name)} !</h1>
        <p style="color:#555;line-height:1.6">
          Ton compte AlterNative est créé. Tu peux dès maintenant soumettre tes manuscrits
          et interagir avec la communauté.
        </p>
        <a href="${APP_URL}" style="display:inline-block;margin-top:24px;padding:12px 24px;
          background:#000;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">
          Accéder à AlterNative
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          Si tu n'es pas à l'origine de cette inscription, ignore cet email.
        </p>
      </div>
    `,
  });
}

export async function sendManuscriptAcceptedEmail(
  to: string,
  name: string,
  title: string,
  editorNote: string,
  slug: string
) {
  const pubUrl = `${APP_URL}/publications/${slug}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Félicitations — "${title}" est accepté !`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;margin-bottom:8px">Bonne nouvelle, ${h(name)} !</h1>
        <p style="color:#555;line-height:1.6">
          Ton manuscrit <strong>${h(title)}</strong> a été accepté et publié sur AlterNative.
        </p>
        ${
          editorNote
            ? `<blockquote style="border-left:3px solid #000;margin:20px 0;padding:8px 16px;color:#444">
                ${h(editorNote)}
               </blockquote>`
            : ""
        }
        <a href="${pubUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;
          background:#000;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">
          Voir la publication
        </a>
      </div>
    `,
  });
}

export async function sendManuscriptRejectedEmail(
  to: string,
  name: string,
  title: string,
  reason: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Décision éditoriale — "${title}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;margin-bottom:8px">Bonjour ${h(name)},</h1>
        <p style="color:#555;line-height:1.6">
          Après examen, ton manuscrit <strong>${h(title)}</strong> n'a pas été retenu
          pour cette publication.
        </p>
        ${
          reason
            ? `<blockquote style="border-left:3px solid #999;margin:20px 0;padding:8px 16px;color:#444">
                ${h(reason)}
               </blockquote>`
            : ""
        }
        <p style="color:#555;line-height:1.6">
          Ne te décourage pas — tu peux soumettre un nouveau manuscrit à tout moment.
        </p>
        <a href="${APP_URL}/manuscripts/submit" style="display:inline-block;margin-top:24px;
          padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;
          font-size:14px">
          Soumettre un nouveau manuscrit
        </a>
      </div>
    `,
  });
}
