import TWAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        panel: "hsl(var(--panel))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semantic colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        income: "hsl(var(--income))",
        // Premium Accents based on images
        neon: {
          green: "#d4ff00",
          purple: "#7c3aed",
          blue: "#2563eb",
          cyan: "#06b6d4",
        },
        // Theme-aware surface tokens
        surface: {
          hover: "var(--surface-hover)",
          "hover-strong": "var(--surface-hover-strong)",
          indicator: "var(--surface-indicator)",
          input: "var(--surface-input)",
          overlay: "var(--surface-overlay)",
          "overlay-heavy": "var(--surface-overlay-heavy)",
        },
      },
      borderColor: {
        subtle: "var(--border-subtle)",
        glass: "var(--border-glass)",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(180deg, var(--surface-hover) 0%, transparent 100%)",
        "glass-border": "linear-gradient(180deg, var(--border-glass) 0%, transparent 100%)",
      },
      boxShadow: {
        'glow-sm': '0 0 10px var(--glow-primary-shadow)',
        'glow': '0 0 15px var(--glow-primary-shadow)',
        'glow-lg': '0 0 15px var(--glow-primary-shadow-strong)',
        'glow-xl': '0 0 25px var(--glow-primary-shadow-intense)',
        'glow-accent': '0 0 15px var(--glow-accent-shadow)',
        'glow-accent-lg': '0 0 15px var(--glow-accent-shadow-strong)',
        'glow-success': '0 0 15px var(--glow-success-shadow)',
        'glow-success-lg': '0 0 15px var(--glow-success-shadow-strong)',
        'float': 'var(--shadow-float)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [TWAnimate],
};
