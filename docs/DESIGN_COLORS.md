# PetPaw design colors (hex reference)

Use these hex values for consistent buttons and UI across the app.

## Buttons

### Green (primary / positive actions)
- **Background:** `#98d8aa`
- **Hover background:** `#7bc99a`
- **Text on green:** `#2d2a26`

Use for: Submit, Continue, Order QR, Save, primary CTAs.

**Tailwind:** `bg-[#98d8aa] text-[#2d2a26] hover:bg-[#7bc99a]`

---

### Blue (secondary / back / cancel / links)
- **Border & text:** `#4a6fa5`
- **Hover background (light tint):** `#4a6fa5` at 10% opacity → `#4a6fa5]/10`

Use for: Back, Cancel, Login (navbar), Edit Avatar, secondary actions.

**Tailwind:** `border-2 border-[#4a6fa5] bg-white text-[#4a6fa5] hover:bg-[#4a6fa5]/10`

---

## Other UI colors

| Use            | Hex       | Notes                    |
|----------------|-----------|--------------------------|
| Body text      | `#2d2a26` | Primary foreground       |
| Headings       | `#2c3e50` | Slightly darker (navy)   |
| Muted text     | `#5a5652` | Descriptions, secondary  |
| Input border   | `#e8e2d8` | Form fields              |
| Focus ring     | `#98d8aa` | Green focus (inputs)     |
| Cream / cards  | `#fdf6e9` | Light background         |
| Page background| `#fef9f3` | Slightly off-white       |
| Divider/border | `#f0e6d8` | Subtle borders           |

---

## CSS variables (globals.css)

- `--mint` = `#98d8aa` (green primary)
- `--navy-soft` = `#4a6fa5` (blue secondary)
- `--foreground` = `#2d2a26`
- `--navy` = `#2c3e50`
- `--cream` = `#fdf6e9`
- `--background` = `#fef9f3`
