"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsOfServicePage() {
  const { lang } = useLanguage();
  const lastUpdated = "February 2, 2026";
  const lastUpdatedEl = "2 Φεβρουαρίου 2026";

  if (lang === "el") {
    return (
      <main className="min-h-full bg-background transition-colors duration-300">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-navy-soft hover:underline transition-colors duration-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Επιστροφή στην Αρχική
          </Link>

          <h1 className="mt-8 text-4xl font-bold text-foreground">Όροι Χρήσης</h1>
          <p className="mt-2 text-sm text-foreground-subtle">Τελευταία ενημέρωση: {lastUpdatedEl}</p>

          <div className="mt-8 space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Αποδοχή Όρων</h2>
              <p className="mt-3 leading-relaxed">
                Χρησιμοποιώντας την ιστοσελίδα και τις υπηρεσίες της PetPaw, συμφωνείτε με 
                αυτούς τους Όρους Χρήσης. Εάν δεν συμφωνείτε, παρακαλούμε μην χρησιμοποιείτε 
                τις υπηρεσίες μας.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Περιγραφή Υπηρεσίας</h2>
              <p className="mt-3 leading-relaxed">
                Η PetPaw παρέχει υπηρεσίες διαχείρισης προφίλ κατοικίδιων, συμπεριλαμβανομένων:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Δημιουργία και διαχείριση προφίλ κατοικίδιων</li>
                <li>Ετικέτες QR για αναγνώριση κατοικίδιων</li>
                <li>Σύστημα απώλειας και εύρεσης</li>
                <li>Ημερολόγιο και ιατρικά αρχεία (Pro)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Λογαριασμός Χρήστη</h2>
              <p className="mt-3 leading-relaxed">
                Είστε υπεύθυνοι για:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Τη διατήρηση της εμπιστευτικότητας του λογαριασμού σας</li>
                <li>Όλες τις δραστηριότητες που πραγματοποιούνται μέσω του λογαριασμού σας</li>
                <li>Την παροχή ακριβών και ενημερωμένων πληροφοριών</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Αποδεκτή Χρήση</h2>
              <p className="mt-3 leading-relaxed">
                Συμφωνείτε να μην:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Χρησιμοποιείτε την υπηρεσία για παράνομους σκοπούς</li>
                <li>Ανεβάζετε παραπλανητικό ή επιβλαβές περιεχόμενο</li>
                <li>Παραβιάζετε δικαιώματα πνευματικής ιδιοκτησίας τρίτων</li>
                <li>Προσπαθείτε να αποκτήσετε μη εξουσιοδοτημένη πρόσβαση σε συστήματα</li>
                <li>Χρησιμοποιείτε αυτοματοποιημένα εργαλεία χωρίς άδεια</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Περιεχόμενο Χρήστη</h2>
              <p className="mt-3 leading-relaxed">
                Διατηρείτε την ιδιοκτησία του περιεχομένου που ανεβάζετε (φωτογραφίες, 
                περιγραφές κατοικίδιων). Μας παραχωρείτε άδεια να χρησιμοποιούμε αυτό 
                το περιεχόμενο για την παροχή των υπηρεσιών μας.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Αγορές και Πληρωμές</h2>
              <p className="mt-3 leading-relaxed">
                Για αγορές ετικετών QR:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Οι τιμές αναγράφονται σε Ευρώ και περιλαμβάνουν ΦΠΑ</li>
                <li>Η πληρωμή γίνεται κατά την παραλαβή (αντικαταβολή) ή με κάρτα</li>
                <li>Η αποστολή γίνεται εντός 3-5 εργάσιμων ημερών</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Περιορισμός Ευθύνης</h2>
              <p className="mt-3 leading-relaxed">
                Η PetPaw παρέχεται "ως έχει". Δεν εγγυόμαστε:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Ότι η υπηρεσία θα είναι αδιάλειπτη ή χωρίς σφάλματα</li>
                <li>Την επιστροφή χαμένων κατοικίδιων</li>
                <li>Τη διαθεσιμότητα σε κάθε περιοχή</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                Σε καμία περίπτωση δεν θα είμαστε υπεύθυνοι για έμμεσες ή παρεπόμενες ζημίες.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Τερματισμός</h2>
              <p className="mt-3 leading-relaxed">
                Μπορούμε να τερματίσουμε ή να αναστείλουμε τον λογαριασμό σας ανά πάσα στιγμή 
                για παραβίαση αυτών των όρων. Μπορείτε να διαγράψετε τον λογαριασμό σας 
                ανά πάσα στιγμή μέσω των ρυθμίσεων.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Αλλαγές στους Όρους</h2>
              <p className="mt-3 leading-relaxed">
                Διατηρούμε το δικαίωμα να τροποποιήσουμε αυτούς τους όρους ανά πάσα στιγμή. 
                Οι αλλαγές τίθενται σε ισχύ αμέσως μετά τη δημοσίευση. Η συνεχής χρήση 
                συνιστά αποδοχή των νέων όρων.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">10. Εφαρμοστέο Δίκαιο</h2>
              <p className="mt-3 leading-relaxed">
                Αυτοί οι όροι διέπονται από το Ελληνικό δίκαιο. Τυχόν διαφορές θα επιλύονται 
                στα αρμόδια δικαστήρια της Αθήνας, Ελλάδα.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">11. Επικοινωνία</h2>
              <p className="mt-3 leading-relaxed">
                Για ερωτήσεις σχετικά με αυτούς τους όρους:
              </p>
              <p className="mt-3">
                <strong>Email:</strong>{" "}
                <a href="mailto:support@petpaw.gr" className="text-navy-soft hover:underline">
                  support@petpaw.gr
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <Link href="/privacy" className="text-navy-soft hover:underline">
              ← Πολιτική Απορρήτου
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // English version
  return (
    <main className="min-h-full bg-background transition-colors duration-300">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-navy-soft hover:underline transition-colors duration-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <h1 className="mt-8 text-4xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-foreground-subtle">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-3 leading-relaxed">
              By using the PetPaw website and services, you agree to these Terms of Service. 
              If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Service Description</h2>
            <p className="mt-3 leading-relaxed">
              PetPaw provides pet profile management services, including:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Creating and managing pet profiles</li>
              <li>QR tags for pet identification</li>
              <li>Lost and found system</li>
              <li>Journal and medical records (Pro)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Account</h2>
            <p className="mt-3 leading-relaxed">
              You are responsible for:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities conducted through your account</li>
              <li>Providing accurate and up-to-date information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
            <p className="mt-3 leading-relaxed">
              You agree not to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Use the service for illegal purposes</li>
              <li>Upload misleading or harmful content</li>
              <li>Violate third-party intellectual property rights</li>
              <li>Attempt unauthorized access to systems</li>
              <li>Use automated tools without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. User Content</h2>
            <p className="mt-3 leading-relaxed">
              You retain ownership of content you upload (photos, pet descriptions). 
              You grant us a license to use this content to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Purchases and Payments</h2>
            <p className="mt-3 leading-relaxed">
              For QR tag purchases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Prices are in Euros and include VAT</li>
              <li>Payment is made on delivery (COD) or by card</li>
              <li>Shipping is within 3-5 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p className="mt-3 leading-relaxed">
              PetPaw is provided "as is". We do not guarantee:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>That the service will be uninterrupted or error-free</li>
              <li>The return of lost pets</li>
              <li>Availability in every region</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              In no event shall we be liable for indirect or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Termination</h2>
            <p className="mt-3 leading-relaxed">
              We may terminate or suspend your account at any time for violation of 
              these terms. You may delete your account at any time through settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
            <p className="mt-3 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes take 
              effect immediately upon posting. Continued use constitutes acceptance 
              of new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Governing Law</h2>
            <p className="mt-3 leading-relaxed">
              These terms are governed by Greek law. Any disputes will be resolved 
              in the competent courts of Athens, Greece.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p className="mt-3 leading-relaxed">
              For questions about these terms:
            </p>
            <p className="mt-3">
              <strong>Email:</strong>{" "}
              <a href="mailto:support@petpaw.gr" className="text-navy-soft hover:underline">
                support@petpaw.gr
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <Link href="/privacy" className="text-navy-soft hover:underline">
            ← Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
