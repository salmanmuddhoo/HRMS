# Logo Setup Guide for Waqt

## Overview

The Waqt application has been configured to display your company logo in two locations:
1. **Login Page** - Displays at the top of the login form
2. **Payslip PDFs** - Appears in the header of generated payslips

## Adding Your Logo

### Frontend (Login Page)

1. **Prepare your logo file:**
   - Format: PNG (recommended for transparency) or JPG
   - Recommended size: 200x200 pixels or larger (square format works best)
   - File name: `logo.png` (or `logo.jpg`)

2. **Add to frontend:**
   ```bash
   # Place your logo file in the frontend public directory
   cp your-logo.png frontend/public/logo.png
   ```

3. **The logo will automatically display on the login page**
   - If the logo file doesn't exist, it will be hidden gracefully
   - The logo appears above the "Waqt" heading

### Backend (Payslip PDFs)

1. **Prepare your logo file:**
   - Format: PNG (recommended) or JPG
   - Recommended size: 200x200 pixels (will be resized to 80x80 in PDF)
   - File name: `logo.png` (or `logo.jpg`)

2. **Add to backend:**
   ```bash
   # Place your logo file in the backend public directory
   mkdir -p backend/public
   cp your-logo.png backend/public/logo.png
   ```

3. **The logo will automatically display on payslips**
   - Appears at the top center of the PDF
   - If the logo file doesn't exist, payslip generation continues without it

## File Locations

```
HRMS/
├── frontend/
│   └── public/
│       └── logo.png          # Login page logo
│
└── backend/
    └── public/
        └── logo.png          # Payslip PDF logo
```

## Logo Specifications

### Recommended Specifications

**Login Page:**
- Format: PNG with transparency
- Dimensions: 200x200px (minimum)
- File size: < 500KB
- Display size: 96px height (auto width)

**Payslip PDF:**
- Format: PNG or JPG
- Dimensions: 200x200px to 500x500px
- File size: < 1MB
- Display size: 80x80px in PDF

### Tips for Best Results

1. **Use PNG format** for logos with transparency
2. **Square logos work best** - they scale proportionally
3. **Keep file size small** for faster loading
4. **High resolution** - at least 200x200px for clarity
5. **Test in both locations** after adding

## Testing Your Logo

### Frontend (Login Page)

1. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

2. Navigate to the login page: `http://localhost:3000`
3. Your logo should appear above the "Waqt" heading

### Backend (Payslip PDF)

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Generate a test payslip through the application
3. Download the payslip and verify the logo appears at the top

## Troubleshooting

### Logo Not Showing on Login Page

- **Check file location:** Ensure `logo.png` is in `frontend/public/`
- **Check file name:** Must be exactly `logo.png` (case-sensitive)
- **Clear browser cache:** Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- **Check console:** Open browser DevTools for any errors

### Logo Not Showing on Payslip

- **Check file location:** Ensure `logo.png` is in `backend/public/`
- **Check file permissions:** Logo file must be readable
- **Check backend logs:** Look for "Could not add logo to PDF" message
- **Verify format:** PDFKit supports PNG and JPG formats

### Logo Appears Distorted

- **Use square dimensions:** Rectangular logos may appear stretched
- **Check aspect ratio:** Maintain original proportions
- **Try different size:** 200x200, 300x300, or 500x500 pixels

## Customization

### Change Logo Size on Login Page

Edit `frontend/src/pages/Login.tsx`:

```typescript
<img
  src="/logo.png"
  alt="Waqt Logo"
  className="h-24 w-auto mb-4"  // Change h-24 to h-32, h-40, etc.
  // ...
/>
```

### Change Logo Size on Payslip

Edit `backend/src/services/pdfService.ts`:

```typescript
const imageWidth = 80;   // Change these values
const imageHeight = 80;  // to adjust logo size
```

## Multiple Logos

If you need different logos for login and payslip:

1. Keep frontend logo as `frontend/public/logo.png`
2. Name backend logo differently, e.g., `backend/public/company-logo.png`
3. Update the path in `backend/src/services/pdfService.ts`:
   ```typescript
   const logoPath = path.join(process.cwd(), 'public', 'company-logo.png');
   ```

## Deployment Considerations

### When deploying to production:

**Vercel/Netlify (Frontend):**
- Logo in `frontend/public/` is automatically included in the build
- Accessible at `https://yourdomain.com/logo.png`

**Heroku/VPS (Backend):**
- Ensure `backend/public/` directory is included in deployment
- For Docker, add logo to the image or mount as volume

**Serverless (Backend):**
- Logo files may need to be included in deployment package
- Consider using environment variable for logo URL
- Alternative: Store in cloud storage (S3, Cloudinary) and reference by URL

## Support

If you encounter issues:
1. Verify file paths and names
2. Check file permissions
3. Review application logs
4. Ensure logo meets format requirements

For best results, use a professional logo in PNG format with transparent background!
