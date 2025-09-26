# Netlify Deployment Guide

## Prerequisites
- GitHub account
- Netlify account
- Your Xano API credentials
- Brevo email service credentials

## Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

## Step 2: Connect to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Build settings should auto-detect:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Step 3: Environment Variables
In Netlify dashboard → Site settings → Environment variables, add:

```
VITE_XANO_BASE_URL=https://xbde-ekcn-8kg2.n7e.xano.io/api:c517n3yZ
VITE_BREVO_API_KEY=your-brevo-api-key
VITE_BREVO_SENDER_EMAIL=noreply@nic.mu
VITE_BREVO_SENDER_NAME=NIC Life Insurance
VITE_ZWENNPAY_MERCHANT_ID=your-merchant-id
VITE_ZWENNPAY_API_KEY=your-zwennpay-key
```

## Step 4: Deploy
Click "Deploy site" - Netlify will build and deploy automatically.

## Step 5: Custom Domain (Optional)
- Add your custom domain in Site settings → Domain management
- Netlify provides free SSL certificates

## Troubleshooting
- Check build logs if deployment fails
- Ensure all environment variables are set
- Verify Xano API endpoints are accessible via HTTPS

## Auto-Deploy
Every push to your main branch will trigger automatic redeployment.