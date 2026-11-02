import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { login } from "../actions";

export const metadata = { title: "Iniciar sesión" };

// searchParams es dato de runtime: con cacheComponents va dentro de <Suspense>.
export default function LoginPage({ searchParams }) {
  return (
    <Suspense fallback={<AuthForm action={login} modo="login" />}>
      <LoginConNext searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginConNext({ searchParams }) {
  const { next } = await searchParams;
  return <AuthForm action={login} modo="login" next={typeof next === "string" ? next : undefined} />;
}
