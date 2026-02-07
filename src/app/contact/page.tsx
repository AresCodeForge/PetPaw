import Link from "next/link";

export const metadata = {
  title: "Επικοινωνία — PetPaw",
  description: "Επικοινωνήστε με την ομάδα PetPaw.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Επικοινωνήστε μαζί μας</h1>
      <p className="mt-4 text-foreground-muted">
        Έχετε ερώτηση ή σχόλια; Θα χαρούμε να ακούσουμε από εσάς.
      </p>
      <div className="mt-12 space-y-6 rounded-2xl border border-border bg-background-secondary p-8">
        <p className="text-sm text-foreground-muted">
          <strong>Email:</strong> support@petpaw.example
        </p>
        <p className="text-sm text-foreground-muted">
          <strong>Υποστήριξη:</strong> Για βοήθεια με παραγγελίες και λογαριασμό, χρησιμοποιήστε
          το email παραπάνω. Συνήθως απαντάμε εντός 24–48 ωρών.
        </p>
        <p className="text-sm text-foreground-muted">
          Μπορεί να προστεθεί πλήρες φόρμα επικοινωνίας εδώ όταν είστε έτοιμοι να τη
          συνδέσετε με το backend ή την υπηρεσία email σας.
        </p>
      </div>
      <p className="mt-8">
        <Link href="/" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          ← Πίσω στην αρχική
        </Link>
      </p>
    </div>
  );
}
