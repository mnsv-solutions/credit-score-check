# Credit Score Check Microservice

This is a microservice API designed to perform credit score checks using data from CIBIL (Credit Information Bureau India Limited) reports. It provides endpoints for retrieving and analyzing credit information for loan applications.

The API serves as a backend service for the main application located at [Team4Capstone](https://github.com/mnsv-solutions/Team4Capstone).

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma

## Features

- Credit score calculation and retrieval
- CIBIL report integration
- Application eligibility assessment
- Health check endpoint

## API Endpoints

- `GET /health` - Health check
- `POST /credit-check` - Perform credit score check (see schema for details)

## Building and Running Locally

### Prerequisites

- Node.js (version 18 or higher)
- npm
- PostgreSQL database

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mnsv-solutions/credit-score-check.git
   cd credit-score-check
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
     PORT=3001
     HOST=http://0.0.0.0
     ```
   - Adjust the `DATABASE_URL` to match your PostgreSQL setup

4. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations** (if applicable):
   ```bash
   npx prisma migrate dev
   ```

6. **Build the application**:
   ```bash
   npm run build
   ```

7. **Start the server**:
   ```bash
   npm start
   ```

The server will start on `http://0.0.0.0:3001` by default.

### Development Mode

For development with hot reloading:
```bash
npm run dev
```

### Linting and Formatting

- Check code style: `npm run lint`
- Format code: `npm run format`