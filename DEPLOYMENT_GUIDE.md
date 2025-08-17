# 🚀 DRP Workshop Deployment Guide

## 🔒 **Security First - Environment Setup**

### **1. Create Environment Files (Local Only)**

Create `frontend/.env.local` with your Firebase config:
```bash
# NEVER commit this file to Git!
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### **2. Set Cloud Function Secrets**

```bash
# Set Stripe secrets (when ready)
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# Set app base URL
firebase functions:config:set app.base_url="https://yourdomain.com"
```

## 🌐 **Deployment Steps**

### **Step 1: Initialize Git Repository**
```bash
cd /Users/parkerjahn/Desktop/DRP
git init
git add .
git commit -m "Initial commit - DRP Workshop"
```

### **Step 2: Create GitHub Repository**
1. Go to GitHub.com
2. Create new repository: `drp-workshop`
3. **IMPORTANT**: Make it PRIVATE initially
4. Don't initialize with README (we already have one)

### **Step 3: Connect to GitHub**
```bash
git remote add origin https://github.com/YOUR_USERNAME/drp-workshop.git
git branch -M main
git push -u origin main
```

### **Step 4: Deploy to Firebase**
```bash
# Build the frontend
cd frontend
npm run build

# Deploy everything
cd ..
firebase deploy
```

### **Step 5: Get Your Domain**
1. Purchase domain (e.g., `drpworkshop.com`)
2. Configure DNS to point to Firebase Hosting
3. Update Firebase project settings with custom domain

## 🔐 **Security Checklist**

- [ ] `.env.local` file created (never committed)
- [ ] `.env.template` shows required variables
- [ ] All Firebase config uses environment variables
- [ ] Cloud Functions use `defineString()` for secrets
- [ ] Git repository is PRIVATE
- [ ] No hardcoded API keys in code
- [ ] Firestore security rules implemented

## 📱 **What You'll Get After Deployment**

1. **Live Website**: `https://your-project-id.web.app`
2. **Custom Domain**: `https://yourdomain.com` (after DNS setup)
3. **Secure Cloud Functions**: Running on Firebase
4. **Production Database**: Firestore with security rules
5. **CDN & Hosting**: Global edge network

## 🚨 **Important Security Notes**

- **NEVER** commit `.env.local` files
- **NEVER** share Firebase service account keys
- **ALWAYS** use environment variables for secrets
- **KEEP** repository private until ready to go public
- **MONITOR** Firebase console for usage and costs

## 🎯 **Next Steps After Deployment**

1. Test the live website
2. Verify invite system works
3. Test Stripe integration (when ready)
4. Set up monitoring and analytics
5. Configure custom domain
6. Go public when ready!

---

**Ready to deploy? Let's start with the Git setup!** 