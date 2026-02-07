import Link from "next/link";

export const metadata = {
  title: "Αποστολή και επιστροφές — PetPaw",
  description: "Πολιτική αποστολής και επιστροφών PetPaw.",
};

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-foreground">Αποστολή και επιστροφές</h1>
      <div className="mt-12 space-y-8 text-foreground-muted">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Αποστολή</h2>
          <p className="mt-2">
            Αποστέλλουμε τα μπρελόκ QR της PetPaw στη διεύθυνση που δίνετε κατά την
            αγορά. Οι χρόνοι παράδοσης και το κόστος εξαρτώνται από την τοποθεσία σας
            και την επιλογή που κάνετε. Θα λάβετε πληροφορίες παρακολούθησης μόλις
            αποσταλεί η παραγγελία σας.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">Επιστροφές</h2>
          <p className="mt-2">
            Αν δεν είστε ικανοποιημένοι με το μπρελόκ σας, επικοινωνήστε μαζί μας
            εντός 30 ημερών από την παράδοση. Θα συνεργαστούμε για επιστροφές ή
            αντικαταστάσεις σύμφωνα με την πλήρη πολιτική μας. Ελαττωματικά αντικείμενα
            αντικαθίστανται χωρίς επιπλέον κόστος.
          </p>
        </section>
        <p className="text-sm">
          Αυτό είναι ένα placeholder. Αντικαταστήστε με τους πραγματικούς όρους
          αποστολής και επιστροφών πριν την έναρξη λειτουργίας.
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
