/** Allowed pet types (for dropdowns and validation). Values stored in DB. */
export const PET_TYPES = ["Dog", "Cat"] as const;
export type PetType = (typeof PET_TYPES)[number];
