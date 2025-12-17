# Railway Webhook Deployment Guide

## Environment Variables Required on Railway

You need to set these environment variables in your Railway project:

### 1. Xano Configuration
```bash
XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
XANO_CUSTOMER_API_KEY=Q4jDYUWL
XANO_PAYMENT_API_KEY=05i62DIx
XANO_QR_TRANSACTIONS_API_KEY=6MaKDJBx
```

### 2. Port Configuration (Optional)
```bash
PORT=3000
```
*Note: Railway automatically sets PORT, but you can override if needed*

## How to Set Environment Variables on Railway

### Method 1: Railway Dashboard
1. Go to your Railway project dashboard
2. Click on your webhook service
3. Go to **Variables** tab
4. Add each variable:
   - **Variable Name**: `VITE_XANO_BASE_URL`
   - **Value**: `https://xbde-ekcn-8kg2.n7e.xano.io`
   - Click **Add**
   - Repeat for all variables

### Method 2: Railway CLI
```bash
# Set all variables at once
railway variables set XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
railway variables set XANO_CUSTOMER_API_KEY=Q4jDYUWL
railway variables set XANO_PAYMENT_API_KEY=05i62DIx
railway variables set XANO_QR_TRANSACTIONS_API_KEY=6MaKDJBx
```

### Method 3: Environment File Upload
Create a `.env` file with:
```env
XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io
XANO_CUSTOMER_API_KEY=Q4jDYUWL
XANO_PAYMENT_API_KEY=05i62DIx
XANO_QR_TRANSACTIONS_API_KEY=6MaKDJBx
```
Then upload it in Railway dashboard under **Variables** → **Raw Editor**

## Deployment Steps

### 1. Prepare Files
Ensure these files are ready:
- `webhookcode-enhanced.js` (main webhook file)
- `package.json` (with required dependencies)

### 2. Deploy to Railway
```bash
# If using Railway CLI
railway login
railway link [your-project-id]
railway up
```

### 3. Set Environment Variables
Use one of the methods above to set all required variables.

### 4. Verify Deployment
After deployment, check:
- **Service URL**: Should be something like `https://your-service.railway.app`
- **Health Check**: Visit `https://your-service.railway.app/health`
- **Logs**: Check Railway logs for startup messages

## Expected Startup Logs
When the webhook starts successfully, you should see:
```
Enhanced Payment Callback Server running on port 3000
Callback endpoint: http://localhost:3000/api/payment/v1/response-callback
🆕 Features enabled:
   ✅ QR Transaction Status Updates
   ✅ Multi-Month Policy Handling
   ✅ Enhanced Audit Trail
   📧 Email notifications handled by separate payment notification service

🔧 Configuration:
   XANO_BASE_URL: https://xbde-ekcn-8kg2.n7e.xano.io
   QR_TRANSACTIONS_API: 6MaKDJBx
```

## Webhook Endpoint
Your webhook endpoint will be:
```
https://your-service.railway.app/api/payment/v1/response-callback
```

## Testing the Deployment
1. **Health Check**: `GET https://your-service.railway.app/health`
2. **Environment Variables**: Check logs to ensure all variables are loaded
3. **Payment Test**: Use a test payment to verify full functionality

## Troubleshooting

### Issue: Environment Variables Not Loading
**Solution**: 
- Check Railway dashboard Variables tab
- Ensure variable names match exactly (case-sensitive)
- Redeploy after setting variables

### Issue: "Missing API Key" Errors
**Solution**:
- Verify `VITE_XANO_QR_TRANSACTIONS_API` is set correctly
- Check logs for variable loading confirmation

### Issue: Database Connection Errors
**Solution**:
- Verify `VITE_XANO_BASE_URL` is correct
- Test Xano API endpoints manually
- Check Xano API key permissions

## Security Notes
- Environment variables are encrypted on Railway
- Never commit `.env` files to git
- Use Railway's secure variable storage
- Regularly rotate API keys if needed

## Monitoring
- Monitor Railway logs for webhook activity
- Set up Railway alerts for service health
- Monitor Xano API usage and limits