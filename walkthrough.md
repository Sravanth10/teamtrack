# Walkthrough of Changes

All requested modifications have been implemented and successfully verified. Below is a summary of the changes and files modified.

## Changes Made

### 1. Database Migrations
- Created [006_remove_tcs_add_phone.sql](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/supabase/migrations/006_remove_tcs_add_phone.sql):
  - Drops the `tcs_joining_date` and `tcs_experience` columns from the `public.users` table.
  - Adds the `phone_number` text column to the `public.users` table.
  - Redefines the `public.handle_new_user()` trigger function to store `phone_number` and omit references to TCS fields.
- Created [007_add_team_category.sql](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/supabase/migrations/007_add_team_category.sql):
  - Alters the `public.teams` table to add a `category` text column, defaulting to `'general'` so that existing teams are safely backwards-compatible.
- Created [008_add_task_type.sql](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/supabase/migrations/008_add_task_type.sql):
  - Alters the `public.tasks` table to add a `task_type` text column, defaulting to `'exploration/other'`.
- Created [009_allow_member_edit_delete_own_notes.sql](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/supabase/migrations/009_allow_member_edit_delete_own_notes.sql):
  - Added RLS policies for `public.task_updates` permitting authenticated members to update and delete their own notes (`auth.uid() = user_id`).

### 2. Frontend Registration Page (`Login.jsx`)
- Modified [Login.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/Login.jsx):
  - Defined a config list for region codes (`+91` for India, `+1` for US/Canada, `+44` for UK, `+61` for Australia, `+65` for Singapore, and `+971` for UAE) containing country names, placeholders, and expected digits.
  - Replaced the TCS Joining Date field with a Phone Number input layout (a country code dropdown + local phone number text input that permits only digits).
  - Added red asterisk `*` symbols next to all registration fields: Full Name, Email Address, Employee ID, Work Location, Phone Number, Rapid Build Joining Date, Skills Set, Password, and Confirm Password.
  - Updated the Work Location placeholder from `"e.g. Hyderabad"` to `"eg. Hyderabad - Synergy park"`.
  - Added form validation checks to ensure:
    - The phone number matches the selected region's exact digit count (e.g. 10 digits for India/US, 8 digits for Singapore, 9 digits for Australia/UAE).
    - At least one skill has been added to the Skills Set tag area before transitioning to the authenticator step.
  - Packaged the formatted phone number (`${phoneRegion} ${phoneNo}`) into the Supabase registration metadata and removed TCS experience/date variables.
  - Removed the custom design for password and confirm password eye visibility toggles, along with their state variables `showPassword` and `showConfirmPassword`, in order to rely on native browser password visibility features.

### 3. CSS Style Refinement for Password Reveal (`index.css`)
- Modified [index.css](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/index.css):
  - Added `::-ms-reveal` CSS rules to invert the color of native password visibility icons in dark mode so they remain visible on dark background inputs, and reset the filter to none in light mode.

### 4. Admin Dashboard Profile View & Editing (`AdminDashboard.jsx`)
- Modified [AdminDashboard.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/AdminDashboard.jsx):
  - Replaced all visual displays of "TCS Experience" and "TCS Joining Date" with "Phone Number" in the user grid cards and details inspector panels.
  - Updated the Edit Profile modal to replace the "TCS Joining Date" input with the new region code dropdown + phone input layout.
  - Added phone validation inside the modal save handler, and updated the payload to save `phone_number` in the database.
  - Updated the work location placeholder inside the Edit User modal to `"eg. Hyderabad - Synergy park"`.
  - **Responsive Edit User Modal Grid**: Configured input rows as `grid-cols-1 sm:grid-cols-2` to prevent fields from wrapping/overlapping on smaller viewports.
  - **Grid Row Height Normalization**: Aligned heights for input controls (Select and Date) inside the Edit User Modal by setting their padding to `py-2.5 px-4 text-sm`.
  - **Edit User Modal Vertical Stack Fix**: Stacked the **Phone Number** field and **Rapid Build Joining Date** field vertically, assigning a fixed width (`w-24`) to the region code selector to resolve horizontal overlap inside the card row cells.
  - **Pending Approvals Action Buttons**: Changed custom padding layout classes on registration buttons from non-existent `px-4.5` to standardized Tailwind CSS `px-5` to fix button padding rendering.
  - **Multi-Workspace Search Profiles**: Fixed search query parsing which only selected the first element `team_members[0]` when querying a user's assigned teams. It now lists all teams dynamically as a comma-separated list of workspaces.

