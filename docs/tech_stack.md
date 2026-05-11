### Technology Stack & Architecture Overview

This section provides a summary of the technology stack, architecture, and development environment for the Phoenix VC website.

#### **Overall Architecture**

The project is a modern, decoupled web application built within a monorepo structure managed by pnpm workspaces. It consists of three primary packages:

1.  **`@phoenixvc/web`**: A statically-generated frontend application responsible for all user-facing content and interactions.
2.  **`api`**: A serverless backend powered by Azure Functions, which handles specific business logic such as email processing.
3.  **`@phoenixvc/design-system`**: A dedicated package for the UI component library (inferred, to be confirmed).

#### **Frontend Stack**

*   **Primary Framework**: [React](https://react.dev/) `v18.2.0`
*   **Language**: [TypeScript](https://www.typescriptlang.org/) `v5.3.3`
*   **Build Tool**: [Vite](https://vitejs.dev/) `v5.1.3`
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) `v3.4.17` with PostCSS and a custom, multi-theme system.
*   **Component Libraries**:
    *   [Radix UI](https://www.radix-ui.com/): For accessible, unstyled UI primitives (e.g., Dropdown Menu, Slot).
    *   A custom component library is likely maintained in the `@phoenixvc/design-system` package.
*   **Routing**: [React Router](https://reactrouter.com/) `v7.2.0`
*   **Animation**: [Framer Motion](https://www.framer.com/motion/)
*   **Forms**: [React Hook Form](https://react-hook-form.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)

#### **Backend Stack**

*   **Platform**: [Azure Functions](https://azure.microsoft.com/en-us/products/functions)
*   **Runtime**: [Node.js](https://nodejs.org/) `v20.x`
*   **Language**: [TypeScript](https://www.typescriptlang.org/) `v4.0.0`
*   **Key Dependencies**:
    *   `@azure/functions`: The core Azure Functions SDK.
    *   `nodemailer`: For sending emails (e.g., contact form submissions).

#### **Development & Tooling**

*   **Package Manager**: [pnpm](https://pnpm.io/) (used in a monorepo context)
*   **Linting**: [ESLint](https://eslint.org/)
*   **Formatting**: [Prettier](https://prettier.io/)
*   **Git Hooks**: [Husky](https://typicode.github.io/husky/)
*   **Commit Message Linting**: [Commitlint](https://commitlint.js.org/)
*   **Documentation Generator**: [Poetry](https://python-poetry.org/) (used to run a Python-based documentation tool like MkDocs or Sphinx, inferred from the `docs` script).

#### **Deployment & Infrastructure**

*   **Frontend Hosting**: [Azure Static Web Apps](https://azure.microsoft.com/en-us/products/app-service/static) (inferred from the `README.md` and the decoupled architecture).
*   **Backend Hosting**: [Azure Functions](https://azure.microsoft.com/en-us/products/functions) (as noted above).
*   **Infrastructure-as-Code**: The `infra/` directory suggests the use of an IaC tool, likely [Azure Bicep](https://learn.microsoft.com/en-us/azure/bicep/) or ARM templates, to manage cloud resources.
