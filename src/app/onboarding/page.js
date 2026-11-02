import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <OnboardingForm />
    </main>
  );
}