### 5. Pending Approval Profile View (`App.jsx`)
- Modified [App.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/App.jsx):
  - Replaced the "TCS Experience" display section under the submitted profile details with a "Phone Number" display when a user is waiting for admin approval.

### 6. Team Invitation & Dynamic Search Flow (`TeamModal.jsx`)
- Modified [TeamModal.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/TeamModal.jsx):
  - Added `searchQuery`, `searchResults`, and `isSearching` states.
  - Implemented a debounced user search `useEffect` query that matches names or emails against the `users` database table in real-time, filtering out members already in the team.
  - Rendered search results dynamically as user cards displaying Name, Employee ID, and Email.
  - Implemented `handleSelectUser(user)` which runs when a search result card is selected:
    - If the user was previously rejected, prompts the admin with a confirmation dialog: *"This user... was previously rejected by the admin. Do you want to approve this user and add them to the team?"*
    - If yes, updates their `approved_status` to `'approved'` and inserts them into `team_members`.
  - Updated the fallback manual input flow (`handleAddMember`) to run the same check if the admin submits by entering a full email address.
  - **Added a Team Category Input field**: Added a category text input in the team creation and editing form. It saves the value (trimmed and lowercased) to the `teams.category` column.

### 7. Team Overview Tab in Admin Dashboard (`AdminDashboard.jsx`)
- Modified [AdminDashboard.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/AdminDashboard.jsx):
  - Added a new **Team Overview** tab button in the dashboard.
  - Added a dynamic data aggregation helper (`fetchOverviewData`) which reads all approved candidates (`role = 'member'`) and maps their respective team memberships.
  - Implemented the classification logic:
    - **Non-engaged candidates**: Candidates who belong only to teams with a category of `'general'` (case-insensitive check) and no other teams.
    - **Engaged candidates**: Candidates who belong to at least one team whose category is not `'general'`.
    - Candidates who are not in any teams are omitted.
  - Rendered the listings as side-by-side or stacked grids showing beautiful cards with Name, Team Name(s), Team Category(ies), Candidate Email, and Candidate Employee ID.

### 8. Multi-Team Workspace Allocation & Navigation (`App.jsx` & `Navbar.jsx`)
- Modified [App.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/App.jsx):
  - Updated `RootRedirector` to query all memberships of the logged-in member rather than assuming a single workspace.
    - If exactly 1 workspace is found, routes directly to that team board (`/team/:teamId`).
    - If multiple workspaces are found, redirects them to the new `/select-team` selection view.
  - Created the `SelectTeamView` landing page rendering a list of cards for each assigned team. Clicking any card takes them directly to the chosen workspace board.
- Modified [Navbar.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/Navbar.jsx):
  - Fetches the user's list of assigned teams on startup.
  - Renders a **My Team Spaces** dropdown next to the company logo on the left. The dropdown displays team names and categories, allowing members to instantly toggle between their workspaces from any page.

### 9. Self-Service Profile Editing (`ProfileModal.jsx` & `Navbar.jsx`)
- Created [ProfileModal.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/ProfileModal.jsx):
  - Implemented user self-service profile page editing modal.
  - Allows editing **technical skills**, **phone number** (with region validation), and **work location** (initialized and validated correctly).
  - Keeps registration name, email, employee ID, and Rapid Build experience details read-only inside an info card.
  - Automatically updates database values in `public.users` and refreshes user context session instantly.
- Modified [Navbar.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/Navbar.jsx):
  - Added a **My Profile** button next to the Theme Toggle in the header menu.
  - Mounts and triggers the `ProfileModal` dialog.
