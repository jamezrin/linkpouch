/**
 * Feature flags
 *
 * Flip a flag here to enable/disable a feature globally.
 * To wire a flag to an environment variable in the future, replace the
 * literal with e.g.:  import.meta.env.VITE_FEATURE_DEMO_BUTTON === 'true'
 */
export const features = {
  /** Show the sparkle "Add demo links" button in the app header on pouch pages */
  demoButton: true,
} as const;
