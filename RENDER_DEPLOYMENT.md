# Render Deployment Guide (Halleyx - Simple Mode)

Follow these steps to deploy your project to Render's free tier. In this version, the database is built-in (in-memory), so you don't need to set up any external accounts like MongoDB Atlas.

## Deployment Steps

1.  **Push your code** to a GitHub repository.
2.  **Login to Render**: [dashboard.render.com](https://dashboard.render.com).
3.  **Create a New Web Service**:
    - Click **"New +"** -> **"Web Service"**.
    - Connect your GitHub repository.
4.  **Configure the Deployment**:
    - **Name**: `halleyx` (or your choice).
    - **Environment/Runtime**: `Node`.
    - **Region**: (Choose the one closest to you).
    - **Branch**: `main` (or yours).
    - **Root Directory**: `backend` (CRITICAL: Set this to `backend`).
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
5.  **Deploy**: Click **"Create Web Service"**.

## How it Works
- **Automatic Setup**: The server will detect that no external database is configured and will automatically start a built-in "In-Memory" database.
- **Pre-Seeded Data**: The database will be automatically filled with sample users and data so you can log in immediately.
- **Persistence**: 
    > [!IMPORTANT]
    > Since this is an in-memory database on Render's free tier, **all data will be reset** whenever the server restarts or "spins down" (after 15 minutes of inactivity). This is perfect for demonstrations or testing, but not for production use.

## Credentials
Once live, you can log in with:
- **Admin**: `admin@notorious.com` / `Admin@123`
- **Manager**: `manager@notorious.com` / `Manager@123`
- **Driver**: `mike@notorious.com` / `User@123`
