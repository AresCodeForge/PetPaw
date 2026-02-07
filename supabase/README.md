# Supabase setup for PetPaw

PetPaw uses **password-based authentication** (no magic links by default).

## 1. Run the schema (create tables)

**Do not type the file path in the SQL Editor.** You must paste the **contents** of the SQL file.

1. Open `schema.sql` in your code editor (e.g. Cursor / VS Code).
2. Select all the SQL (Ctrl+A / Cmd+A), then copy (Ctrl+C / Cmd+C).
3. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor** → **New query**.
4. Paste the copied SQL into the editor.
5. Click **Run** (or Ctrl+Enter).

You should see “Success. No rows returned” (creating tables returns no rows). The schema also adds the `pet_images` table and storage bucket **pet-images** for photo uploads. If the storage bucket insert fails, create a bucket named `pet-images` in **Storage** in the Dashboard and set it to **Public**.

**Migrations (αν χρειάζεται):** Ανοίξτε το αντίστοιχο αρχείο στο `supabase/migrations/`, αντιγράψτε όλο το περιεχόμενο, επικολλήστε στο SQL Editor → Run. Περιμένετε λίγα δευτερόλεπτα.
- **001_lost_found_reports.sql** — σφάλμα για `lost_found_reports` στο "Χάθηκα!".
- **002_pet_journal_day_colors.sql** — "Could not find the table 'public.pet_journal_day_colors'" ή σφάλμα στο ημερολόγιο.
- **003_pet_journal_entry_date.sql** — "Αποτυχία φόρτωσης ημερολογίου" ή χαμένες καταχωρήσεις (προσθήκη στήλης `entry_date`).

## 2. Authentication

- **Login:** Email + password (`/login`).
- **Sign up:** Get a QR Tag page (`/get-qr-tag`) creates an account with email + password and optional pet metadata; after signup you’re redirected to the dashboard.
- **Forgot password:** `/forgot-password` sends a reset link to the user’s email (uses Supabase’s email; rate limits may apply).

In Supabase Dashboard → **Authentication** → **Providers**, ensure **Email** is enabled. You can leave “Confirm email” on or off; if it’s on, users must confirm before logging in after signup.

### 2.1 Branded auth emails (PetPaw instead of Supabase)

By default, confirmation and password-reset emails show "Supabase Auth" as sender and `noreply@mail.app.supabase.io`. To show your business name and your domain:

**A) Custom SMTP (recommended for production)**  
1. Supabase Dashboard → **Project Settings** (gear) → **Auth** → **SMTP Settings**.  
2. Enable **Custom SMTP**.  
3. Set **Sender email** to your domain (e.g. `noreply@yourdomain.com`).  
4. Set **Sender name** to `PetPaw`.  
5. Fill in your SMTP provider details (Resend, SendGrid, AWS SES, etc.).  

Then the "From" line will show **PetPaw** and your email address instead of Supabase.

**B) Email templates (text inside the email)**  
1. Supabase Dashboard → **Authentication** → **Email Templates**.  
2. Open **Confirm signup**.  
   - **Subject:** e.g. `Confirm your PetPaw account`  
   - **Body (HTML):** replace the default text with something like:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your PetPaw account</a></p>
<p>You're receiving this email because you signed up for PetPaw.</p>
```

3. Optionally edit **Magic Link** and **Change Email Address** the same way so all auth emails mention PetPaw instead of "application powered by Supabase".

Without custom SMTP, the "From" address will still be Supabase's; only the template body and subject change. For full branding (sender name + your domain), use custom SMTP.

## 3. Admin and QR batch printing

For batch creation of QR labels and PDF export (admin only), set in `.env.local`: `ADMIN_EMAIL` (comma-separated emails) and/or `ADMIN_USER_IDS` (comma-separated UUIDs), and `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Settings → API. Admin page: `/admin/qr-batch`. Pre-print flow: create tags, download PDF, ship keyrings; customers activate at `/r/{short_code}`.

## 4. "Χάθηκα!" (report found)

Όταν κάποιος πατά "Χάθηκα!" στο δημόσιο προφίλ και εισάγει τηλέφωνο, η αναφορά αποθηκεύεται στη βάση. Ο **κάτοχος** βλέπει τις ειδοποιήσεις στο **dashboard** (μπλοκ "Κάποιος βρήκε το ζωάκι σας") με τηλέφωνο και ημερομηνία και μπορεί να διαγράψει κάθε μία με το εικονίδιο κάδου στα δεξιά. Δεν χρησιμοποιείται εξωτερική υπηρεσία email — μόνο Supabase και το dashboard (χωρίς έξτρα κόστη).

Βεβαιωθείτε ότι έχει τρέξει το migration για `lost_found_reports` (βλ. `supabase/migrations/001_lost_found_reports.sql`).
