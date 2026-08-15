export interface TypographyScale {
  fontSize: string;
  lineHeight: string | number;
  letterSpacing: string;
  fontWeight: number;
  fontFamily?: string;
  textTransform?: React.CSSProperties["textTransform"];
  scale?: string;
}

export interface TypographyPreset {
  name: string;
  h1: TypographyScale;
  h2: TypographyScale;
  h3: TypographyScale;
  h4: TypographyScale;
  h5: TypographyScale;
  h6: TypographyScale;
  body1: TypographyScale;
  body2: TypographyScale;
  subtitle1: TypographyScale;
  subtitle2: TypographyScale;
  caption: TypographyScale;
  overline: TypographyScale;
  button: TypographyScale;
  code: TypographyScale;
}

