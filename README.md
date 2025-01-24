# I Am Kolkata - Setup Guide

This guide covers how to set up the I Am Kolkata project after exporting it from StackBlitz.

## Exporting from StackBlitz

1. Click the "Export to ZIP" button in the top navigation bar
2. Download and extract the ZIP file to your local machine

## Local Setup

### Prerequisites

Ensure you have the following installed:

- Node.js (v18 or later)
- npm (v9 or later)
- Git (optional, for version control)

To verify your installations:

```bash
node --version
npm --version
```

### Installation Steps

1. Navigate to the extracted project folder:

```bash
cd path/to/extracted/folder
```

2. Install dependencies:

```bash
npm install
```

### Environment Setup

1. Create a `.env` file in the project root:

```env
# OpenAI API Key - Get yours at https://platform.openai.com/account/api-keys
VITE_OPENAI_API_KEY=your_openai_api_key

# Supabase Configuration - Get these from your Supabase project settings
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### API Keys Setup

1. **OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/account/api-keys)
   - Sign up/Login
   - Create a new API key
   - Copy it to your `.env` file

2. **Supabase Setup**:
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Go to Project Settings > API
   - Copy Project URL to `VITE_SUPABASE_URL`
   - Copy anon/public key to `VITE_SUPABASE_ANON_KEY`

### Database Setup

1. In your Supabase project's SQL Editor, run these commands in order:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Run the contents of:
-- 1. supabase/migrations/20250124060438_crimson_villa.sql
-- 2. supabase/migrations/20250124060449_broad_truth.sql
```

### Running the Project

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:5173](http://localhost:5173) in your browser

### Troubleshooting

1. **Dependencies Issues**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Remove node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

2. **Environment Variables**:
   - Ensure all variables in `.env` start with `VITE_`
   - Restart the dev server after changing `.env`

3. **Supabase Connection**:
   - Check if your project is active
   - Verify API credentials
   - Ensure tables are created correctly

4. **OpenAI API**:
   - Verify API key is valid
   - Check if you have sufficient credits
   - Ensure DALL-E access is enabled

### Production Build

To create a production build:

```bash
npm run build
```

The build output will be in the `dist` folder.

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Create an issue in the GitHub repository
3. Contact the project maintainers

## License

This project is licensed under the MIT License.