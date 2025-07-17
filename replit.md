# Checkit - Vocabulary Learning Platform

## Overview

Checkit is a comprehensive vocabulary learning application designed for educators and learners. The platform allows educators to create reading passages, highlight vocabulary words, and generate check-up tests for students. Learners can take vocabulary tests, receive feedback, and review incorrect words through a flashcard system. The application also includes parent integration through email notifications.

## System Architecture

This application follows a full-stack TypeScript architecture with a clear separation between client and server:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI components with Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and build processes

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and express-session
- **Password Security**: Node.js crypto module with scrypt hashing

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (configured via DATABASE_URL)
- **Migrations**: Drizzle Kit for schema migrations
- **Connection**: Connection pooling with pg package

## Key Components

### Authentication System
- Role-based access control (educator/learner)
- Email verification system with token-based verification
- Password reset functionality with secure tokens
- Session-based authentication with secure cookie configuration

### Vocabulary Management
- Passage editor with word highlighting functionality
- AI-powered vocabulary analysis and definition generation
- Class management system for organizing students
- Vocabulary list creation and assignment

### Assessment System
- Interactive vocabulary check-up tests
- Real-time grading with educator feedback
- Fullscreen monitoring for test integrity
- Score tracking and analytics

### Learning Tools
- Flashcard system for reviewing incorrect words
- Progress tracking and analytics
- Parent email notifications with test results

### AI Integration
- Multiple AI provider support with priority system: Groq (primary), OpenAI, Hugging Face
- Groq API integration provides fast, reliable AI inference for passage generation
- Comprehensive fallback mechanisms when AI services are unavailable
- Automatic definition generation, passage analysis, and vocabulary word extraction

## Data Flow

1. **Educator Workflow**:
   - Creates vocabulary lists by highlighting words in passages
   - Assigns lists to classes with due dates
   - Reviews student submissions and provides grades
   - Monitors student progress through analytics

2. **Learner Workflow**:
   - Accesses assigned vocabulary lists
   - Takes vocabulary check-up tests in fullscreen mode
   - Reviews incorrect words through flashcards
   - Tracks personal progress and improvement

3. **Assessment Flow**:
   - Students submit definitions for vocabulary words
   - Educators grade submissions and mark incorrect answers
   - Incorrect words automatically added to student flashcards
   - Parents receive email summaries of performance

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via @neondatabase/serverless
- **Email**: Nodemailer for email functionality (Gmail and SMTP support)
- **AI Services**: Groq API (primary), OpenAI API, and Hugging Face Inference API
- **Authentication**: Passport.js with session management
- **Validation**: Zod for runtime type validation

### UI Dependencies
- **Component Library**: Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React icon library
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion for smooth interactions

### Development Tools
- **Build**: Vite with TypeScript support
- **Linting**: ESBuild for production builds
- **Development**: TSX for TypeScript execution

## Deployment Strategy

### Environment Configuration
- Database connection via DATABASE_URL environment variable
- AI service keys: GROQ_API_KEY (primary), OPENAI_API_KEY, and HUGGINGFACE_API_KEY
- Email configuration: EMAIL_USER, EMAIL_APP_PASSWORD for Gmail
- Session security: SESSION_SECRET for secure sessions

### Build Process
1. Frontend build via Vite (outputs to dist/public)
2. Backend build via ESBuild (outputs to dist)
3. Database migrations via Drizzle Kit
4. Production server runs from compiled JavaScript

### Production Considerations
- Connection pooling for database efficiency
- Error handling with fallback mechanisms for AI services
- Secure session configuration for production
- Email service configuration for parent notifications

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 06, 2025. Initial setup
- July 09, 2025. Updated learner dashboard to show all vocabulary lists with status badges and cleared all test data from database
- July 11, 2025. Integrated Groq API as primary AI provider for faster, more reliable passage generation and vocabulary analysis. Added comprehensive fallback system with OpenAI and Hugging Face as backup providers. Enhanced vocabulary check-up system to support optional definitions allowing students to skip unknown words. Fixed email verification and password reset URLs to use production domain instead of development domain. Added pending grade state to test preview page preventing students from retaking tests while awaiting teacher grading.
- July 13, 2025. Fixed sidebar positioning and hover interactions. Updated sidebar to use proper viewport height (top-0 bottom-0) and removed redundant positioning classes. Implemented dialog lock mechanism to keep sidebar extended when settings or notifications dialogs are open. Fixed settings button link to use proper wouter routing. Cleared all vocabulary lists from database per user request.
- July 14, 2025. Enhanced grading panel with AI-powered features: made correct meaning field required, added AI tools for brief word meaning generation using Groq API, and created AI auto-grading functionality for teachers. Fixed critical bug in vocabulary list status display where lists were incorrectly showing as "already done" for students who hadn't started them yet - corrected submission status checking logic in learner vocabulary lists API and test preview page conditional logic. Fixed AI grading API integration issues including route naming, response format handling, and null/empty definition validation to prevent 400 errors.
- July 15, 2025. Fixed critical security issue where students could access vocabulary lists assigned to classes they weren't enrolled in. Added proper class membership validation to both vocabulary list viewing and test starting endpoints. Updated class-specific vocabulary list queries to only return published lists. Students now only see vocabulary lists they have proper access to based on their class enrollments. Cleared all vocabulary lists from database per user request. Fixed vocabulary list deletion function to handle foreign key constraints properly by implementing cascading deletion in the correct order (fullscreen exits, flashcards, word definitions, submissions, vocabulary words, then vocabulary lists). Increased profile picture upload size limit from 5MB to 10MB with proper server-side Express.js body parser configuration and client-side file validation. Completely removed global vocabulary lists - all lists must now be assigned to specific classes. Fixed class enrollment validation data structure bug in individual vocabulary list access checks. Cleared all vocabulary lists from database again per user request.
- July 17, 2025. Fixed critical test submission issues that prevented students from completing vocabulary tests. Removed overly strict validation that required ALL words to have definitions - students can now complete tests even if they skip some words. Updated both frontend and backend logic to allow partial submissions while maintaining data integrity. Enhanced flashcard study mode to display only teacher-provided correct definitions instead of student definitions, creating a cleaner learning experience focused on correct answers. Completely redesigned authentication page with modern, professional UI featuring gradient backgrounds, animated elements, improved forms with icons, and enhanced hero section showcasing platform benefits with statistics and feature highlights.