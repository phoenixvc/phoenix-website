import { lazy, Suspense, useEffect } from "react";
import React from "react";
import { Layout } from "@/features/layout";
import { Hero } from "@/features/hero";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useTheme } from "@/theme";
import { ErrorBoundary, NotFound } from "./features/error";
import { PageSkeleton } from "@/components/ui/Skeleton";

// Component to handle hash scroll restoration after navigation
const ScrollToHash = (): null => {
  const location = useLocation();

  useEffect(() => {
    // Small delay to ensure DOM is ready after route change
    const timeoutId = setTimeout(() => {
      if (location.hash) {
        const element = document.querySelector(location.hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else if (location.pathname === "/") {
        // Scroll to top when navigating to home without hash
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);

    return (): void => clearTimeout(timeoutId);
  }, [location]);

  return null;
};

// Lazy load route-based components for code splitting
const Blog = lazy(() =>
  import("./features/blog").then((m) => ({ default: m.Blog })),
);
const Portfolio = lazy(() =>
  import("./features/portfolio").then((m) => ({ default: m.Portfolio })),
);
const ProjectDetail = lazy(() =>
  import("./features/portfolio/ProjectDetail").then((m) => ({
    default: m.ProjectDetail,
  })),
);
const AboutPage = lazy(() =>
  import("./features/about-page").then((m) => ({ default: m.AboutPage })),
);
const ThemeDesigner = lazy(() =>
  import("./features/theme-designer").then((m) => ({
    default: m.ThemeDesigner,
  })),
);

// Lazy load homepage sections
const LazyInvestmentFocus = lazy(() =>
  import("./features/investment-focus").then((m) => ({
    default: m.InvestmentFocus,
  })),
);
const LazyAbout = lazy(() =>
  import("./features/about").then((m) => ({ default: m.About })),
);
// const LazyTeam = lazy(() => import("./features/team").then(m => ({ default: m.Team })));
const LazyContact = lazy(() =>
  import("./features/contact").then((m) => ({ default: m.Contact })),
);

// Loading fallback component using skeleton
const PageLoader = ({
  isDarkMode = false,
}: {
  isDarkMode?: boolean;
}): React.JSX.Element => <PageSkeleton isDarkMode={isDarkMode} />;

const App = (): React.JSX.Element => {
  const { themeMode } = useTheme(); // Get current theme mode
  const isDarkMode = themeMode === "dark";

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToHash />
        <Layout>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Hero
                    title="Shaping Tomorrow's Technology"
                    subtitle="Strategic investments and partnerships empowering innovation across the globe"
                    enableMouseTracking={true}
                  />
                  <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                    <LazyInvestmentFocus />
                    <LazyAbout />
                    <LazyContact />
                  </Suspense>
                </>
              }
            />

            <Route
              path="/blog"
              element={
                <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                  <Blog />
                </Suspense>
              }
            />

            <Route
              path="/portfolio"
              element={
                <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                  <Portfolio />
                </Suspense>
              }
            />

            <Route
              path="/portfolio/:projectId"
              element={
                <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                  <ProjectDetail />
                </Suspense>
              }
            />

            <Route
              path="/about"
              element={
                <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                  <AboutPage />
                </Suspense>
              }
            />

            <Route
              path="/theme-designer"
              element={
                <Suspense fallback={<PageLoader isDarkMode={isDarkMode} />}>
                  <ThemeDesigner isDarkMode={isDarkMode} />
                </Suspense>
              }
            />

            {/* 404 Not Found - must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
