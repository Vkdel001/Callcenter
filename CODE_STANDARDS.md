# NIC Call Center System - Code Standards

## Overview

This document defines coding conventions, patterns, and best practices for the NIC Call Center System to ensure code consistency and maintainability.

---

## General Principles

1. **Write code for humans first, computers second**
2. **Be consistent** - Follow existing patterns
3. **Keep it simple** - Avoid over-engineering
4. **Document the why, not the what**
5. **Test your code** - Ensure it works before committing

---

## JavaScript/React Style Guide

### Naming Conventions

**Variables and Functions**: camelCase
```javascript
const customerName = "John Doe";
const totalAmount = 5000.00;

function calculateInstallment(amount, count) {
  return amount / count;
}
```

**Components**: PascalCase
```javascript
const CustomerList = () => { /* ... */ };
const PaymentPlanModal = () => { /* ... */ };
```

**Constants**: UPPER_SNAKE_CASE
```javascript
const API_URL = import.meta.env.VITE_API_URL;
const MAX_INSTALLMENTS = 12;
const DEFAULT_PAGE_SIZE = 50;
```

**Private Functions**: Prefix with underscore
```javascript
function _validateEmail(email) {
  // Internal helper function
}
```

**Boolean Variables**: Prefix with is/has/should
```javascript
const isActive = true;
const hasPaymentPlan = false;
const shouldSendEmail = true;
```

### File Naming

**Components**: PascalCase.jsx
```
CustomerList.jsx
PaymentPlanModal.jsx
QRCodeGenerator.jsx
```

**Services**: camelCase.js
```
customerService.js
qrService.js
emailService.js
```

**Utils**: camelCase.js
```
dateHelpers.js
qrGenerator.js
textSanitizer.js
```

**Pages**: PascalCase.jsx
```
Dashboard.jsx
CustomerDetail.jsx
Login.jsx
```

---

## File Organization

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── [feature]/       # Feature-specific components
│   │   ├── ComponentName.jsx
│   │   └── ComponentName.module.css (if needed)
│   └── common/          # Shared components
│
├── pages/               # Page components (routes)
│   ├── auth/           # Authentication pages
│   ├── admin/          # Admin pages
│   ├── customers/      # Customer pages
│   └── Dashboard.jsx   # Main dashboard
│
├── services/            # API service layer
│   ├── authService.js
│   ├── customerService.js
│   └── [feature]Service.js
│
├── utils/               # Utility functions
│   ├── dateHelpers.js
│   ├── validators.js
│   └── formatters.js
│
├── contexts/            # React Context providers
│   └── AuthContext.jsx
│
├── hooks/               # Custom React hooks
│   └── useCustomHook.js
│
├── config/              # Configuration files
│   └── permissions.js
│
├── styles/              # Global styles
│   └── mobile.css
│
├── App.jsx              # Main app component
└── main.jsx             # Entry point
```

### Component File Structure

```javascript
// 1. Imports - External libraries first
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 2. Imports - Internal modules
import { customerService } from '../services/customerService';
import { formatDate } from '../utils/dateHelpers';

// 3. Imports - Components
import CustomerCard from './CustomerCard';
import LoadingSpinner from '../common/LoadingSpinner';

// 4. Constants
const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 30000;

// 5. Component
const CustomerList = ({ filters }) => {
  // 5a. State declarations
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 5b. Hooks
  const navigate = useNavigate();
  
  // 5c. Effects
  useEffect(() => {
    loadCustomers();
  }, [filters]);
  
  // 5d. Event handlers
  const handleCustomerClick = (customerId) => {
    navigate(`/customers/${customerId}`);
  };
  
  // 5e. Helper functions
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers(filters);
      setCustomers(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 5f. Render conditions
  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error}</div>;
  
  // 5g. Main render
  return (
    <div className="customer-list">
      {customers.map(customer => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onClick={() => handleCustomerClick(customer.id)}
        />
      ))}
    </div>
  );
};

// 6. PropTypes (if using)
CustomerList.propTypes = {
  filters: PropTypes.object
};

// 7. Default export
export default CustomerList;
```

---

## State Management Patterns

### When to Use useState

For component-local state:
```javascript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({});
const [loading, setLoading] = useState(false);
```

### When to Use useContext

For app-wide state (authentication, theme, etc.):
```javascript
// AuthContext.jsx
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// In components
const { user, token } = useContext(AuthContext);
```

### State Update Patterns

**Simple state**:
```javascript
const [count, setCount] = useState(0);
setCount(count + 1);
```

**Object state**:
```javascript
const [formData, setFormData] = useState({ name: '', email: '' });

// Update single field
setFormData({ ...formData, name: 'John' });

// Update multiple fields
setFormData(prev => ({
  ...prev,
  name: 'John',
  email: 'john@example.com'
}));
```

**Array state**:
```javascript
const [items, setItems] = useState([]);

