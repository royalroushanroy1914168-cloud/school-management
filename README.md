# ABC Public School Management System

1. Import backend/database/schema.sql into MySQL.
2. Edit backend/.env with your MySQL password.
3. Open terminal in backend:
   npm install
   npm run dev
4. Open index.html.

Default Admin:
ID: admin
Password: Admin@123

Change the password before production use.

## GitHub-ready structure

The project is intentionally separated into:

- Frontend: root HTML/CSS/JS files
- Backend: `backend/`
- Backend routes: `backend/routes/`
- Database configuration: `backend/config/`
- SQL schema: `backend/database/schema.sql`

### Important

Do not upload `backend/.env`. Use `backend/.env.example` as the template and configure the real environment variables on your backend hosting provider.

The frontend currently uses the API URL configured in `js/auth.js`. After deploying the backend, replace the local `http://localhost:5000/api` URL with your deployed backend API URL.
