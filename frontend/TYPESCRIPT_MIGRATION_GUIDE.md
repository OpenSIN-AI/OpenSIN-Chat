// SPDX-License-Identifier: MIT
/**
 * TYPESCRIPT MIGRATION GUIDE
 * 
 * This file contains guidelines and patterns for migrating
 * JavaScript components and models to TypeScript.
 */

// ============================================================================
// 1. MODEL MIGRATION PATTERN
// ============================================================================

/*
## Converting a Model File from .js to .ts

### Before: models/example.js
```javascript
const Example = {
  fetchData: async function(id) {
    const res = await fetch(`/api/example/${id}`);
    return res.json();
  },
  create: async function(data) {
    // ...
  }
};
export default Example;
```

### After: models/example.ts
```typescript
import type { ApiResponse } from "@/types/api";

export interface ExampleData {
  id: number;
  name: string;
  // ...
}

const Example = {
  fetchData: async function(id: number): Promise<ExampleData> {
    const res = await fetch(`/api/example/${id}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
  
  create: async function(data: Partial<ExampleData>): Promise<ExampleData> {
    // ...
  }
};

export default Example;
```

## Key Changes:
1. Rename file from .js to .ts
2. Add interface for return types
3. Add parameter types to functions
4. Add return types to async functions
5. Proper error handling with typed errors
*/

// ============================================================================
// 2. COMPONENT MIGRATION PATTERN
// ============================================================================

/*
## Converting a Component from .jsx to .tsx

### Before: components/Example.jsx
```javascript
export default function Example({ title, onClose, items }) {
  return (
    <div>
      <h1>{title}</h1>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### After: components/Example.tsx
```typescript
import type { ReactNode } from "react";

export interface ExampleItem {
  id: number;
  name: string;
}

export interface ExampleProps {
  title: string;
  onClose: () => void;
  items: ExampleItem[];
}

export default function Example({ title, onClose, items }: ExampleProps) {
  return (
    <div>
      <h1>{title}</h1>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

## Key Changes:
1. Rename file from .jsx to .tsx
2. Create Props interface with all props
3. Type function parameters with interface
4. Use ReactNode for children if needed
5. Export interface for consumers
*/

// ============================================================================
// 3. HOOK MIGRATION PATTERN
// ============================================================================

/*
## Converting a Custom Hook

### Before: hooks/useExample.js
```javascript
export function useExample(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // fetch logic
  }, [id]);
  
  return { data, loading };
}
```

### After: hooks/useExample.ts
```typescript
import { useState, useEffect } from "react";
import type { ExampleData } from "@/types/example";

export interface UseExampleResult {
  data: ExampleData | null;
  loading: boolean;
  error: Error | null;
}

export function useExample(id: number): UseExampleResult {
  const [data, setData] = useState<ExampleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // fetch logic
  }, [id]);
  
  return { data, loading, error };
}
```

## Key Changes:
1. Create interface for hook return type
2. Type state variables with generics
3. Return typed object from hook
4. Export interface for consumers
*/

// ============================================================================
// 4. TYPE DEFINITIONS
// ============================================================================

/*
## Where to Add New Types

### Domain Types → src/types/
For data models and domain concepts:
- src/types/workspace.ts - Workspace, Thread, Message
- src/types/agent.ts - Agent, Skill, Workflow
- src/types/api.ts - ApiResponse, ApiError
- src/types/index.ts - Re-exports

### Component Props → Keep Near Component
For component-specific props:
- components/Button.tsx - ButtonProps defined at top
- components/Modal.tsx - ModalProps defined at top

### Utility Types → src/utils/
For type utilities and helpers:
- src/utils/types.ts - Common utility types
*/

// ============================================================================
// 5. COMMON PATTERNS
// ============================================================================

/*
## Typing Event Handlers
```typescript
import type { ChangeEvent, FormEvent, MouseEvent } from "react";

function handleChange(e: ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value);
}

function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
}

function handleClick(e: MouseEvent<HTMLButtonElement>) {
  // ...
}
```

## Typing React Refs
```typescript
import { useRef } from "react";

const inputRef = useRef<HTMLInputElement>(null);
const divRef = useRef<HTMLDivElement>(null);
```

## Typing Children Props
```typescript
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// or for function children
interface Props {
  children: (value: string) => ReactNode;
}
```

## Typing Generic Components
```typescript
import type { FC } from "react";

interface GenericProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

const Generic: FC<GenericProps<MyType>> = ({ items, renderItem }) => {
  return <>{items.map(renderItem)}</>;
};
```
*/

// ============================================================================
// 6. MIGRATION CHECKLIST
// ============================================================================

/*
## For Each Model/Component Migration:

- [ ] Rename .js/.jsx to .ts/.tsx
- [ ] Add interfaces for all types
- [ ] Type function parameters
- [ ] Type function return values
- [ ] Type state variables
- [ ] Type event handlers if applicable
- [ ] Export interfaces for reuse
- [ ] Add JSDoc comments for public APIs
- [ ] Test that component/model still works
- [ ] Update imports in dependent files
- [ ] Run eslint: npm run lint
- [ ] Commit with descriptive message
*/

// ============================================================================
// 7. MIGRATION PHASES REFERENCE
// ============================================================================

/*
## Overall Migration Strategy

Phase 1: ✅ COMPLETE
  - TypeScript setup & ESLint configuration
  - Type infrastructure (src/types/)
  - API utilities (src/utils/api.ts)
  - **TypeScript 7.0 compiler upgrade** (frontend ^7.0.2, tsconfig modernization: removed baseUrl/ignoreDeprecations, paths relative, "types": [], verified with real TS 7.0.2 via npx dry-runs — no config blockers)

Phase 2: ✅ IN PROGRESS
  - Core models → .ts (workspace, system, admin)
  - Custom hooks → .ts (useWorkspace, useThreads, etc)
  - Example components → .tsx (Button, Input, Modal, Card, Select)

Phase 3: PLANNED
  - Convert remaining models (agent, document, vector, etc)
  - Migrate frequently used components (10-15 per sprint)
  - Add strict mode rules progressively

Phase 4: PLANNED
  - Complete remaining ~150 components
  - Enable strict: true in tsconfig
  - Fix all type errors

Phase 5: PLANNED
  - Final polish and optimization
  - Documentation updates
  - Performance verification
*/

export {};