// Add item
setItems([...items, newItem]);

// Remove item
setItems(items.filter(item => item.id !== idToRemove));

// Update item
setItems(items.map(item => 
  item.id === idToUpdate ? { ...item, ...updates } : item
));
```

---

## API Service Pattern

### Service Structure

```javascript
// src/services/customerService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Helper to get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const customerService = {
  /**
   * Get list of customers with filters
   * @param {Object} filters - Filter parameters
   * @param {number} filters.page - Page number
   * @param {number} filters.per_page - Items per page
   * @param {string} filters.search - Search term
   * @returns {Promise<Object>} Customer list with pagination
   */
  async getCustomers(filters = {}) {
    try {
      const response = await axios.get(`${API_URL}/customers`, {
        params: filters,
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },
  
  /**
   * Get customer by ID
   * @param {number} id - Customer ID
   * @returns {Promise<Object>} Customer details
   */
  async getCustomerById(id) {
    try {
      const response = await axios.get(`${API_URL}/customers/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData) {
    try {
      const response = await axios.post(`${API_URL}/customers`, customerData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },
  
  /**
   * Update customer
   * @param {number} id - Customer ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomer(id, updates) {
    try {
      const response = await axios.patch(`${API_URL}/customers/${id}`, updates, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  }
};
```

---

## Error Handling

### Try-Catch Pattern

```javascript
const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const data = await apiService.getData();
    setData(data);
  } catch (err) {
    console.error('Error loading data:', err);
    setError(err.message || 'Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

### Error Boundaries

```javascript
// src/components/common/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### User-Friendly Error Messages

```javascript
const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.response.data?.message || 'An error occurred.';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Cannot connect to server. Please check your internet connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred.';
  }
};
```

---

## Comment Standards

### When to Comment

**DO comment**:
- Complex business logic
- Non-obvious algorithms
- Workarounds for bugs
- API integrations
- Important decisions

**DON'T comment**:
- Obvious code
- What the code does (code should be self-explanatory)
- Commented-out code (delete it)

### Comment Style

**Single-line comments**:
```javascript
// Calculate installment amount
const installmentAmount = totalAmount / installmentCount;
```

**Multi-line comments**:
```javascript
/**
 * Generate QR code for payment
 * 
 * This function calls the ZwennPay API to generate a QR code.
 * The QR code expires after 24 hours.
 * 
 * @param {number} amount - Payment amount in MUR
 * @param {string} reference - Payment reference
 * @returns {Promise<string>} QR code URL
 */
async function generateQRCode(amount, reference) {
  // Implementation
}
```

**TODO comments**:
```javascript
// TODO: Add validation for email format
// FIXME: This breaks when amount is 0
// HACK: Temporary workaround for API bug
```

---

## Git Workflow

### Branch Naming

```
feature/add-qr-generation
bugfix/fix-login-error
hotfix/critical-payment-bug
refactor/improve-customer-service
docs/update-api-documentation
```

### Commit Message Format

```
type(scope): description

Examples:
feat(qr): add QR code generation feature
fix(auth): resolve login token expiration issue
docs(api): update API documentation
refactor(customer): improve customer service code
style(ui): fix button alignment
test(payment): add payment plan tests
chore(deps): update dependencies
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Commit Best Practices

1. **Commit often** - Small, focused commits
2. **Write clear messages** - Explain what and why
3. **Test before committing** - Ensure code works
4. **Don't commit secrets** - Use .env files
5. **Review your changes** - Use `git diff` before committing

---

## Documentation Standards

### Function Documentation (JSDoc)

```javascript
/**
 * Calculate installment amounts for a payment plan
 * 
 * @param {number} totalAmount - Total amount to be paid
 * @param {number} installmentCount - Number of installments
 * @param {Date} startDate - Start date of payment plan
 * @param {string} frequency - Payment frequency ('weekly' or 'monthly')
 * @returns {Array<Object>} Array of installment objects
 * @throws {Error} If totalAmount is not positive
 * 
 * @example
 * const installments = calculateInstallments(5000, 5, new Date(), 'monthly');
 * // Returns: [
 * //   { number: 1, amount: 1000, dueDate: '2024-02-01' },
 * //   { number: 2, amount: 1000, dueDate: '2024-03-01' },
 * //   ...
 * // ]
 */
function calculateInstallments(totalAmount, installmentCount, startDate, frequency) {
  if (totalAmount <= 0) {
    throw new Error('Total amount must be positive');
  }
  
  // Implementation
}
```

### Component Documentation

```javascript
/**
 * CustomerCard Component
 * 
 * Displays customer information in a card format.
 * Clicking the card navigates to customer detail page.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.customer - Customer object
 * @param {number} props.customer.id - Customer ID
 * @param {string} props.customer.name - Customer name
 * @param {string} props.customer.policy_number - Policy number
 * @param {number} props.customer.amount_due - Amount due
 * @param {Function} props.onClick - Click handler
 * 
 * @example
 * <CustomerCard
 *   customer={customerData}
 *   onClick={() => navigate(`/customers/${customerData.id}`)}
 * />
 */
const CustomerCard = ({ customer, onClick }) => {
  // Implementation
};
```

### README for Features

Each major feature should have a README:

```markdown
# QR Code Generation Feature

## Overview
This feature allows agents to generate QR codes for customer payments.

## Components
- `QRCodeGenerator.jsx` - Main QR generation component
- `QRCodeModal.jsx` - Modal for displaying QR code
- `QRCodeHistory.jsx` - QR transaction history

## Services
- `qrService.js` - API calls for QR generation
- `qrGenerator.js` - QR code utility functions

## Usage
```javascript
import { QRCodeGenerator } from './components/QRCodeGenerator';

<QRCodeGenerator
  customerId={123}
  amount={1000}
  onSuccess={(qrCode) => console.log(qrCode)}
/>
```

## API Endpoints
- `POST /qr-codes/generate` - Generate QR code
- `GET /qr-transactions` - Get QR transaction history

## Business Rules
- QR codes expire after 24 hours
- Amount must be between 10 and 100,000 MUR
- One active QR per installment
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] Code follows style guide
- [ ] All tests pass
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code
- [ ] No hardcoded values (use constants or env variables)
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Edge cases considered
- [ ] Documentation updated
- [ ] Commit messages clear

### Reviewer Checklist

- [ ] Code is readable and maintainable
- [ ] Logic is correct
- [ ] Error handling is appropriate
- [ ] Performance is acceptable
- [ ] Security considerations addressed
- [ ] Tests are adequate
- [ ] Documentation is clear
- [ ] No breaking changes (or properly documented)

---

## Performance Best Practices

### Avoid Unnecessary Re-renders

```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Lazy Loading

```javascript
// Lazy load components
const CustomerDetail = React.lazy(() => import('./pages/CustomerDetail'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <CustomerDetail />
</Suspense>
```

### Debounce Search Inputs

```javascript
import { debounce } from 'lodash';

const debouncedSearch = useCallback(
  debounce((searchTerm) => {
    performSearch(searchTerm);
  }, 300),
  []
);
```

---

## Security Best Practices

### Never Store Sensitive Data in Code

```javascript
// ❌ BAD
const API_KEY = 'sk_live_abc123';

// ✅ GOOD
const API_KEY = import.meta.env.VITE_API_KEY;
```

### Sanitize User Input

```javascript
import DOMPurify from 'dompurify';

const sanitizedInput = DOMPurify.sanitize(userInput);
```

### Validate on Both Client and Server

```javascript
// Client-side validation
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// But also validate on server (Xano)
```

### Use HTTPS Only

```javascript
// Ensure all API calls use HTTPS
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL.startsWith('https://')) {
  console.error('API URL must use HTTPS');
}
```

---

## Testing Standards

### Unit Test Example

```javascript
// customerService.test.js
import { customerService } from './customerService';

describe('customerService', () => {
  describe('getCustomers', () => {
    it('should fetch customers with filters', async () => {
      const filters = { page: 1, per_page: 50 };
      const customers = await customerService.getCustomers(filters);
      
      expect(customers).toBeDefined();
      expect(customers.items).toBeInstanceOf(Array);
    });
    
    it('should handle errors gracefully', async () => {
      // Mock API error
      await expect(customerService.getCustomers({ invalid: true }))
        .rejects.toThrow();
    });
  });
});
```

### Component Test Example

```javascript
// CustomerCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import CustomerCard from './CustomerCard';

describe('CustomerCard', () => {
  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    policy_number: 'POL-001',
    amount_due: 5000
  };
  
  it('should render customer information', () => {
    render(<CustomerCard customer={mockCustomer} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('POL-001')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<CustomerCard customer={mockCustomer} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(1);
  });
});
```

---

## Accessibility Standards

### Semantic HTML

```javascript
// ✅ GOOD
<button onClick={handleClick}>Submit</button>
<nav>...</nav>
<main>...</main>
<header>...</header>

// ❌ BAD
<div onClick={handleClick}>Submit</div>
```

### ARIA Labels

```javascript
<button aria-label="Close modal" onClick={handleClose}>
  <X />
</button>

<input
  type="text"
  aria-label="Search customers"
  placeholder="Search..."
/>
```

### Keyboard Navigation

```javascript
const handleKeyPress = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
};

<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyPress={handleKeyPress}
>
  Click me
</div>
```

---

## Conclusion

Following these standards ensures:
- **Consistency** across the codebase
- **Maintainability** for future developers
- **Quality** of code and user experience
- **Collaboration** efficiency within the team

When in doubt, follow existing patterns in the codebase.

---

**Document Version**: 1.0  
**Last Updated**: February 4, 2026  
**Maintained By**: Development Team
