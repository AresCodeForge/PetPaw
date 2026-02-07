"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicyPage() {
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

          <h1 className="mt-8 text-4xl font-bold text-foreground">Πολιτική Απορρήτου</h1>
          <p className="mt-2 text-sm text-foreground-subtle">Τελευταία ενημέρωση: {lastUpdatedEl}</p>

          <div className="mt-8 space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Εισαγωγή</h2>
              <p className="mt-3 leading-relaxed">
                Η PetPaw ("εμείς", "μας" ή "η εταιρεία") δεσμεύεται να προστατεύει την ιδιωτικότητά σας. 
                Αυτή η Πολιτική Απορρήτου εξηγεί πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα 
                προσωπικά σας δεδομένα όταν χρησιμοποιείτε την ιστοσελίδα και τις υπηρεσίες μας.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Δεδομένα που Συλλέγουμε</h2>
              <p className="mt-3 leading-relaxed">Συλλέγουμε τα ακόλουθα δεδομένα:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Στοιχεία λογαριασμού:</strong> Διεύθυνση email, όνομα (όταν παρέχεται)</li>
                <li><strong>Πληροφορίες κατοικίδιων:</strong> Όνομα, είδος, ηλικία, περιγραφή, φωτογραφίες</li>
                <li><strong>Δεδομένα παραγγελιών:</strong> Διεύθυνση αποστολής, ιστορικό παραγγελιών</li>
                <li><strong>Τεχνικά δεδομένα:</strong> Διεύθυνση IP, τύπος browser, για σκοπούς ασφαλείας</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Πώς Χρησιμοποιούμε τα Δεδομένα σας</h2>
              <p className="mt-3 leading-relaxed">Χρησιμοποιούμε τα δεδομένα σας για:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>Παροχή και βελτίωση των υπηρεσιών μας</li>
                <li>Διαχείριση του λογαριασμού σας</li>
                <li>Επεξεργασία παραγγελιών και αποστολών</li>
                <li>Επικοινωνία σχετικά με τις υπηρεσίες μας</li>
                <li>Συμμόρφωση με νομικές υποχρεώσεις</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Νομική Βάση Επεξεργασίας (GDPR)</h2>
              <p className="mt-3 leading-relaxed">
                Επεξεργαζόμαστε τα δεδομένα σας βάσει:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Εκτέλεση σύμβασης:</strong> Για την παροχή των υπηρεσιών που ζητήσατε</li>
                <li><strong>Έννομο συμφέρον:</strong> Για τη βελτίωση και ασφάλεια των υπηρεσιών μας</li>
                <li><strong>Συγκατάθεση:</strong> Όπου απαιτείται, με τη ρητή σας συναίνεση</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Κοινοποίηση Δεδομένων</h2>
              <p className="mt-3 leading-relaxed">
                Δεν πουλάμε τα προσωπικά σας δεδομένα. Μπορεί να τα μοιραστούμε με:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Supabase:</strong> Πάροχος υποδομής βάσης δεδομένων (EU servers)</li>
                <li><strong>Google:</strong> Εάν επιλέξετε σύνδεση μέσω Google</li>
                <li><strong>Υπηρεσίες αποστολής:</strong> Για την ολοκλήρωση παραγγελιών</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Τα Δικαιώματά σας (GDPR)</h2>
              <p className="mt-3 leading-relaxed">Έχετε δικαίωμα:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Πρόσβασης:</strong> Να ζητήσετε αντίγραφο των δεδομένων σας</li>
                <li><strong>Διόρθωσης:</strong> Να διορθώσετε ανακριβή δεδομένα</li>
                <li><strong>Διαγραφής:</strong> Να ζητήσετε διαγραφή των δεδομένων σας ("δικαίωμα στη λήθη")</li>
                <li><strong>Φορητότητας:</strong> Να λάβετε τα δεδομένα σας σε μορφή που μπορείτε να μεταφέρετε</li>
                <li><strong>Εναντίωσης:</strong> Να αντιταχθείτε σε ορισμένους τύπους επεξεργασίας</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                Για να ασκήσετε τα δικαιώματά σας, επικοινωνήστε μαζί μας στο{" "}
                <a href="mailto:privacy@petpaw.gr" className="text-navy-soft hover:underline">
                  privacy@petpaw.gr
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Ασφάλεια Δεδομένων</h2>
              <p className="mt-3 leading-relaxed">
                Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα για την προστασία των δεδομένων σας, 
                συμπεριλαμβανομένης της κρυπτογράφησης δεδομένων σε αποθήκευση και μεταφορά, 
                ελέγχων πρόσβασης και τακτικών αξιολογήσεων ασφαλείας.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Διατήρηση Δεδομένων</h2>
              <p className="mt-3 leading-relaxed">
                Διατηρούμε τα δεδομένα σας όσο διατηρείτε ενεργό λογαριασμό ή όσο απαιτείται 
                για την παροχή υπηρεσιών. Μετά τη διαγραφή λογαριασμού, τα δεδομένα διαγράφονται 
                εντός 30 ημερών, εκτός εάν απαιτείται διατήρηση για νομικούς λόγους.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Cookies</h2>
              <p className="mt-3 leading-relaxed">
                Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία της ιστοσελίδας και τη 
                διαχείριση συνεδριών. Δεν χρησιμοποιούμε cookies παρακολούθησης ή διαφημίσεων.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">10. Αλλαγές στην Πολιτική</h2>
              <p className="mt-3 leading-relaxed">
                Μπορεί να ενημερώνουμε αυτήν την πολιτική περιοδικά. Θα σας ειδοποιήσουμε για 
                σημαντικές αλλαγές μέσω email ή ειδοποίησης στην ιστοσελίδα μας.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">11. Επικοινωνία</h2>
              <p className="mt-3 leading-relaxed">
                Για ερωτήσεις σχετικά με αυτήν την πολιτική ή τα δεδομένα σας:
              </p>
              <p className="mt-3">
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@petpaw.gr" className="text-navy-soft hover:underline">
                  privacy@petpaw.gr
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <Link href="/terms" className="text-navy-soft hover:underline">
              Όροι Χρήσης →
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

        <h1 className="mt-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-foreground-subtle">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="mt-3 leading-relaxed">
              PetPaw ("we", "us", or "the company") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and protect your personal data 
              when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <p className="mt-3 leading-relaxed">We collect the following data:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Account information:</strong> Email address, name (when provided)</li>
              <li><strong>Pet information:</strong> Name, species, age, description, photos</li>
              <li><strong>Order data:</strong> Shipping address, order history</li>
              <li><strong>Technical data:</strong> IP address, browser type, for security purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Data</h2>
            <p className="mt-3 leading-relaxed">We use your data to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Provide and improve our services</li>
              <li>Manage your account</li>
              <li>Process orders and shipments</li>
              <li>Communicate about our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Legal Basis for Processing (GDPR)</h2>
            <p className="mt-3 leading-relaxed">
              We process your data based on:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Contract performance:</strong> To provide the services you requested</li>
              <li><strong>Legitimate interest:</strong> To improve and secure our services</li>
              <li><strong>Consent:</strong> Where required, with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Sharing</h2>
            <p className="mt-3 leading-relaxed">
              We do not sell your personal data. We may share it with:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Supabase:</strong> Database infrastructure provider (EU servers)</li>
              <li><strong>Google:</strong> If you choose to sign in with Google</li>
              <li><strong>Shipping services:</strong> To fulfill orders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights (GDPR)</h2>
            <p className="mt-3 leading-relaxed">You have the right to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a transferable format</li>
              <li><strong>Object:</strong> Object to certain types of processing</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              To exercise your rights, contact us at{" "}
              <a href="mailto:privacy@petpaw.gr" className="text-navy-soft hover:underline">
                privacy@petpaw.gr
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Data Security</h2>
            <p className="mt-3 leading-relaxed">
              We implement technical and organizational measures to protect your data, 
              including encryption of data at rest and in transit, access controls, 
              and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Data Retention</h2>
            <p className="mt-3 leading-relaxed">
              We retain your data as long as you maintain an active account or as needed 
              to provide services. After account deletion, data is deleted within 30 days, 
              unless retention is required for legal reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Cookies</h2>
            <p className="mt-3 leading-relaxed">
              We use essential cookies for website functionality and session management. 
              We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Policy Changes</h2>
            <p className="mt-3 leading-relaxed">
              We may update this policy periodically. We will notify you of significant 
              changes via email or notice on our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p className="mt-3 leading-relaxed">
              For questions about this policy or your data:
            </p>
            <p className="mt-3">
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@petpaw.gr" className="text-navy-soft hover:underline">
                privacy@petpaw.gr
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <Link href="/terms" className="text-navy-soft hover:underline">
            Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  );
}
