# 🎯 TeamTrack — Team Task Monitoring Web Application

TeamTrack is a modern, responsive, full-stack task management and monitoring board tailored for team leads (Admins) and team members. It uses React (Vite) + Tailwind CSS for a premium UI, and integrates Supabase (PostgreSQL, Authentication, Row Level Security) for a secure, serverless backend.

---

## 🚀 Walkthrough & Setup Guide

### STEP 1 — Prerequisites
Before starting, you must install the following core developer utilities on your computer:

1. **Node.js (LTS Version)**
   - **What is it?** The runtime engine that compiles and executes React.
   - **Download link:** [Node.js Official Downloads](https://nodejs.org/en/download)
   - **Installation:** Download the Windows Installer (`.msi`), open it, and accept all default options (keep clicking "Next").
   - **Verification:** Open your Command Prompt (cmd) or PowerShell, type these commands, and verify they return versions:
     ```bash
     node -v
     npm -v
     ```

2. **Git**
   - **What is it?** Version control tool to track modifications and push code to GitHub.
   - **Download link:** [Git for Windows Download](https://git-scm.com/download/win)
   - **Installation:** Run the installer. Choose default options, making sure "Git Bash" is enabled and Git is added to your environment variables (default).
   - **Verification:** Run this command in terminal:
     ```bash
     git --version
     ```

3. **VS Code (or any Code Editor)**
   - **What is it?** A developer-friendly environment to write and inspect code.
   - **Download link:** [VS Code Official Downloads](https://code.visualstudio.com/Download)
   - **Installation:** Run the installer and proceed with default setup configurations.

---

### STEP 2 — Supabase Setup (Manual, One-time)
Supabase acts as your PostgreSQL database, user registration system, and security barrier (via Row Level Security).

1. **Create an Account:**
   - Open [supabase.com](https://supabase.com) and click **Start your project** (sign up with GitHub or email).

2. **Create a New Project:**
   - Click **New Project** and select your Organization.
   - **Name:** `teamtrack`
   - **Database Password:** Click **Generate a password** (Write it down / save it somewhere safe; you will need it if you connect directly to PostgreSQL later).
   - **Region:** Pick a server location closest to you (e.g., `East US` or `West US`).
   - **Pricing Plan:** Select the **Free Tier**.
   - Click **Create new project**. Wait 1–2 minutes for the database to spin up.

3. **Find and Copy the Project Credentials:**
   - Once your project loads, click the **Settings (gear icon)** at the bottom-left sidebar.
   - Click **API** under the Project Settings submenu.
   - Locate and copy:
     - **Project URL:** Under "Project API keys" -> `URL`
     - **Anon Key:** Under "Project API keys" -> `anon / public`

4. **Initialize the SQL Schema & Security Policies:**
   - On the left sidebar of your Supabase dashboard, click the **SQL Editor** icon (resembles a `>_` terminal console).
   - Click **New query** (or "+ New Query").
   - Open your project files, copy the entire content of `supabase/migrations/001_init.sql`, and paste it into the editor text field.
   - Click **Run** (bottom right).
   - You should see a green success message: `Success. No rows returned`.

5. **Verify Database Structure:**
   - Click the **Table Editor** icon (resembles a spreadsheet grid) on the left sidebar.
   - Confirm you see these 5 tables listed in the schema dropdown: `users`, `teams`, `team_members`, `tasks`, and `task_updates`.

6. **Enable Signup Role Triggers:**
   - In Supabase, when a user registers, they are created in the `auth.users` system table.
   - The SQL script we ran created a trigger `on_auth_user_created` that automatically replicates these users into our `public.users` table so they have custom roles.
   - By default, the **very first user** to sign up on your TeamTrack app is automatically assigned the role of `admin`. All subsequent signups are assigned `member` roles.

---

### STEP 3 — Project Setup on Your Computer
Let's assemble the project code files locally.

1. **Create Project Folder:**
   - Create a folder named `teamtrack` (e.g. on your Desktop: `C:\Users\YourName\Desktop\teamtrack`).
   - Copy all the generated repository files (`package.json`, `index.html`, `src/`, etc.) into this folder.

2. **Configure Environment Variables:**
   - Locate the `.env.example` file in the folder root.
   - Rename this file to `.env` (or duplicate it as `.env`).
   - Open `.env` in VS Code and fill in the values you copied in **Step 2**:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

---

### STEP 4 — Running the App Locally (Testing)
Test the application on your computer.

1. **Install Dependencies:**
   - Open your terminal or VS Code Terminal inside the `teamtrack` project folder.
   - Run the command to install all packages:
     ```bash
     npm install
     ```

2. **Start the Development Server:**
   - Execute the start command:
     ```bash
     npm run dev
     ```
   - Vite will compile the app and output a local URL: `http://localhost:3000`.
   - Your browser should automatically open this page.

3. **Test the Admin Flow:**
   - Click **Sign Up** on the login screen.
   - Enter your name, email, and password, then click **Create Account**.
   - Because you are the first user registered in this database, you will be initialized as the **Lead Admin**.
   - You will be redirected to the **Global Dashboard** page (`/admin`).
   - Create a test team space: Click **Create Team Space**, input a name like `Marketing Team`, and click submit.

4. **Test the Member Flow:**
   - While still logged in as Admin, edit your created team space by clicking the **Settings (gear)** icon on the team card.
   - Input a second email address you have access to (e.g., `member@company.com`) and click **Add Member**. Keep this window open.
   - Open a new **Incognito / Private Browser Window**, load `http://localhost:3000`, and click **Sign Up**.
   - Register using that member email (`member@company.com`).
   - Upon registration, they will be logged in as a **Member**. Since they were invited to the `Marketing Team` by the Admin, they are automatically redirected directly into the `Marketing Team` space board (`/team/[uuid]`).
   - Try creating a task, dragging/updating its status, and writing daily notes.

---

### STEP 5 — GitHub Setup
Push your local code to a GitHub repository to enable Vercel automated deployments.

1. **Create a GitHub Account:**
   - Open [github.com](https://github.com) and sign up for a free account.

2. **Create a New Repository:**
   - Click **New** (or "+" -> **New repository**).
   - **Repository Name:** `teamtrack`
   - Choose **Private** (recommended since it hides configuration setups, though public is also fine since `.env` is ignored).
   - **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license" (we already have these).
   - Click **Create repository**. Copy the repository HTTPS link (e.g. `https://github.com/your-username/teamtrack.git`).

3. **Initialize Git & Push Local Code:**
   - In your project directory terminal, execute the following commands in order:
     ```bash
     git init
     git add .
     git commit -m "initial commit of TeamTrack codebase"
     git branch -M main
     git remote add origin https://github.com/your-username/teamtrack.git
     git push -u origin main
     ```
   - Refresh your GitHub repository page in the browser to verify the files are uploaded successfully.

---

### STEP 6 — Vercel Deployment (Manual, One-time)
Deploy your application to production. Every time you push a code change to GitHub, Vercel will automatically rebuild and deploy your live app.

1. **Sign Up at Vercel:**
   - Open [vercel.com](https://vercel.com) and click **Sign Up**. Select **Continue with GitHub** and authorize Vercel.

2. **Import Repository:**
   - In the Vercel dashboard, click **Add New** -> **Project**.
   - Find your `teamtrack` repository under the imported GitHub account and click **Import**.

3. **Set Environment Variables:**
   - Scroll down to the **Environment Variables** section.
   - Add the two variables matching your local `.env`:
     - **Key:** `VITE_SUPABASE_URL` | **Value:** *Paste your Supabase Project URL*
     - Click **Add**.
     - **Key:** `VITE_SUPABASE_ANON_KEY` | **Value:** *Paste your Supabase Anon Key*
     - Click **Add**.

4. **Deploy:**
   - Click the blue **Deploy** button.
   - Vercel will build the frontend files. Once completed (about 1 minute), you will see a congratulations screen with a screenshot of your app.
   - Click the preview image to open your live deployed application URL (e.g., `https://teamtrack-six.vercel.app`).

---

### STEP 7 — Adding Team Members
Adding members is a simple two-step process:

1. **Invite them to a Team (Admin Action):**
   - Log in as the Admin on the web application.
   - On the **Global Dashboard**, locate the team you want to assign them to.
   - Click the **Settings (gear icon)** on that team's card.
   - Under "Team Members", enter the employee's email address in the field and click **Add Member**.
   - Note: The member must register an account first. If you get a "No user found" warning, ask the employee to sign up first.

2. **Register the Member (Employee Action):**
   - Ask the employee to open your live application URL.
   - Click **Sign Up** on the login screen.
   - Register an account using the exact email address the Admin assigned them to.
   - On sign-up, the system logs them in, detects their team assignment, and displays their task board automatically.

---

### STEP 8 — Day-to-Day Usage Guide

#### 👑 For Team Leads (Admins)
- **Monitoring:** Log in to see a grid of all team spaces. View active team count, total member counts, and live counters for "To Do", "In Progress", "Blocked", and "Done" tasks.
- **Drill-Down:** Click any team space card to open its full board. Read member descriptions, review active tasks, and check the daily progress notes written by members.
- **Space Control:** Create new project workspaces or delete finished spaces. Edit memberships on the fly.

#### 👥 For Team Members
- **Focused View:** Log in and proceed directly to your assigned workspace. You have no exposure to other team spaces.
- **Task Management:** Create new cards by clicking **Add Task**. Outline titles and support notes.
- **Workflow Transitions:** Use the color-coded buttons directly on the task cards to advance card states (e.g., move a task from "To Do" to "In Progress", or flag it as "Blocked").
- **Writing Daily Logs:** Click any card on the board to open the detailed view. Type a progress report (e.g., "Finished drafting client emails, waiting on review") in the daily updates section, and click **Add Note**. This adds a persistent, dated log that the Admin can inspect immediately.

---

## 🛠️ Troubleshooting

### 1. App is blank or won't load after deploying to Vercel
- **Cause:** Missing or misspelled environment variables.
- **Fix:** In your Vercel project, go to **Settings** -> **Environment Variables**. Verify that both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined, capitalization is exact, and they do not contain accidental spaces or trailing quotes. Redeploy the app if you update them.

### 2. Login or Sign Up is failing
- **Cause 1:** Your local server isn't connected to the internet, or the Supabase connection parameters are incorrect. Check console errors in the browser inspector (Right click -> Inspect -> Console).
- **Cause 2:** Supabase Email Confirmation is turned on.
- **Fix:** By default, new Supabase projects require users to click an email link to confirm registration. If you want to disable this for easy testing:
  - Go to your Supabase Dashboard -> **Authentication** -> **Providers** -> **Email**.
  - Toggle off **Confirm email** and click **Save**. Now users can log in immediately upon signing up without verification.

### 3. Team Member is seeing other team's data
- **Cause:** Row Level Security (RLS) policies were not applied, or the tables were created without RLS enabled.
- **Fix:** Open the Supabase **SQL Editor**, re-paste the `001_init.sql` contents, and run it. RLS must be active on every table to guarantee that members are restricted to their team spaces.

### 4. How to redeploy after making code changes locally
- **Fix:** Save your edits in VS Code. Open your local terminal, commit the modifications, and push them to GitHub. Vercel detects the push and deploys the updates automatically:
  ```bash
  git add .
  git commit -m "custom UI layout improvements"
  git push origin main
  ```

---

## 📚 Reference Links
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment Guides](https://vercel.com/docs)
- [React Router DOM API Reference](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
