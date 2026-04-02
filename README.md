# GramSarthi - Gram Panchayat Management System

A comprehensive management system for Gram Panchayats, featuring tax collection, Namuna 8 & 9 generation, and reporting.

## Features
- Tax Collection and Receipt Management
- Automated Namuna 8 and Namuna 9 PDF generation
- Dashboard for analytics and reporting
- Master data management for properties and owners

## Setup Instructions

### 1. Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update `DB_USER`, `DB_PASSWORD`, and `DB_NAME` with your MySQL credentials.
4. Start the server:
   ```bash
   node index.js
   ```

## Development
This project was built using Vite, React, and Express.
