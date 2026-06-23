export * from "./component-mappings/index";
export * from "./component-variants";
export * from "./color-mappings";
export * from "./state-mappings";
export * from "./system-mappings";
export * from "./theme-mappings";
export * from "./typography-mappings";

// TableVariant is declared in both ./component-variants and ./state-mappings.
// Re-export the component-variant definition explicitly to resolve the
// star-export ambiguity (TS2308).
export type { TableVariant } from "./component-variants";
