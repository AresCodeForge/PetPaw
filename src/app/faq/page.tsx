import Link from "next/link";

export const metadata = {
  title: "Συχνές ερωτήσεις — PetPaw",
  description: "Συχνές ερωτήσεις για την PetPaw.",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "Τι είναι η ετικέτα QR της PetPaw;",
      a: "Είναι ένα ανθεκτικό μπρελόκ με μοναδικό κωδικό QR που κουμπώνει στο λουρί του κατοικίδιού σας. Όταν κάποιος το σκανάρει, βλέπει τις πληροφορίες που επιλέξατε να είναι δημόσιες (π.χ. όνομα, τα στοιχεία επικοινωνίας σας).",
    },
    {
      q: "Χρειάζεται να αντικαταστήσω το microchip του κατοικίδιού μου;",
      a: "Όχι. Η PetPaw είναι μια επιπλέον μορφή ταυτοποίησης. Τα microchips και η τοπική εγγραφή παραμένουν σημαντικά· η ετικέτα QR μας δίνει σε όσους βρουν το κατοικίδιο άμεση πρόσβαση σε πληροφορίες χωρίς σκανάρισμα.",
    },
    {
      q: "Ποιος βλέπει τις πληροφορίες του κατοικίδιού μου;",
      a: "Όταν είστε συνδεδεμένοι ως ιδιοκτήτης, βλέπετε το πλήρες προφίλ. Όταν κάποιος άλλος σκανάρει το QR (χωρίς να είναι συνδεδεμένος ως εσείς), βλέπει μόνο τις δημόσιες πληροφορίες που ορίσατε—όπως το όνομα του κατοικίδιού και πώς να επικοινωνήσει μαζί σας.",
    },
    {
      q: "Πώς μπορώ να αποκτήσω ετικέτα QR;",
      a: "Παραγγείλετε μέσω της σελίδας Λήψη ετικέτας QR. Θα λάβετε το μπρελόκ ταχυδρομικώς και μπορείτε να ρυθμίσετε το προφίλ του κατοικίδιού σας στον λογαριασμό σας.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Συχνές ερωτήσεις</h1>
      <p className="mt-4 text-foreground-muted">
        Κοινές ερωτήσεις για την PetPaw και τις ετικέτες QR μας.
      </p>
      <dl className="mt-12 space-y-8">
        {faqs.map((item, i) => (
          <div key={i}>
            <dt className="text-lg font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-2 text-foreground-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-12">
        <Link href="/contact" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          Έχετε ακόμα ερωτήσεις; Επικοινωνήστε μαζί μας
        </Link>
      </p>
    </div>
  );
}
