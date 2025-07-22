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
- July 17, 2025. Fixed critical test submission issues that prevented students from completing vocabulary tests. Removed overly strict validation that required ALL words to have definitions - students can now complete tests even if they skip some words. Updated both frontend and backend logic to allow partial submissions while maintaining data integrity. Enhanced flashcard study mode to display only teacher-provided correct definitions instead of student definitions, creating a cleaner learning experience focused on correct answers. Completely redesigned authentication page with modern, professional UI featuring gradient backgrounds, animated elements, improved forms with icons, and enhanced hero section showcasing platform benefits with statistics and feature highlights. Created comprehensive hero/landing page with modern design showcasing platform features, testimonials, statistics, and clear call-to-actions to serve as the main marketing page for new visitors.
- July 19, 2025. Successfully integrated multiple choice questions into student vocabulary tests. The system now dynamically displays multiple choice questions instead of text input fields when questions are available for a word. Added automatic answer submission with correctness checking, progress tracking for both text definitions and multiple choice answers, and maintains full backward compatibility with existing text-based vocabulary tests. Students now experience a more structured and user-friendly interface when teachers have created multiple choice questions for vocabulary words. Enhanced teacher grading panel to display both text definitions and multiple choice questions side-by-side, allowing educators to grade both question types with the same interface. Fixed runtime errors with proper null checking for array properties. Teachers can now mark multiple choice answers as correct/incorrect and add them to student flashcards just like text definitions. Improved visual clarity of student choices in grading panel with color-coded highlights, badges, and clear summary sections showing student selections versus correct answers.
- July 21, 2025. Implemented comprehensive sticky note customization features allowing students to personalize their vocabulary collection. Added emoji and color fields to database schema with 24 educational emoji options (📝, 📚, 💡, ⭐, etc.) and 8 vibrant color themes (yellow, pink, blue, green, purple, orange, red, indigo). Created interactive customization dialog with emoji picker, color selector, and live preview functionality. Enhanced sticky notes board with modern cork board design featuring draggable positioning, custom rendering based on user preferences, and improved visual hierarchy. Fixed critical search functionality bug in explore page preventing null reference errors when filtering vocabulary words by adding proper null checks to search terms. Implemented AI-generated definitions as an inherent feature for all sticky notes - every word automatically gets a clear, educational definition generated by Groq AI (with OpenAI and Hugging Face fallbacks). Added visual "AI-generated" indicator on sticky notes and fixed textarea input issues in customization dialog by preventing drag interference with text input controls.
- July 22, 2025. Implemented intelligent sticky note position persistence system. Added positionX and positionY fields to database schema to permanently store note positions across sessions. Enhanced API to handle position updates separately from other note modifications. Created smart positioning algorithm that automatically arranges notes in an organized grid layout when first opened, but remembers and restores custom user-dragged positions on subsequent visits. Fixed all drag-related issues with personal notes textarea and dialog interactions. Notes now maintain their exact positions when navigating away and returning, providing a truly persistent workspace experience. Enhanced explore page with intelligent vocabulary suggestions system that provides AI-generated word recommendations when students don't have enough wrong answers yet. Added comprehensive vocabulary suggestion API using Groq (primary) and OpenAI (fallback) to generate educational words with definitions, examples, categories, and difficulty levels. Created contextual vocabulary suggestions that generate synonyms, antonyms, and related words based on what students got wrong, providing more targeted learning opportunities. System intelligently distinguishes between general AI suggestions and contextually related words with appropriate visual badges ("🔗 Related Word" vs "✨ AI Suggested"). Fixed critical logic issue where students with many wrong words weren't receiving AI suggestions - now ALL students receive contextual AI suggestions regardless of their number of incorrect words, ensuring continuous vocabulary expansion for everyone. Prevented toast notifications during drag operations to create seamless interaction experience.