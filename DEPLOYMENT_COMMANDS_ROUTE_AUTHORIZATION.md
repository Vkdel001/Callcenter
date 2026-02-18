# Route Authorization Security Deployment Commands

## 🔒 **CRITICAL SECURITY DEPLOYMENT**

**Issue**: Route-Level Authorization Bypass Prevention
**Priority**: 🔴 **CRITICAL**
**Status**: Ready for deployment

---

## 📋 **Files Being Deployed**

### **New Security Files**
- `src/config/permissions.js` - Permission configuration system
- `src/components/auth/RoleProtectedRoute.jsx` - Route protection component
- `src/pages/auth/Unauthorized.jsx` - Access denied page
- `src/services/authorizationService.js` - Authorization utilities
- `test-route-authorization.js` - Security testing script
- `ROUTE_AUTHORIZATION_SECURITY_IMPLEMENTATION.md` - Documentation

### **Modified Files**
- `src/App.jsx` - Route protection applied to all routes
- `src/utils/secureLogger.js` - Enhanced security logging

---

## 🚀 **Deployment Steps**

### **Step 1: GitHub Deployment**
```bash
# Windows
deploy-route-authorization-security.bat

# This will:
# 1. Add all security files to Git
# 2. Commit with detailed security message
# 3. Push to GitHub main branch
```

### **Step 2: VPS Deployment**
```bash
# Linux/VPS
chmod +x deploy-route-authorization-vps.sh
./deploy-route-authorization-vps.sh

# This will:
# 1. Connect to VPS
# 2. Pull latest code from GitHub
# 3. Install/update dependencies
# 4. Build application with security features
# 5. Restart Nginx
# 6. Verify deployment
```

---

## 🔧 **Manual Deployment Commands**

### **GitHub Commands**
```bash
# Add security files
git add src/config/permissions.js
git add src/components/auth/RoleProtectedRoute.jsx
git add src/pages/auth/Unauthorized.jsx
git add src/services/authorizationService.js
git add src/App.jsx
git add src/utils/secureLogger.js
git add test-route-authorization.js
git add ROUTE_AUTHORIZATION_SECURITY_IMPLEMENTATION.md

# Commit with security message
git commit -m "🔒 SECURITY: Implement Route-Level Authorization System

CRITICAL SECURITY FIX: Route-Level Authorization Bypass Prevention

🛡️ Security Features Added:
- Role-based route protection with RoleProtectedRoute component
- Comprehensive permission configuration system
- LOB-specific access control validation
- Unauthorized access page with security logging
- Authorization service for customer data validation
- Enhanced security logging with audit trail

🚨 Attack Scenarios Prevented:
- Cross-LOB data access (Motor Admin → Life customers)
- Admin function bypass (Sales Agent → Admin panel)
- CSL unauthorized access (Call Center → CSL routes)
- URL manipulation to bypass UI restrictions

Priority: CRITICAL - Addresses major security vulnerability
Status: Ready for production deployment"

# Push to GitHub
git push origin main
```

### **VPS Commands**
```bash
# Connect to VPS
ssh root@your-vps-ip

# Navigate to application directory
cd /var/www/nic-callcenter

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart Nginx
systemctl reload nginx

# Verify deployment
curl -I http://localhost:80
```

---

## 🔍 **Post-Deployment Verification**

### **Security Testing Checklist**
- [ ] Login as different user roles (admin, motor_admin, sales_agent, etc.)
- [ ] Try accessing unauthorized routes via URL bar
- [ ] Verify unauthorized page displays correctly
- [ ] Check browser console for security logs
- [ ] Confirm audit trail is created

### **Test Scenarios**
```bash
# Test unauthorized access
# 1. Login as sales_agent
# 2. Try to access: /admin/agents
# 3. Should redirect to /unauthorized

# Test cross-LOB access
# 1. Login as motor_admin
# 2. Try to access Life customer data
# 3. Should be blocked and logged

# Test CSL access
# 1. Login as regular agent (not branch 13)
# 2. Try to access: /csl
# 3. Should be denied
```

### **Log Monitoring**
```bash
# Check Nginx logs
tail -f /var/log/nginx/access.log

# Check application logs
pm2 logs

# Check for security violations in browser console
# Look for: "🚨 Security Event: AUTHORIZATION_VIOLATION"
```

---

## 🚨 **Security Features Deployed**

### **Route Protection**
- ✅ All admin routes protected by role
- ✅ Customer routes protected by LOB access
- ✅ CSL routes protected by branch/role
- ✅ Unauthorized access logging

### **Access Control Matrix**
| User Role | Admin Access | Customer Access | CSL Access | LOB Access |
|-----------|-------------|----------------|------------|------------|
| admin | ✅ Full | ✅ All LOBs | ✅ Full | ALL |
| life_admin | ✅ Full | ✅ Life/CSL | ✅ Full | LIFE, CSL |
| motor_admin | ❌ None | ✅ Motor Only | ❌ None | MOTOR |
| sales_agent | ❌ None | ✅ Own Only | ❌ None | SALES_ONLY |
| agent | ❌ None | ✅ Limited | ✅ If Branch 13 | LIMITED |

### **Security Logging**
- ✅ Authorization violations logged
- ✅ Cross-LOB access attempts logged
- ✅ Unauthorized route access logged
- ✅ Security incident reference IDs

---

## ⚠️ **Important Notes**

### **Breaking Changes**
- Users will now be properly restricted to their authorized routes
- Some users may lose access to routes they previously could access
- All unauthorized access attempts will be logged

### **User Impact**
- **Positive**: Proper security and data isolation
- **Potential Issues**: Users may need role adjustments if they legitimately need broader access

### **Monitoring Required**
- Watch for legitimate users being denied access
- Monitor security logs for unusual patterns
- Be prepared to adjust role permissions if needed

---

## 🎯 **Success Criteria**

### **Security Metrics**
- [ ] Zero unauthorized route access possible
- [ ] All security violations logged
- [ ] Proper role-based access control
- [ ] Cross-LOB data access prevented
- [ ] Audit trail complete

### **Functional Metrics**
- [ ] Application loads correctly
- [ ] All authorized users can access their routes
- [ ] Unauthorized page displays properly
- [ ] No legitimate functionality broken

---

## 🔄 **Rollback Plan**

If issues occur, rollback commands:
```bash
# Rollback Git commit
git revert HEAD

# Push rollback
git push origin main

# Redeploy on VPS
cd /var/www/nic-callcenter
git pull origin main
npm run build
systemctl reload nginx
```

---

## 📞 **Support Information**

### **Security Incident Response**
- Monitor logs immediately after deployment
- Document any legitimate access denials
- Adjust role permissions as needed
- Report any security violations

### **Testing Priority**
1. **Critical**: Admin route access by role
2. **High**: Customer data access by LOB
3. **Medium**: CSL route access by branch
4. **Low**: UI/UX of unauthorized page

---

*This deployment implements critical security measures to prevent unauthorized access and ensure proper data isolation in the NIC Call Center system.*