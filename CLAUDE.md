# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production application  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Database Operations
- `npm run db:push` - Push schema changes to database without migrations
- `npm run db:migrate` - Create and run new migration
- `npm run db:migrate:deploy` - Deploy migrations to production
- `npm run db:generate` - Generate Prisma client after schema changes
- `npm run db:studio` - Open Prisma Studio database GUI

### Testing
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI interface

### Data Ingestion
- `npm run ingest` - Run document ingestion script from Slite API

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with pgvector extension for vector similarity search
- **ORM**: Prisma with vector support 
- **Auth**: NextAuth.js with Google OAuth and domain restrictions
- **AI**: OpenAI GPT-4 and text-embedding-3-small for RAG system
- **UI**: Tailwind CSS + shadcn/ui components

### Project Structure

#### Core Application (`app/`)
- `app/(app)/page.tsx` - Main chat interface with sidebar, message list, and streaming
- `app/api/chat/route.ts` - Streaming chat API with RAG integration
- `app/api/chats/` - Chat management endpoints (CRUD operations)
- `app/layout.tsx` - Root layout with theme provider

#### Library Code (`lib/`)
- `lib/rag.ts` - Retrieval Augmented Generation system
- `lib/embeddings.ts` - Vector embedding generation and search
- `lib/chunker.ts` - Text chunking and tokenization
- `lib/slite.ts` - Slite API integration for document ingestion
- `lib/auth.ts` - NextAuth configuration with domain restrictions
- `lib/db.ts` - Prisma database client
- `lib/rateLimit.ts` - Rate limiting implementation

#### Components (`components/`)
- UI components built with shadcn/ui
- `MessageList.tsx` - Chat message display with streaming support
- `Sidebar.tsx` - Chat history and navigation
- `ChatInput.tsx` - Message input with keyboard shortcuts

### Key Features

#### RAG (Retrieval Augmented Generation)
The system uses vector similarity search to find relevant document chunks before generating responses:
1. User messages are embedded using OpenAI's text-embedding-3-small
2. Similarity search performed against document chunks in PostgreSQL with pgvector
3. Retrieved context is provided to GPT-4 for response generation
4. Responses are streamed back to the client in real-time

#### Authentication & Security
- Google OAuth with domain restrictions (configured in `lib/auth.ts`)
- Rate limiting per user to prevent abuse
- Chat ownership verification on all operations
- Environment-based configuration for different deployment stages

#### Database Schema
- Users, chats, and messages with soft deletion support
- Documents and chunks for RAG system with vector embeddings
- Rate limiting tracking with time windows
- Proper indexing for performance (see `prisma/schema.prisma`)

## Development Notes

### Environment Setup
Copy `.env.example` to `.env` and configure:
- Database connection URL with pgvector support
- OpenAI API key for embeddings and chat
- NextAuth configuration for Google OAuth
- Slite API credentials for document ingestion

### Database Development
- Always run `npm run db:generate` after schema changes
- Use `npm run db:push` for development, `npm run db:migrate` for production
- Vector embeddings require PostgreSQL with pgvector extension

### Testing
- Tests use Vitest with Node.js environment
- Test files located in `tests/` directory
- Path aliasing configured for `@/` imports

### Type Safety
- Strict TypeScript configuration
- Prisma generates type-safe database client
- Path aliasing: `@/*` maps to project root