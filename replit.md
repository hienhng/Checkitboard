# Lexible - Vocabulary Learning Platform

## Overview

Lexible is a comprehensive vocabulary learning application for educators and learners. It enables educators to create reading passages, highlight vocabulary words, and generate tests. Learners can take tests, receive feedback, and review words via flashcards. The platform also includes parent email notifications. The business vision is to provide an intuitive and powerful tool that enhances vocabulary acquisition and streamlines the teaching process, with market potential in educational technology.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application uses a full-stack TypeScript architecture with distinct client and server components.

### UI/UX Decisions
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack React Query for server state
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS with a comprehensive design system and CSS variables
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion for smooth interactions
- **Design Approach**: Modern, professional UI with comprehensive dark mode support, gradient backgrounds, animated elements, improved forms, and interactive components. Features CSS variables for theming, ThemeProvider for state management, and seamless light/dark mode switching. Complete modern redesign with gradient cards, improved typography, and consistent spacing across all components.
- **Typography**: Poppins for main interface text, Zen Dots for "lexible" brand name throughout the website.

### Technical Implementations
- **Frontend Build**: Vite
- **Backend Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js (local strategy, `express-session`, secure cookies), role-based access control, email verification, password reset.
- **Password Security**: Node.js crypto module with scrypt hashing.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Migrations**: Drizzle Kit.
- **Database Connection**: `pg` package with connection pooling.
- **Build Tool**: ESBuild for backend production builds.
- **Development Tool**: TSX for TypeScript execution.

### Feature Specifications
- **Authentication**: Role-based access (educator/learner), email verification, password reset, session-based authentication.
- **Vocabulary Management**: Passage editor with word highlighting, AI-powered vocabulary analysis, class management, vocabulary list creation and assignment.
- **Assessment System**: Interactive check-up tests with teacher-configured questions (multiple-choice and input types), real-time grading, fullscreen monitoring for test integrity, score tracking, resumable sessions with answer persistence, debounced auto-save (500ms for input questions), and automatic scoring for both question types.
- **Assignment Properties**: Individual assignment settings including grade visibility (immediate/after due date/manual), retake policies (allow/max attempts), time limits, question shuffling, and correct answer display. Settings moved from class-wide to assignment-specific configuration.
- **Learning Tools**: Flashcard system for incorrect words, progress tracking, parent email notifications, intelligent sticky note customization (emojis, colors, persistent positioning), and AI-generated definitions for notes.
- **AI Integration**: Support for multiple AI providers (Groq primary, OpenAI, Hugging Face) for definition generation, passage analysis, vocabulary extraction, contextual suggestions, and auto-grading. Comprehensive fallback mechanisms are implemented.
- **Data Flow**: Supports distinct educator and learner workflows, including vocabulary list creation, assignment, student assessment, and progress tracking. Automated grading for skipped words is included.

### System Design Choices
- **Full-stack TypeScript**: Ensures type safety across the entire application.
- **Microservices-oriented thinking**: Clear separation of client and server for scalability and maintainability.
- **Modular Design**: Key components are broken down into logical units (Authentication, Vocabulary Management, Assessment, Learning Tools, AI Integration).
- **AI Priority System**: Uses Groq as the primary AI provider for speed, with fallbacks to ensure robustness.
- **Database Schema**: Includes `isCustom` field for user-created notes and `positionX`/`positionY` for persistent sticky note placement. Assignment-specific settings stored in vocabulary_lists table with fields for grade visibility, retake policies, time limits, and display preferences.
- **Assignment Architecture**: Individual assignment properties replace class-wide defaults, allowing granular control over each vocabulary list's behavior and assessment rules.
- **Security**: Robust session configuration and class membership validation to prevent unauthorized access.

## External Dependencies

- **Database**: PostgreSQL (via `@neondatabase/serverless`)
- **Email**: Nodemailer (supports Gmail and SMTP)
- **AI Services**: Groq API, OpenAI API, Hugging Face Inference API
- **Authentication**: Passport.js
- **Validation**: Zod
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion