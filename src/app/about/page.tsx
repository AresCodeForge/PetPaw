import Link from "next/link";

export const metadata = {
  title: "Σχετικά με εμάς — PetPaw",
  description: "Μάθετε για την PetPaw και την αποστολή μας.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Σχετικά με εμάς</h1>
      <p className="mt-4 text-lg text-foreground-muted">
        Η PetPaw είναι μια έξυπνη λύση για ιδιοκτήτες κατοικιδίων που θέλουν τα
        κατοικίδιά τους αναγνωρίσιμα και ασφαλή.
      </p>
      <div className="mt-12 space-y-6 text-foreground-muted">
        <p>
          Δημιουργήσαμε την PetPaw ώστε μια απλή σάρωση ενός μπρελόκ QR στο λουρί
          του κατοικίδιού σας να δίνει σε όσους το βρουν τις απαραίτητες πληροφορίες
          για να σας επανασυνδέσουν—ενώ εσείς έχετε πλήρη έλεγχο στο τι κοινοποιείται και
          ποιος βλέπει το πλήρες προφίλ του κατοικίδιού σας.
        </p>
        <p>
          Η αποστολή μας είναι να κάνουμε την ταυτοποίηση κατοικιδίων εύκολη, ορατή και
          ενημερώσιμη χωρίς να αντικαθιστούμε τα microchips ή την τοπική εγγραφή—απλά
          τα συμπληρώνουμε με κάτι που μπορεί ο καθένας να σκανάρει.
        </p>
      </div>
      <p className="mt-12">
        <Link href="/contact" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          Επικοινωνήστε μαζί μας
        </Link>
      </p>
    </div>
  );
}
