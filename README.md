# Project Name

Milhut Store Admin

## Features

- User Authentication
- Dashboard Management
- Responsive UI
- API Integration
- Real-Time Data Updatess

## Tech Stack

- Angular 21
- TypeScript
- RxJS
- Angular Material / Bootstrap
- Node.js Backend
- MongoDB

## Prerequisites

Make sure you have installed:

- Node.js (v16+ recommended)
- npm (v8+ recommended)
- Angular CLI

```bash
npm install -g @angular/cli
```

## Installation

Clone the repository:

```bash
git clone https://github.com/Ketan-44/milhut-store-admin.git
```

Navigate to the project directory:

```bash
cd project-name
```

Install dependencies:

```bash
npm install
```

## Environment Setup

Create or update the environment files:

`src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## Development Server

Run the application:

```bash
ng serve
```

Open your browser and visit:

```text
http://localhost:4200
```

## Build

Generate a production build:

```bash
ng build --configuration production
```

Build artifacts will be stored in:

```text
dist/
```

## Running Unit Tests

```bash
ng test
```

## Running End-to-End Tests

```bash
ng e2e
```

## Code Style

- Follow Angular Style Guide
- Use ESLint for linting
- Follow SOLID principles
- Keep components and services modular

## Deployment

Example production build:

```bash
ng build --configuration production
```

## License

This project is licensed under the MIT License.

## Author

GitHub: https://github.com/keval-7600