- **Editable Employee ID & Rapid Joining Date**:
  - Modified [ProfileModal.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/ProfileModal.jsx) to make **Employee ID** and **Rapid Build Joining Date** editable fields. They have been moved from the read-only details card to full inputs inside the form. They are now sent in the update profile query payload.

### 10. Task Type Selection & Deadline Validation (`TeamSpace.jsx`, `TasksArchive.jsx`, `TaskCard.jsx`, `TaskDetailsModal.jsx`)
- Modified [TeamSpace.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/TeamSpace.jsx):
  - Added `newTaskType` state for task creation.
  - Included the `task_type` column in database select and insert statements.
  - Rendered **Task Type** radio selectors ("Assignment" and "Exploration/Other") inside the Create Task modal.
  - Dynamically marked the deadline field as required (`*` and HTML `required`) when **Assignment** is selected.
  - Enforced javascript check validating deadline when saving an Assignment task.
- Modified [TasksArchive.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/TasksArchive.jsx):
  - Updated select query to fetch `task_type` from the database.
- Modified [TaskCard.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/TaskCard.jsx):
  - Added a sub-header text block rendering the task type underneath the title.
- Modified [TaskDetailsModal.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/TaskDetailsModal.jsx):
  - Declared `taskType` state for task viewing and editing.
  - Included `task_type` in the database update statement.
  - Added task type radio button choices and dynamic deadline field checks to the editing layout.
  - Rendered a type badge in the read-only details view.
  - **Member Task Modification Block**: Defined a `canEdit` validation rule preventing members from editing task details or deleting tasks if the creator is an admin (`task.users?.role === 'admin'`).
  - **Editable & Deletable Update Notes**: Added update and delete options to progress updates. Authors of notes and system admins can edit the note's note text inline, or delete the progress update.
  - **Member Admin Task Access Control**:
    - Completely locked members out of status updates ( Kanban boards status moves are blocked for admin tasks, and `handleUpdateStatus` is rejected).
    - Blocked members from adding new progress notes on admin tasks (hides note input and shows a lock message instead).
    - Filtered the updates list so that members can **only view notes written by administrators** on admin-created tasks.
  - **Member-Specific Task Protections**:
    - Extended the task modification rules so standard members can **only edit, delete, or transition status** for tasks they personally created.
    - Blocked members from adding progress notes to tasks created by other members (shows read-only lock banner).

### 11. Milestone Details Header & Task Creator Name on Cards
- Modified [AdminDashboard.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/pages/AdminDashboard.jsx):
  - Updated the milestone query to fetch nested `teams(name)` and `users(name, email)`.
  - Added a Developer Name header row with `pr-10` padding at the top of each Milestone card in the admin view.
- Modified [TaskCard.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/TaskCard.jsx):
  - Updated the "Created on..." metadata section at the bottom of the card to render as: "Created by **[Creator Name]** on [Date]". This exposes the task creator's identity directly on the task board cards before opening them.

### 12. Global Update Release Popup & Usage Instructions Popup
- Created [UpdatePopup.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/UpdatePopup.jsx):
  - Implemented a clean, modern glassmorphic slide-in notification card in the bottom-right corner.
  - Highlights v3.1 release changes: Task Ownership Security, Update Notes Editing, Multi-Workspace Support, Task Types & Mandated Deadlines, Self-Service Profiles, Dynamic User Invites, and Engaged Overview.
- Created [InstructionsPopup.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/components/InstructionsPopup.jsx):
  - Implemented a premium guidelines popup that displays to users on startup.
  - Explains General Workspace Logging, Team-Specific Spaces, Task Types & Deadlines choice rules, and Mandatory Daily Progress Updates.
- Modified [App.jsx](file:///c:/Users/SRAVANTHMIRTIPATI/Desktop/teamtrack/src/App.jsx):
  - Deactivated `UpdatePopup` rendering globally.
  - Imported and mounted the `InstructionsPopup` to show guidelines to users once per session.
