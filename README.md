# Pokémon API

A RESTful API built with **NestJS** and **MongoDB** for managing Pokémon data.

<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
  </a>
</p>

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/)
- NestJS CLI

### Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd pokedex
```

Install the dependencies:

```bash
bun install
```

Install the NestJS CLI globally:

```bash
bun add -g @nestjs/cli
```

### Database

The project uses MongoDB through Docker.

Start the database container:

```bash
docker compose up -d
```

Verify that the container is running:

```bash
docker ps
```

### Running the Application

Start the development server:

```bash
bun run start:dev
```

The API will be available at:

```text
http://localhost:3000
```

## 🛠️ Tech Stack

- **NestJS** — Backend framework
- **TypeScript** — Programming language
- **MongoDB** — NoSQL database
- **Mongoose** — MongoDB ODM
- **Docker** — Database containerization
- **Bun** — JavaScript runtime and package manager

## 📁 Project Structure

```text
src/
├── common/
├── config/
├── modules/
│   └── pokemon/
│       ├── dto/
│       ├── entities/
│       ├── pokemon.controller.ts
│       ├── pokemon.service.ts
│       └── pokemon.module.ts
├── app.module.ts
└── main.ts
```

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://root:password@localhost:27017/nestjs-pokemon?authSource=admin
```

> Never commit your `.env` file to the repository.

## 📌 Project Status

This project is currently under development.

Future improvements may include:

- Pokémon search and filtering
- Pagination
- Pokémon type filtering
- Statistics
- API validation
- Authentication
- Automated testing

## 📄 License

This project is for educational and portfolio purposes.