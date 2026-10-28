import { LinkButton } from "@/components/ui/primitives";
import { ReceiptMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <ReceiptMark className="size-16 opacity-60" />
      <h1 className="font-display text-4xl font-black uppercase italic text-white">No receipt found</h1>
      <p className="max-w-sm text-sm text-ink-400">That page doesn’t exist, or the take was hidden by moderators.</p>
      <LinkButton href="/">Back to Game Receipts</LinkButton>
    </div>
  );
}
