import { z } from "zod";
import { isValidCPF } from "./cpf";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome completo."),
    email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const addressSchema = z.object({
  recipient: z.string().min(2, "Informe o nome do destinatário."),
  cpf: z.string().refine(isValidCPF, "CPF inválido."),
  zip: z.string().min(8, "CEP inválido.").max(9, "CEP inválido."),
  street: z.string().min(2, "Informe a rua."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Informe o bairro."),
  city: z.string().min(2, "Informe a cidade."),
  state: z.string().length(2, "Use a sigla do estado (ex: RN)."),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const savedAddressSchema = addressSchema.extend({
  label: z.string().min(1, "Dê um nome para este endereço (ex: Casa, Trabalho)."),
});

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

export const cardPaymentSchema = z.object({
  cardName: z.string().min(2, "Informe o nome impresso no cartão."),
  cardNumber: z
    .string()
    .min(13, "Número de cartão inválido.")
    .max(19, "Número de cartão inválido."),
  cardExpiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use o formato MM/AA."),
  cardCvv: z.string().regex(/^\d{3,4}$/, "CVV inválido."),
});

export type CardPaymentInput = z.infer<typeof cardPaymentSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  subject: z.string().min(2, "Informe o assunto."),
  message: z.string().min(10, "Escreva uma mensagem com pelo menos 10 caracteres."),
});

export type ContactInput = z.infer<typeof contactSchema>;
