import { SignupForm } from "@/components/app/forms";

export const metadata = { title: "Join" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-center font-display text-3xl font-black uppercase italic text-white">Get on the record</h1>
      <p className="mb-6 text-center text-sm text-ink-400">Your first locked take is about a minute away.</p>
      <SignupForm />
    </>
  );
}
