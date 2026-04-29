import { z } from "zod";


export const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(100, "Le nom d'utilisateur ne peut pas dépasser 100 caractères")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et points"
    ),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const signinSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const manuscriptSchema = z.object({
  title: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(255, "Le titre ne peut pas dépasser 255 caractères"),
  content: z
    .string()
    .min(100, "Le contenu doit contenir au moins 100 caractères"),
  category: z.string().min(1, "La catégorie est requise"),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Le commentaire ne peut pas être vide")
    .max(500, "Le commentaire ne peut pas dépasser 500 caractères"),
  publicationId: z.number().int().positive(),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  publicationId: z.number().int().positive(),
});


export const reportSchema = z.object({
  commentId: z.number().int().positive(),
  reason: z
    .string()
    .min(10, "La raison doit contenir au moins 10 caractères")
    .max(500, "La raison ne peut pas dépasser 500 caractères"),
});

// 
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ManuscriptInput = z.infer<typeof manuscriptSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
