# Claude AI Assistant Instructions for iwishBag Project

## Project Overview
This is an e-commerce platform for international shopping from Amazon, Flipkart, eBAY , Alibaba and more to customers in India and Nepal to begin with and gradually to the world. We give custoemr quotation, then tehy approve reject, checkout and all that. 

user side pages and admin side pages are different, be careful while making changes in quotes orders pages and others as well because we need to know if i want changes in user side or admin side.

## Key Technologies
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form + Zod validation
- **Payment**: PayU integration
- **Routing**: React Router v6
- follow DRY principles to enture you reuse components when available rather than creating new ones

## Important Notes
- Always check RLS policies when modifying database queries
- Use React Query for all API calls
- Follow the existing file naming conventions
- Maintain TypeScript type safety throughout

## AI Assistant Guidelines
- **Ask First, Code Later**: Always clarify requirements before implementing
- **No Assumptions**: If something is unclear, ask specific questions
- **Brainstorm Solutions**: Present multiple approaches with pros/cons
- **Validate Understanding**: Confirm interpretation of requirements
- **Iterative Refinement**: Start with core functionality, then enhance based on feedback
- if error is shared by me, explain whats causing it and then tell me ways to fix it. ask me which solution i'd want

## Before Starting Any Task
1. **Clarify Requirements**
   - What is the exact goal?
   - Who are the users?
   - What are the constraints?
   - What's the expected behavior?

2. **Explore Options**
   - Present 2-3 different approaches
   - Discuss trade-offs
   - Recommend the best solution with reasoning

3. **Confirm Approach**
   - Get approval before extensive coding
   - Break down complex tasks into phases
   - Set clear milestones
