---
inclusion: always
---

# Senior Developer Approach - Systematic Problem Solving

## Core Principles

### 1. **Deep Analysis First**

- Read and understand ALL relevant code thoroughly
- Trace data flow from backend to frontend
- Identify root causes, not just symptoms
- Map out the complete system architecture

### 2. **Quality Over Speed**

- Take sufficient time for each operation
- Test each change thoroughly
- Ensure perfect implementation before moving on
- No rushing - precision is paramount

### 3. **Systematic Debugging Process**

1. **Problem Definition**: Clearly define what's broken
2. **Data Flow Analysis**: Trace how data moves through the system
3. **Root Cause Identification**: Find the exact source of the issue
4. **Solution Design**: Plan the fix before implementing
5. **Implementation**: Code the solution carefully
6. **Verification**: Test thoroughly to ensure it works

### 4. **Multi-Talented Developer Mindset**

- Consider frontend, backend, and data architecture
- Think about user experience and edge cases
- Ensure scalability and maintainability
- Write clean, well-documented code

### 5. **Thorough Code Review**

- Review every line of changed code
- Ensure consistency with existing patterns
- Check for potential side effects
- Validate against requirements

## Current Problem: "All Versions" Data Display

### Problem Statement

When selecting "All Versions" in the submissions table, data is not displaying correctly for submissions from different form versions.

### Analysis Required

1. How is field mapping working across versions?
2. How is the table rendering data for different field IDs?
3. What happens when a field exists in one version but not another?
4. How should the combined view handle field conflicts?

### Solution Approach

1. Thoroughly analyze current data structures
2. Understand the field mapping logic
3. Design a robust solution for cross-version data display
4. Implement with careful testing
5. Verify all edge cases work correctly

## Current Problem: Submission Preview UI Recreation

### Problem Statement

Need to completely recreate the submission preview component as a senior UI developer with:

1. Clean, professional, eye-catching design
2. Proper handling of all field types and data structures
3. Section-based organization (no sections in table, proper sections in preview)
4. Three main actions: Download (PDF, Text, JSON, XML), Archive, Delete
5. Archive functionality with filtering

### Analysis Required

1. Study form builder structure and field types
2. Understand how sections vs fields should be handled
3. Design proper data organization for preview
4. Create download functionality for multiple formats
5. Implement archive system with database changes

### UI/UX Approach

1. Clean, modern design following the provided mockup
2. Proper typography and spacing
3. Intuitive navigation and actions
4. Responsive design for all screen sizes
5. Accessibility considerations
6. Smooth interactions and transitions

### Senior Developer Mindset

- Take time to understand the complete form structure
- Design reusable, maintainable components
- Consider edge cases and error states
- Implement proper loading and feedback states
- Ensure consistent design patterns
- Write clean, documented code
