import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))] shadow hover:bg-[hsl(var(--color-hover, var(--color-primary)))]",
        destructive:
          "bg-[hsl(var(--color-destructive))] text-[hsl(var(--color-destructive-foreground))] shadow-sm hover:bg-[hsl(var(--color-destructive),0.9)]",
        outline:
          "border border-[hsl(var(--color-input))] bg-[hsl(var(--color-background))] shadow-sm hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))]",
        secondary:
          "bg-[hsl(var(--color-secondary))] text-[hsl(var(--color-secondary-foreground))] shadow-sm hover:bg-[hsl(var(--color-secondary),0.8)]",
        ghost:
          "hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))]",
        link: "text-[hsl(var(--color-primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        /**
         * No height/padding classes at all — for callers (e.g. themed
         * canvas-overlay buttons) whose own CSS module already declares
         * padding/height and needs full control of the box model. The
         * base classes (flex/gap/rounded/text/transition/focus/disabled)
         * still apply; only the size-driven box model is left unset.
         */
        unstyled: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
