export const useCssVariables = (): {
  applyCssVariables: (variables: Record<string, unknown>) => void;
  getCssVariable: (name: string) => string;
} => {
  const toCssChannels = (value: unknown): string =>
    String(value)
      .replace(/^hsla?\(/, "")
      .replace(/\)$/, "")
      .replace(/,/g, "");

  const applyCssVariables = (variables: Record<string, unknown>): void => {
    Object.entries(variables).forEach(([category, values]) => {
      if (values && typeof values === "object") {
        Object.entries(values).forEach(([key, value]) => {
          const cssValue =
            category === "colors" ? toCssChannels(value) : String(value);
          document.documentElement.style.setProperty(
            `--theme-${category}-${key}`,
            cssValue,
          );

          if (category === "colors") {
            const alias = key.replace(
              /[A-Z]/g,
              (letter) => `-${letter.toLowerCase()}`,
            );
            document.documentElement.style.setProperty(
              `--color-${alias}`,
              cssValue,
            );
          }
        });
      }
    });
  };

  const getCssVariable = (name: string): string => {
    // Implementation of getCssVariable
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue(`--${name}`);
  };

  return { applyCssVariables, getCssVariable };
};
