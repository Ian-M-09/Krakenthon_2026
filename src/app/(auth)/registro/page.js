import AuthForm from "@/components/auth/AuthForm";
import { registro } from "../actions";

export const metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <AuthForm action={registro} modo="registro" />;
}
