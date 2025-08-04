# Homepage Backend Functionality Prompt

## Context
You need to create Convex backend functions to power the **Civicly homepage**. The system has a complete data pipeline already implemented with bills, billVersions, and politicians tables. You need to create queries and actions that support the homepage UI requirements while following Convex best practices.

## Existing Infrastructure
Your backend already includes:
- ✅ **Complete Database Schema** in `convex/schema.ts`
- ✅ **Authentication System** with `@convex-dev/auth`
- ✅ **AI Agent & RAG Components** for semantic search
- ✅ **Data Pipeline** that processes bills from govinfo.gov
- ✅ **Vector Search** for semantic bill discovery

## Required Backend Functions

Create the following functions in `convex/homepage.ts`:

### 1. Main Data Queries

#### `getLatestBills` - Query
**Purpose:** Fetch the 10 most recently updated bills for the homepage content section.

**Requirements:**
- Return the 10 most recent bills ordered by `latestActionDate` (descending)
- Include all necessary bill metadata for display
- Join with politician data for sponsor information
- Handle cases where sponsor data might be missing
- Optimize for performance with proper indexing

**Return Structure:**
```typescript
interface HomepageBill {
  _id: Id<"bills">;
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  tagline?: string;
  status: string;
  latestActionDate?: string;
  impactAreas?: string[];
  sponsor?: {
    name: string;
    party: string;
    state: string;
    chamber: "House" | "Senate";
  } | null;
}
```

#### `searchBills` - Query
**Purpose:** Provide semantic search functionality for the smart searchbar.

**Arguments:**
- `query: string` - User's search query
- `limit?: number` - Number of results (default 10)

**Requirements:**
- Use the RAG component for semantic search across bill content
- Return bills with relevance scoring
- Include bill metadata and sponsor information
- Handle empty queries gracefully
- Support both exact matches and semantic similarity

#### `getBillById` - Query  
**Purpose:** Get detailed information for a specific bill (for future bill page linking).

**Arguments:**
- `billId: Id<"bills">`

**Requirements:**
- Return complete bill information
- Include sponsor and cosponsor details
- Include latest version information
- Handle non-existent bills gracefully

### 2. User Interaction Functions

#### `followBill` - Mutation (Future Feature)
**Purpose:** Allow users to follow bills for notifications.

**Arguments:**
- `billId: Id<"bills">`
- `userId: Id<"users">`

**Requirements:**
- Create notification subscription entry
- Check for existing subscriptions to prevent duplicates
- Require user authentication
- Return success/failure status

#### `unfollowBill` - Mutation (Future Feature)
**Purpose:** Remove bill from user's follow list.

**Arguments:**
- `billId: Id<"bills">`
- `userId: Id<"users">`

### 3. Analytics & Tracking

#### `logSearchQuery` - Mutation
**Purpose:** Track search queries for analytics and improvement.

**Arguments:**
- `query: string`
- `resultCount: number`
- `userId?: Id<"users">` (optional for anonymous users)

**Requirements:**
- Store search analytics for platform improvement
- Respect user privacy (no PII storage)
- Include timestamp and basic metrics

### 4. Content Management

#### `getTrendingBills` - Query (Future Feature)
**Purpose:** Get bills with high engagement or recent activity.

**Requirements:**
- Algorithm to determine "trending" based on:
  - Recent activity (committee actions, floor votes)
  - User engagement (follows, searches)
  - Media attention indicators
- Return similar structure to `getLatestBills`

#### `getBillsByImpactArea` - Query (Future Feature)
**Purpose:** Get bills categorized by impact areas for browsing.

**Arguments:**
- `impactArea: string`
- `limit?: number`

## Technical Implementation Requirements

### 1. Convex Function Patterns
Use the **new function syntax** with proper validators:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestBills = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("bills"),
    congress: v.number(),
    billType: v.string(),
    billNumber: v.string(),
    title: v.string(),
    tagline: v.optional(v.string()),
    status: v.string(),
    latestActionDate: v.optional(v.string()),
    impactAreas: v.optional(v.array(v.string())),
    sponsor: v.optional(v.object({
      name: v.string(),
      party: v.string(),
      state: v.string(),
      chamber: v.union(v.literal("House"), v.literal("Senate")),
    }))
  })),
  handler: async (ctx, args) => {
    // Implementation here
  },
});
```

### 2. Database Query Optimization
- **Use proper indexes** defined in the schema
- **Minimize database calls** by fetching related data efficiently  
- **Handle pagination** for future scaling
- **Implement caching strategies** where appropriate

### 3. Error Handling
- **Graceful failures** with meaningful error messages
- **Fallback data** when external services are unavailable
- **Validation** of all input parameters
- **Logging** for debugging and monitoring

### 4. Performance Considerations
- **Efficient queries** using indexes and proper filtering
- **Minimal data transfer** by selecting only required fields
- **Response time optimization** for real-time search
- **Memory efficiency** in data processing

### 5. RAG Integration
For search functionality, integrate with the existing RAG component:

```typescript
// Use the RAG component for semantic search
const results = await ctx.vectorSearch("rag:bills", "search", {
  query: args.query,
  limit: args.limit,
  filter: (q) => q.eq("namespace", "bills")
});
```

### 6. Authentication Integration
For user-specific functions:

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

// In mutation/query handler:
const userId = await getAuthUserId(ctx);
if (userId === null) {
  throw new Error("Authentication required");
}
```

## Data Flow Examples

### Homepage Load Sequence
1. **Initial Load:** `getLatestBills()` populates the content section
2. **User Types:** `searchBills(query)` provides real-time results  
3. **User Clicks:** Navigation to bill details page
4. **User Follows:** `followBill(billId, userId)` for notifications

### Search Flow
1. **User enters query** in searchbar
2. **Frontend calls** `searchBills(query)`
3. **Backend uses** RAG component for semantic search
4. **Results returned** with relevance scoring
5. **Analytics logged** with `logSearchQuery(query, count)`

## Testing Strategy

### Unit Tests
- Test each function with various input scenarios
- Validate return types match schema definitions
- Test error conditions and edge cases

### Integration Tests  
- Test RAG search integration
- Verify authentication flows
- Test database query performance

### Example Test Cases
```typescript
// Test latest bills query
const bills = await convex.query(api.homepage.getLatestBills, {});
expect(bills).toHaveLength(10);
expect(bills[0].latestActionDate).toBeDefined();

// Test search functionality
const searchResults = await convex.query(api.homepage.searchBills, {
  query: "healthcare"
});
expect(searchResults.length).toBeGreaterThan(0);
```

## Performance Targets
- **getLatestBills:** < 200ms response time
- **searchBills:** < 500ms for semantic search
- **Real-time search:** Support for 100+ concurrent users
- **Database efficiency:** Minimal full table scans

## Future Scalability
Design functions to handle:
- **Growing bill database** (10K+ bills)
- **Increased user base** (1K+ concurrent users)
- **Enhanced search features** (filters, facets)
- **Real-time notifications** and updates

## Implementation Priority
1. **Core Data Queries** (`getLatestBills`, `getBillById`)
2. **Search Functionality** (`searchBills`)
3. **Analytics** (`logSearchQuery`)
4. **User Features** (`followBill`, `unfollowBill`)
5. **Advanced Features** (`getTrendingBills`, `getBillsByImpactArea`)

The backend functions should provide a solid foundation for the homepage while being extensible for future features like user personalization, advanced search, and real-time notifications. 