import { z } from "zod";
import { BR_STATES, isValidBrPhone } from "@/lib/br-format";
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

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
});

export type ProfileInput = z.infer<typeof profileSchema>;

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
  zip: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido. Use 8 números (ex: 59064-120)."),
  street: z.string().min(2, "Informe a rua."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Informe o bairro."),
  city: z.string().min(2, "Informe a cidade."),
  state: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .refine((value) => (BR_STATES as readonly string[]).includes(value), "Use a sigla do estado (ex: RN)."),
});

export type AddressInput = z.infer<typeof addressSchema>;

/** Endereço do checkout: o mesmo de sempre + telefone de contato (WhatsApp/entrega), que o endereço salvo da conta não guarda. */
export const checkoutAddressSchema = addressSchema.extend({
  phone: z.string().refine(isValidBrPhone, "Informe um telefone com DDD (ex: (84) 99999-9999)."),
});

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;

export const savedAddressSchema = addressSchema.extend({
  label: z.string().min(1, "Dê um nome para este endereço (ex: Casa, Trabalho)."),
});

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  subject: z.string().min(2, "Informe o assunto."),
  message: z.string().min(10, "Escreva uma mensagem com pelo menos 10 caracteres."),
});

export type ContactInput = z.infer<typeof contactSchema>;
