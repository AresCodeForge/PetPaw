import Link from "next/link";

export const metadata = {
  title: "Προσβασιμότητα — PetPaw",
  description: "Δήλωση προσβασιμότητας PetPaw.",
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Προσβασιμότητα</h1>
      <p className="mt-4 text-foreground-muted">
        Δεσμευόμαστε να κάνουμε την PetPaw χρηστική για όλους.
      </p>
      <div className="mt-12 space-y-8 text-foreground-muted">
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Η δέσμευσή μας
          </h2>
          <p className="mt-2">
            Η PetPaw στοχεύει να πληρεί ή να ξεπερνά τα εφαρμοστέα πρότυπα προσβασιμότητας
            (όπως WCAG 2.1) όπου είναι εφικτό. Εργαζόμαστε ώστε ο ιστότοπος και οι ροές
            μας να είναι αισθητές, λειτουργικές και κατανοητές για χρήστες με διαφορετικές
            ικανότητες.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Σχόλια
          </h2>
          <p className="mt-2">
            Αν αντιμετωπίσετε εμπόδιο προσβασιμότητας στον ιστότοπό μας, παρακαλούμε
            επικοινωνήστε μαζί μας μέσω της σελίδας{" "}
            <Link href="/contact" className="text-navy-soft hover:underline transition-colors duration-300">
              Επικοινωνία
            </Link>
            . Θα κάνουμε το καλύτερο για να αντιμετωπίσουμε το ζήτημα και να βελτιώσουμε
            την εμπειρία σας.
          </p>
        </section>
        <p className="text-sm">
          Αυτό είναι ένα placeholder. Επεκτείνετε με την πλήρη δήλωση προσβασιμότητας
          και το επίπεδο συμμόρφωσης όταν είστε έτοιμοι.
        </p>
      </div>
      <p className="mt-12">
        <Link href="/" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          ← Πίσω στην αρχική
        </Link>
      </p>
    </div>
  );
}
