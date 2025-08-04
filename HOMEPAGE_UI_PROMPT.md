# Homepage UI Generation Prompt

## Context
You are building the homepage UI for **Civicly** - a platform that makes complex legislative information accessible, credible, and empowering for the average citizen. The design philosophy emphasizes trustworthiness, clarity, and efficiency.

## Design System Implementation
The design system has been implemented in `globals.css` with the following specifications:

### Color Palette
- **Primary (Brand & Interactive):** Royal Blue `#4263EB` (--color-primary)
- **Accent (CTA & Pro Features):** Gold `#D69E2E` (--color-accent)
- **Background:** Alabaster `#FAFAFA` light / Very Dark Blue `#1A202C` dark (--color-background)
- **Text:** Charcoal `#2D3748` light / Light Gray `#A0AEC0` dark (--color-foreground)
- **Muted Text:** Gray `#718096` (--color-muted)
- **Status Colors:** Green `#38A169` (passed), Orange `#D69E2E` (committee), Red `#E53E3E` (failed)

### Typography
- **Headings:** Lora serif font (--font-heading) - Use `.font-heading` class
- **Body/UI Text:** Inter sans-serif (--font-body) - Use `.font-body` class  
- **Bill Text:** Source Code Pro monospace (--font-mono) - Use `.font-mono` class

### Pre-built CSS Classes
- **Buttons:** `.btn-primary`, `.btn-accent` with hover animations
- **Cards:** `.card` with hover effects and proper shadows
- **Status Badges:** `.status-passed`, `.status-committee`, `.status-failed`
- **Search:** `.search-input` with focus states
- **Utilities:** `.text-primary`, `.text-accent`, `.text-muted`, `.bg-primary`, `.bg-accent`

## Homepage Requirements

Create a **React component** for the homepage (`app/page.tsx`) that includes:

### 1. Header/Navigation
- **Logo Area:** "Civicly" wordmark using Lora heading font
- **Navigation:** Simple nav with "Search", "Bills", "Politicians" (for future)
- **Auth Section:** Sign In/Sign Up buttons (use Convex auth components)
- **Professional, trustworthy aesthetic**

### 2. Hero Section
- **Main Headline:** Large Lora heading emphasizing accessibility and empowerment
- **Subheadline:** Explanation of the platform's purpose
- **CTA Button:** Primary action using `.btn-accent` class

### 3. Smart Searchbar (Key Feature)
- **Large, prominent search input** using `.search-input` class
- **Typewriter Placeholder:** Cycling through examples like:
  - "Search for healthcare reform bills..."
  - "Find climate policy legislation..."
  - "Explore immigration reform..."
  - "Discover tax policy changes..."
- **Command K Integration:** Keyboard shortcut to focus (show "⌘K" hint)
- **Search Icon:** Magnifying glass icon
- **Real-time Results Dropdown (Future):** Structure for results display

### 4. Content Section - "Latest Bills"
Display the 10 most recent bills in an engaging card layout:

#### Bill Card Design
Each bill card should include:
- **Bill Identifier:** Congress + Bill Type + Number (e.g., "119th Congress - H.R. 1234")
- **Title:** Official bill title (truncated if long)
- **AI Tagline:** Engaging one-sentence summary (if available)
- **Status Badge:** Current status with appropriate color class
- **Sponsor Info:** Primary sponsor name, party, state
- **Impact Areas:** Tags for categorized impact areas (max 3 displayed)
- **Quick Actions:** 
  - ★ Follow button (subtle)
  - Share icon
  - "Read More" link
- **Card Hover Effects:** Use `.card` class animations

#### Layout
- **Desktop:** 2-column grid layout
- **Mobile:** Single column, stack cards
- **Responsive:** Proper breakpoints and spacing

### 5. Visual Design Elements
- **Clean, professional layout** with proper whitespace
- **Subtle animations** on hover states
- **High contrast** for accessibility
- **Loading states** for async content
- **Empty states** if no bills found

## Technical Implementation Details

### Component Structure
```jsx
export default function Homepage() {
  // Component logic here
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <SearchSection />
      <LatestBillsSection />
      <Footer />
    </main>
  );
}
```

### Data Integration
- Use `useQuery` from Convex to fetch latest bills
- Handle loading and error states gracefully
- Display placeholder content during loading

### Accessibility
- **Semantic HTML:** Proper heading hierarchy, landmarks
- **Keyboard Navigation:** Focus management, tab order
- **Screen Reader Support:** Aria labels, descriptions
- **Color Contrast:** High contrast ratios for all text

### Responsive Design
- **Mobile-first approach** with progressive enhancement
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly:** Proper tap targets on mobile

### Performance
- **Optimized Images:** Next.js Image component if needed
- **Lazy Loading:** For content below the fold
- **Progressive Enhancement:** Core content works without JavaScript

## Key UI Patterns

### 1. Trust-Building Elements
- **Professional typography** with Lora headings
- **Subtle, meaningful animations** (not flashy)
- **Clear information hierarchy**
- **Consistent spacing and alignment**

### 2. Accessibility First
- **High contrast colors** for readability
- **Clear visual feedback** for interactive elements
- **Logical reading order** and navigation flow

### 3. Empowering User Experience
- **Quick access to search** (prominent placement)
- **Clear bill information** with AI-generated taglines
- **Easy-to-scan** card layouts
- **Obvious next actions** on each bill

### 4. Mobile Optimization
- **Touch-friendly buttons** and interactive elements
- **Readable text sizes** on small screens
- **Simplified navigation** for mobile users

## Example Bill Data Structure
```typescript
interface Bill {
  _id: string;
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  tagline?: string;
  status: string;
  sponsorId?: string;
  impactAreas?: string[];
  latestActionDate?: string;
  // sponsor info will be joined/populated
}
```

## Implementation Notes
- **Use the existing design system classes** extensively
- **Import and use Convex hooks** for data fetching
- **Keep components modular** for reusability
- **Follow Next.js best practices** for performance
- **Test responsive behavior** across device sizes
- **Ensure dark mode compatibility** through CSS variables

The resulting homepage should feel trustworthy, professional, and empowering while making complex legislative information immediately accessible to users. 