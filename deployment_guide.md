# 🚀 Resume Architect - Deployment Guide

This guide details how to deploy the entire **Resume Architect** application (React frontend, Node/Express backend, and MySQL database) to the cloud for free, so your interviewers can test it live!

---

## 📌 Deployment Overview
We will deploy the application components to the following cloud platforms:
1.  **MySQL Database**: [Aiven.io](https://aiven.io/) (Free MySQL Cloud Database) or [Railway.app](https://railway.app/).
2.  **Node.js Backend**: [Render.com](https://render.com/) (Free Web Service hosting).
3.  **React Frontend**: [Vercel.com](https://vercel.com/) (Free Static Web App hosting).

---

## 💾 Step 1: Deploy the MySQL Database (Aiven.io)

Since Render's free tier does not include a MySQL database, we will use **Aiven** to host a free MySQL instance.

1.  Go to [aiven.io](https://aiven.io/) and sign up for a free account.
2.  Click **Create Service**.
3.  Select **MySQL** as the service type.
4.  Choose the **Free Plan** (available in AWS regions like `us-east-1` or `eu-west-1`).
5.  Set your Service Name (e.g., `mysql-resumearchitect`) and click **Create Service**.
6.  Once the service starts up (takes 2–3 minutes):
    *   Find the **Connection Information** box on your Aiven console dashboard.
    *   Copy the **Host**, **Port**, **User** (`avnadmin`), and **Password**.
    *   Copy the **Database Name** (default is usually `defaultdb`).

---

## ⚙️ Step 2: Deploy the Backend API (Render.com)

1.  Go to [render.com](https://render.com/) and log in using your GitHub account.
2.  Click **New +** and select **Web Service**.
3.  Choose **Build and deploy from a Git repository** and select your `ResumeArchitect` repo.
4.  Configure the service details:
    *   **Name**: `resume-architect-backend`
    *   **Root Directory**: `backend` *(Crucial: set this to the backend subdirectory)*
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  Scroll down to **Advanced** and click **Add Environment Variable**. Add the following:
    *   `PORT` = `10000` *(Default port for Render)*
    *   `DB_NAME` = `defaultdb` *(Your database name from Aiven)*
    *   `DB_USER` = `avnadmin` *(Your database user from Aiven)*
    *   `DB_PASS` = `[Your Aiven MySQL Password]`
    *   `DB_HOST` = `[Your Aiven MySQL Host URI]`
    *   `DB_PORT` = `[Your Aiven MySQL Port]` *(usually a 5-digit number like 12345)*
    *   `JWT_SECRET` = `[A strong random string for token signing]`
    *   `GEMINI_API_KEY` = `[Your Google Gemini API Key]`
6.  Click **Create Web Service**.
7.  Once deployed, Render will provide you with a live URL (e.g., `https://resume-architect-backend.onrender.com`). **Save this URL!**

---

## 💻 Step 3: Deploy the React Frontend (Vercel.com)

1.  Go to [vercel.com](https://vercel.com/) and sign up / log in with your GitHub account.
2.  Click **Add New...** and select **Project**.
3.  Import your `ResumeArchitect` repository.
4.  Configure the build settings:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `frontend` *(Crucial: set this to the frontend subdirectory)*
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  Expand the **Environment Variables** section and add:
    *   **Key**: `VITE_API_URL`
    *   **Value**: `https://resume-architect-backend.onrender.com` *(The live backend URL from Step 2, without a trailing slash)*
6.  Click **Deploy**.
7.  Vercel will build and deploy your React frontend, providing you with a live frontend URL (e.g., `https://resume-architect.vercel.app`).

---

## 🎯 Step 4: Database Initialization (Bootstrap)

Once both backend and database are online, we need to create the tables in your cloud database:

1.  Your backend is running Sequelize, which has `sequelize.sync()` configured in `server.js`.
2.  When Render starts up and successfully connects to the Aiven database, **Sequelize will automatically create all the required tables** (`Users`, `Resumes`, and `Interviews`) inside the database automatically!
3.  You can verify database connectivity by looking at the logs in the Render Dashboard. You should see:
    ```text
    MySQL Database connected...
    Server running on port 10000
    ```

You're done! Your website is now fully live and accessible from anywhere in the world.
