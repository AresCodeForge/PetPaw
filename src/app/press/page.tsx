import Link from "next/link";

export const metadata = {
  title: "Τύπος — PetPaw",
  description: "Πληροφορίες για τα μέσα και τους πόρους PetPaw.",
};

export default function PressPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Τύπος</h1>
      <p className="mt-4 text-foreground-muted">
        Υλικό τύπου, λογότυπα και ερωτήσεις τύπου.
      </p>
      <div className="mt-12 space-y-6 rounded-2xl border border-border bg-background-secondary p-8 text-foreground-muted">
        <p>
          Για ερωτήσεις τύπου, επικοινωνήστε μαζί μας στο{" "}
          <Link href="/contact" className="text-navy-soft hover:underline transition-colors duration-300">
            Επικοινωνία
          </Link>
          .
        </p>
        <p>
          Το σετ τύπου (λογότυπα, εικόνες προϊόντων, φύλλο πληροφοριών) μπορεί να
          προστεθεί εδώ όταν είναι διαθέσιμο.
        </p>
        <Link href="/" className="inline-block text-navy-soft font-semibold hover:underline transition-colors duration-300">
          ← Πίσω στην αρχική
        </Link>
      </div>
    </div>
  );
}
